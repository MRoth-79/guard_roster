/** Google Apps Script Web App (/exec) — guard_roster cloud save/load. */
export const DEFAULT_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwsqLetDtytZdYuPKEWK5Jb4u8YC82M1GTlwKWh4TZ2ubT2daKFOeRq_OhKH9YsLBaz6g/exec";

/** Shared password for cloud save/load (also enforced in apps-script/Code.gs). */
export const CLOUD_PASSWORD = "2244";

export const STORAGE_KEYS = {
  WEEK_START: "weekStart",
  SHEET_URL: "googleSheetUrl",
  SHIFT_REQ_SCOPE_WEEK: "shiftReqScopeWeek",
  LEAVE_SCOPE_WEEK: "leaveScopeWeek",
  FULL_STATE: "shift_scheduler_full_state_v5",
};

export const RULES = {
  MIN_REQUIRED: 4,
  MAX_ALLOWED: 5,
  MAX_NIGHT_2_6: 2,
  MIN_REST_HOURS: 8,
};

/** Start/end hour-of-day; 22:00-02:00 ends at 26 (= 02:00 next calendar day). */
export const SHIFT_HOUR_BOUNDS = Object.freeze([
  { start: 2, end: 6 },
  { start: 6, end: 10 },
  { start: 10, end: 14 },
  { start: 14, end: 18 },
  { start: 18, end: 22 },
  { start: 22, end: 26 },
]);

/** Locked secure source for availability pull — do not override via UI/localStorage. */
export const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1NXgjKC-0j4blUQawwzz4lMEhswA561GKxAoSJO5ie_s/edit?gid=545113631#gid=545113631";

export const SHIFT_INDEX = Object.freeze({
  NIGHT_2_6: 0,
  MORNING_6_10: 1,
  MORNING_10_14: 2,
  AFTERNOON_14_18: 3,
  EVENING_18_22: 4,
  NIGHT_22_2: 5,
});

export const HEB_DAYS = [
  "יום ראשון",
  "יום שני",
  "יום שלישי",
  "יום רביעי",
  "יום חמישי",
  "יום שישי",
  "יום שבת",
];

export const TIME_SLOTS = [
  "02:00 - 06:00 (Night)",
  "06:00 - 10:00",
  "10:00 - 14:00",
  "14:00 - 18:00",
  "18:00 - 22:00",
  "22:00 - 02:00 (Night)",
];

export const SLOT_ICONS = ["🦉", "🥱", "☕", "🍔", "😵‍💫", "😴"];

export const COLOR_MAP = {
  "אמיר": "color-אמיר",
  "נמרוד": "color-נמרוד",
  "יובי": "color-יובי",
  "טגניה": "color-טגניה",
  "ישי": "color-ישי",
  "גולן": "color-גולן",
  "חסון": "color-חסון",
  "לישע": "color-לישע",
  "עידן": "color-עידן",
  "חגי": "color-חגי",
  "סתיו": "color-סתיו",
  "אסף": "color-אסף",
  "ליאני": "color-ליאני",
  "נתי": "color-נתי",
  "ערן": "color-ערן",
  "מאור": "color-מאור",
  "ניר": "color-ניר",
  "חורחה": "color-חורחה",
  "שלומי": "color-שלומי",
  "יפתח": "color-יפתח",
  "חברוני": "color-חברוני",
  "ויקטור": "color-ויקטור",
  "שגיא": "color-שגיא",
};
