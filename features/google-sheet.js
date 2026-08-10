function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const input = String(text || "");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function extractSpreadsheetId(sheetUrl) {
  const match = String(sheetUrl || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : "";
}

function extractGid(sheetUrl) {
  const match = String(sheetUrl || "").match(/[?&#]gid=(\d+)/);
  return match ? match[1] : "0";
}

function isDocsSheetUrl(url) {
  return /docs\.google\.com\/spreadsheets\/d\//i.test(String(url || ""));
}

function uniqueNames(values) {
  const seen = new Set();
  const out = [];
  values.forEach((raw) => {
    const name = String(raw || "").replace(/\s+/g, " ").trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    out.push(name);
  });
  return out;
}

function collectShiftNames(row) {
  // Availability table lives in columns B..O (indexes 1..14).
  // Ignore later summary/stat columns on the right side of the sheet.
  const names = [];
  const maxCol = Math.min(row.length, 15);
  for (let i = 1; i < maxCol; i++) {
    const value = String(row[i] || "").trim();
    if (!value) continue;
    if (/^\d+$/.test(value)) break;
    names.push(value);
  }
  return uniqueNames(names);
}

function isUnavailableSectionHeader(text) {
  return /לא זמין|מי שיודע/i.test(String(text || ""));
}

function isEscortRow(text) {
  return /^ליווי\b/i.test(String(text || "").trim());
}

/**
 * Parse ONLY the weekly availability blocks from the sheet:
 *   יום <name> [optional date]
 *   ליווי ...          (ignored)
 *   02:00 - 06:00 ...  names across columns
 *   ...
 * Stop before the "לא זמין לשיבוץ" section.
 */
function sheetCsvToVerticalText(csvText, expectedDays, timeSlots) {
  const rows = parseCsv(csvText);
  const byDay = Object.fromEntries(expectedDays.map((day) => [day, Array(timeSlots.length).fill("")]));
  let currentDay = null;

  for (const row of rows) {
    const c0 = String(row[0] || "").trim();
    if (!c0) continue;
    if (isUnavailableSectionHeader(c0)) break;
    if (isEscortRow(c0)) continue;

    const dayMatch = expectedDays.find((day) => c0 === day || c0.startsWith(`${day} `) || c0.startsWith(day));
    // Require explicit "יום ..." headers so bare "שני/שלישי" in the
    // unavailability footer never become schedule days.
    if (dayMatch && /^יום\s/.test(c0)) {
      currentDay = dayMatch;
      continue;
    }

    if (!currentDay) continue;

    const slotIndex = timeSlots.findIndex((item) => c0.startsWith(item.split("(")[0].trim()));
    if (slotIndex < 0) continue;

    byDay[currentDay][slotIndex] = collectShiftNames(row).join(", ");
  }

  const missing = expectedDays.filter((day) => byDay[day].every((cell) => !cell));
  if (missing.length === expectedDays.length) {
    return "";
  }

  let out = "";
  expectedDays.forEach((day) => {
    out += `${day}\n`;
    timeSlots.forEach((slot, idx) => {
      const time = slot.split("(")[0].trim();
      out += `${time}\t${byDay[day][idx] || ""}\n`;
    });
    out += "\n";
  });
  return out.trim();
}

function explainFetchError(err) {
  const message = String(err?.message || err || "");
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return "לא ניתן למשוך מהגיליון (CORS / אין גישה ציבורית / פתיחה כקובץ מקומי). פתח דרך http://localhost:8765";
  }
  return message;
}

async function fetchViaGoogleSheetCsv(sheetUrl) {
  const id = extractSpreadsheetId(sheetUrl);
  if (!id) throw new Error("כתובת הגיליון לא תקינה");
  const gid = extractGid(sheetUrl);
  const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}&t=${Date.now()}`;
  const resp = await fetch(csvUrl);
  if (!resp.ok) throw new Error(`שגיאת גיליון (${resp.status})`);
  const csvText = await resp.text();
  if (!csvText.trim()) throw new Error("הגיליון החזיר קובץ ריק");
  return csvText;
}

function resolveSheetUrl(inputUrl, defaultSheetUrl) {
  if (isDocsSheetUrl(inputUrl)) return inputUrl.trim();
  return defaultSheetUrl;
}

export async function fetchFromGoogleSheet() {
  const inputUrl = this.el.googleSheetUrl.value.trim();
  const statusEl = this.el.fetchStatus;
  const sheetUrl = resolveSheetUrl(inputUrl, this.C.SHEET_URL);
  const setFetchStatus = (text, color) => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.style.display = "block";
    if (color) statusEl.style.color = color;
  };

  if (!extractSpreadsheetId(sheetUrl)) {
    setFetchStatus("❌ חסרה כתובת גיליון Google Sheets תקינה.", "var(--artifact-danger)");
    this.showStatus("חסרה כתובת גיליון תקינה.", "error");
    return;
  }

  this.pushUndoSnapshot();
  try { localStorage.setItem(this.C.STORAGE_KEYS.SHEET_URL, sheetUrl); } catch {}
  setFetchStatus("טוען זמינות מהגיליון... 🔄", "var(--artifact-accent)");
  if (this.el.fetchFromSheetButton) this.el.fetchFromSheetButton.disabled = true;
  if (this.el.quickFetchButton) this.el.quickFetchButton.disabled = true;

  try {
    const csvText = await fetchViaGoogleSheetCsv(sheetUrl);
    const text = sheetCsvToVerticalText(csvText, this.state.expectedDays, this.C.TIME_SLOTS);
    if (!text) throw new Error("לא נמצאו בלוקי יום/משמרת בגיליון (יום שני…יום ראשון)");

    this.ExcelGrid.loadFromText(text);
    const parsed = this.parseScheduleText(this.serializeMatrixToVerticalText());
    if (parsed.error) throw new Error(parsed.error);

    this.Store.setState({
      excelMatrix: this.state.excelMatrix,
      parsedData: parsed,
      startDate: this.el.startDate.value,
    });
    this.persistFullState();

    setFetchStatus("✅ נטען — מסדר אוטומטית...", "var(--artifact-success)");
    this.autoSchedule({ skipUndo: true });
    setFetchStatus("✅ נמשך מהגיליון וסודר", "var(--artifact-success)");
  } catch (err) {
    const nice = explainFetchError(err);
    setFetchStatus(`❌ שגיאה: ${nice}`, "var(--artifact-danger)");
    this.showStatus(`שגיאה בטעינה: ${nice}`, "error");
  } finally {
    if (this.el.fetchFromSheetButton) this.el.fetchFromSheetButton.disabled = false;
    if (this.el.quickFetchButton) this.el.quickFetchButton.disabled = false;
    if (statusEl) setTimeout(() => { statusEl.style.display = "none"; }, 8000);
  }
}
