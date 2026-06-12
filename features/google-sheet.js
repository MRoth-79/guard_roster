export async function fetchFromGoogleSheet() {
  const url = this.el.googleSheetUrl.value.trim();
  const statusEl = this.el.fetchStatus;
  if (!url || !url.startsWith("https://script.google.com/macros/s/")) {
    statusEl.textContent = "❌ כתובת Web App לא תקינה.";
    statusEl.style.display = "block";
    statusEl.style.color = "var(--artifact-danger)";
    return;
  }

  this.pushUndoSnapshot();
  try { localStorage.setItem(this.C.STORAGE_KEYS.SHEET_URL, url); } catch {}
  statusEl.textContent = "טוען נתונים... 🔄";
  statusEl.style.display = "block";
  statusEl.style.color = "var(--artifact-accent)";
  this.el.fetchFromSheetButton.disabled = true;
  this.el.quickFetchButton.disabled = true;

  try {
    const resp = await fetch(`${url}?action=getData&t=${Date.now()}`);
    if (!resp.ok) throw new Error(`שגיאת רשת (${resp.status})`);
    const text = await resp.text();
    if (!text.trim()) throw new Error("השרת החזיר טקסט ריק");
    this.ExcelGrid.loadFromText(text);
    const parsed = this.parseScheduleText(this.serializeMatrixToVerticalText());
    this.Store.setState({ excelMatrix: this.state.excelMatrix, parsedData: parsed, startDate: this.el.startDate.value });
    statusEl.textContent = "✅ הנתונים נטענו בהצלחה";
    statusEl.style.color = "var(--artifact-success)";
    this.showStatus("הנתונים נטענו לטבלת הקלט.", "success");
    this.persistFullState();
  } catch (err) {
    statusEl.textContent = `❌ שגיאה: ${err.message}`;
    statusEl.style.color = "var(--artifact-danger)";
    this.showStatus(`שגיאה בטעינה: ${err.message}`, "error");
  } finally {
    this.el.fetchFromSheetButton.disabled = false;
    this.el.quickFetchButton.disabled = false;
    setTimeout(() => { statusEl.style.display = "none"; }, 5000);
  }
}

