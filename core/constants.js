export const DEFAULT_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwDSDYW6iFTCxBWlWy78LsCutdyfq-qvrSs8pmCNs3jzB5jpBVbM_d_scxArKBxi-6Q/exec";

export const STORAGE_KEYS = {
  WEEK_START: "weekStart",
  SHEET_URL: "googleSheetUrl",
  SHIFT_REQ_SCOPE_WEEK: "shiftReqScopeWeek",
  LEAVE_SCOPE_WEEK: "leaveScopeWeek",
  FULL_STATE: "shift_scheduler_full_state_v5",
};

export const RULES = {
  MIN_REQUIRED: 3,
  MAX_ALLOWED: 5,
  MAX_NIGHT_2_6: 2,
};

export const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1NXgjKC-0j4blUQawwzz4lMEhswA561GKxAoSJO5ie_s/edit?gid=0#gid=0";

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
};
