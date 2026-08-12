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

export async function fetchFromGoogleSheet() {
  const statusEl = this.el.fetchStatus;
  // Always pull from the locked secure sheet URL (ignore UI / localStorage overrides).
  const sheetUrl = this.C.SHEET_URL;
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
  if (this.el.googleSheetUrl) this.el.googleSheetUrl.value = sheetUrl;
  try { localStorage.setItem(this.C.STORAGE_KEYS.SHEET_URL, sheetUrl); } catch {}
  setFetchStatus("טוען זמינות מהגיליון המאובטח... 🔄", "var(--artifact-accent)");
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

// --- Cloud save/load (kept in this file so Pages never 404s a new module) ---

function askCloudPassword() {
  const entered = window.prompt("הכנס סיסמה לפעולת ענן:");
  if (entered === null) return null; // cancelled
  if (String(entered) !== String(this.C.CLOUD_PASSWORD)) {
    this.showStatus("סיסמה שגויה.", "error");
    return false;
  }
  return String(entered);
}

function makeCloudSnapshot() {
  // Capture schedule edits still in the rendered table before snapshot.
  try { this.syncRenderedTableBackToMatrix?.(); } catch {}
  const base = this.makeSnapshot();
  return {
    ...base,
    vacations: this.loadVacationsMap?.() || {},
    shiftRequirements: this.loadShiftRequirements?.() || {},
    shiftReqStorageKey: this.getShiftReqStorageKey?.() || "",
    cloudVersion: 1,
    savedAtClient: new Date().toISOString(),
  };
}

function applyCloudSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("תשובת ענן לא תקינה");
  }

  this.pushUndoSnapshot?.();
  this.applySnapshot(snapshot);

  if (snapshot.vacations && typeof snapshot.vacations === "object") {
    this.saveVacationsMap(snapshot.vacations);
  }
  if (snapshot.shiftRequirements && typeof snapshot.shiftRequirements === "object") {
    this.saveShiftRequirements(snapshot.shiftRequirements);
  }

  this.buildShiftReqPanel?.();
  this.buildVacationsPanel?.();
  this.persistFullState();
  this.handleAnalyze();
}

async function postToCloud(payload) {
  const url = this.C.DEFAULT_WEB_APP_URL;
  if (!url || !/script\.google\.com\/macros\/s\//i.test(url)) {
    throw new Error("חסר DEFAULT_WEB_APP_URL תקין — פרוס את apps-script/Code.gs והדבק את כתובת ה-/exec");
  }

  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
  } catch (err) {
    const msg = String(err?.message || err || "");
    if (/Failed to fetch|NetworkError|Load failed|CORS/i.test(msg)) {
      throw new Error(
        "אין גישה לשרת הענן (403/CORS). צריך לפרוס מחדש את apps-script/Code.gs כ-Web App עם Who has access = Anyone, ואז לעדכן את DEFAULT_WEB_APP_URL ב-core/constants.js"
      );
    }
    throw err;
  }

  const text = await resp.text();
  if (resp.status === 401 || resp.status === 403) {
    throw new Error(
      `שרת הענן דחה את הבקשה (${resp.status}). פרוס מחדש את Code.gs (Anyone) והחלף את כתובת ה-/exec ב-constants.js`
    );
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`תשובת שרת לא תקינה (${resp.status}). ודא שפריסת ה-Apps Script מעודכנת ל-Anyone.`);
  }
  if (!data?.ok) {
    throw new Error(data?.error || "שגיאת ענן");
  }
  return data;
}

export async function saveToCloud() {
  const password = this.askCloudPassword();
  if (password === null || password === false) return;

  const startDate = this.el.startDate?.value || "";
  if (!startDate) {
    this.showStatus("בחר תאריך תחילת שבוע לפני שמירה לענן.", "warning");
    return;
  }

  const snapshot = this.makeCloudSnapshot();
  if (!this.serializeMatrixToVerticalText?.()?.trim?.()) {
    this.showStatus("אין סידור לשמירה — סדר משמרות קודם.", "warning");
    return;
  }

  if (this.el.saveToCloudButton) this.el.saveToCloudButton.disabled = true;
  if (this.el.loadFromCloudButton) this.el.loadFromCloudButton.disabled = true;
  this.showStatus("שומר סידור לענן...", "success");

  try {
    const result = await this.postToCloud({
      action: "save",
      password,
      startDate,
      snapshot,
    });
    const when = result.savedAt ? ` (${result.savedAt})` : "";
    this.showStatus(`נשמר בענן לשבוע ${startDate}${when}`, "success");
  } catch (err) {
    this.showStatus(`שמירה לענן נכשלה: ${err?.message || err}`, "error");
  } finally {
    if (this.el.saveToCloudButton) this.el.saveToCloudButton.disabled = false;
    if (this.el.loadFromCloudButton) this.el.loadFromCloudButton.disabled = false;
  }
}

export async function loadFromCloud() {
  const password = this.askCloudPassword();
  if (password === null || password === false) return;

  const startDate = this.el.startDate?.value || "";
  if (!startDate) {
    this.showStatus("בחר תאריך תחילת שבוע לפני משיכה מהענן.", "warning");
    return;
  }

  if (this.el.saveToCloudButton) this.el.saveToCloudButton.disabled = true;
  if (this.el.loadFromCloudButton) this.el.loadFromCloudButton.disabled = true;
  this.showStatus("טוען סידור מהענן...", "success");

  try {
    const result = await this.postToCloud({
      action: "load",
      password,
      startDate,
    });
    this.applyCloudSnapshot(result.snapshot);
    const when = result.savedAt ? ` (נשמר: ${result.savedAt})` : "";
    this.showStatus(`נטען מהענן לשבוע ${startDate}${when}`, "success");
  } catch (err) {
    this.showStatus(`משיכה מהענן נכשלה: ${err?.message || err}`, "error");
  } finally {
    if (this.el.saveToCloudButton) this.el.saveToCloudButton.disabled = false;
    if (this.el.loadFromCloudButton) this.el.loadFromCloudButton.disabled = false;
  }
}

export {
  askCloudPassword,
  makeCloudSnapshot,
  applyCloudSnapshot,
  postToCloud,
};

