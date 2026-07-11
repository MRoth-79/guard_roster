function toLocalISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

// חדש: מחשב את יום תחילת השבוע הקרוב קדימה (לעולם לא תאריך שעבר)
export function computeUpcomingWeekStartIso() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const targetDow = this.getWeekStartSetting() === "sun" ? 0 : 1; // 0=ראשון, 1=שני
  let daysToNext = (targetDow - dow + 7) % 7;
  if (daysToNext === 0) daysToNext = 7; // אם היום הוא יום תחילת השבוע — קפוץ לשבוע קדימה
  today.setDate(today.getDate() + daysToNext);
  return toLocalISODate(today); // ולא toISOString() — למניעת הזזת יום מ-UTC
}

export function initializeData() {
  this.el.startDate.value = this.computeUpcomingWeekStartIso();
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
    out.push(toLocalISODate(cur)); // ולא toISOString() — תיקון הזזת היום
  }
  return out;
}
