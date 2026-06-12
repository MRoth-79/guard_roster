export function getWeekStartSetting() {
  try {
    return localStorage.getItem(this.C.STORAGE_KEYS.WEEK_START) === "sun" ? "sun" : "mon";
  } catch {
    return "mon";
  }
}

export function computeExpectedDays(weekStart) {
  return weekStart === "sun"
    ? ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "יום שבת"]
    : ["יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "יום שבת", "יום ראשון"];
}

export function initializeData() {
  const today = new Date();
  const dow = today.getDay();
  const weekStart = this.getWeekStartSetting();
  const daysToNext = weekStart === "mon" ? ((8 - dow) % 7 || 7) : ((7 - dow) % 7 || 7);
  today.setDate(today.getDate() + daysToNext);
  this.el.startDate.value = today.toISOString().slice(0, 10);
  try {
    const savedUrl = localStorage.getItem(this.C.STORAGE_KEYS.SHEET_URL);
    this.el.googleSheetUrl.value = savedUrl || this.C.DEFAULT_WEB_APP_URL;
  } catch {
    this.el.googleSheetUrl.value = this.C.DEFAULT_WEB_APP_URL;
  }
}

export function getHebDayNameFromIso(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return this.C.HEB_DAYS[dt.getDay()] || "";
}

export function updateStartDateLabelBySetting() {
  const day = this.getHebDayNameFromIso(this.el.startDate.value);
  this.el.startDateLabel.textContent = day ? `תאריך תחילת שבוע (${day}):` : "תאריך תחילת שבוע:";
}

export function getDatesForWeek(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    out.push(`${String(cur.getDate()).padStart(2, "0")}/${String(cur.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function getIsoDatesForWeek(isoDate) {
  if (!isoDate) return [];
  const [y, m, d] = isoDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    out.push(cur.toISOString().slice(0, 10));
  }
  return out;
}

