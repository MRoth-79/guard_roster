/** Google Apps Script Web App (/exec) — guard_roster cloud save/load. */
export const DEFAULT_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwsqLetDtytZdYuPKEWK5Jb4u8YC82M1GTIwKWh4TZ2ubT2daKFOeRq_OhKH9YsLBaz6g/exec";

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

/**
 * Central name-badge config: background, border color, and border style.
 * Text color (black/white) is chosen automatically from contrast.
 * Badge border is 2px (3px only for `double`, so the double stroke is visible).
 */
export const NAME_STYLES = {
  "שגיא":   { bg: "linear-gradient(135deg, #052e16, #15803d)", borderColor: "#14532d", borderStyle: "solid" },
  "יובי":   { bg: "linear-gradient(135deg, #92400e, #d97706)", borderColor: "#9a3412", borderStyle: "dashed" },
  "אמיר":   { bg: "linear-gradient(135deg, #1e3a8a, #1d4ed8)", borderColor: "#1e3a8a", borderStyle: "solid" },
  "חברוני": { bg: "linear-gradient(135deg, #155e75, #22d3ee)", borderColor: "#155e75", borderStyle: "dotted" },
  "חסון":   { bg: "linear-gradient(135deg, #3b1c0a, #6b3a14)", borderColor: "#431407", borderStyle: "double" },
  "ויקטור": { bg: "linear-gradient(135deg, #eab308, #fde047)", borderColor: "#9d174d", borderStyle: "dashed" },
  "עידן":   { bg: "linear-gradient(135deg, #86198f, #e879f9)", borderColor: "#581c87", borderStyle: "solid" },
  "ישי":    { bg: "linear-gradient(135deg, #8d949c 0%, #cfd3d8 45%, #f4f5f7 100%)", borderColor: "#111111", borderStyle: "dotted" },
  "ניר":    { bg: "linear-gradient(135deg, #7f1d1d, #dc2626)", borderColor: "#7f1d1d", borderStyle: "double" },
  "מאור":   { bg: "linear-gradient(135deg, #9a3412, #f97316)", borderColor: "#854d0e", borderStyle: "solid" },
  "נמרוד":  { bg: "linear-gradient(135deg, #4d7c0f, #a3e635)", borderColor: "#115e59", borderStyle: "dashed" },
  "טגניה":  { bg: "linear-gradient(135deg, #2e0a3d, #5b2c6f)", borderColor: "#4c1d95", borderStyle: "dashed" },
  "גולן":   { bg: "linear-gradient(135deg, #115e59, #0d9488)", borderColor: "#134e4a", borderStyle: "double" },
  "לישע":   { bg: "linear-gradient(135deg, #be185d, #f472b6)", borderColor: "#9d174d", borderStyle: "solid" },
  "חגי":    { bg: "linear-gradient(135deg, #ffffff, #e2e8f0)", borderColor: "#334155", borderStyle: "solid" },
  "סתיו":   { bg: "linear-gradient(135deg, #9d174d, #db2777)", borderColor: "#9d174d", borderStyle: "dashed" },
  "אסף":    { bg: "linear-gradient(135deg, #312e81, #4f46e5)", borderColor: "#312e81", borderStyle: "solid" },
  "ליאני":  { bg: "linear-gradient(135deg, #0284c7, #38bdf8)", borderColor: "#0369a1", borderStyle: "dotted" },
  "נתי":    { bg: "linear-gradient(135deg, #365314, #4d7c0f)", borderColor: "#365314", borderStyle: "solid" },
  "ערן":    { bg: "linear-gradient(135deg, #0a0a0a, #27272a)", borderColor: "#3f3f46", borderStyle: "solid" },
  "חורחה":  { bg: "linear-gradient(135deg, #6d28d9, #c4b5fd)", borderColor: "#4c1d95", borderStyle: "solid" },
  "שלומי":  { bg: "linear-gradient(135deg, #ea580c, #fdba74)", borderColor: "#9a3412", borderStyle: "solid" },
  "יפתח":   { bg: "linear-gradient(135deg, #ccfbf1, #5eead4)", borderColor: "#0f766e", borderStyle: "solid" },
};

/** Alternate spellings used in the roster → canonical NAME_STYLES key. */
export const NAME_ALIASES = {
  "חברתי": "חברוני",
  "ישר": "ישי",
};

export const COLOR_MAP = Object.fromEntries(
  Object.keys(NAME_STYLES).map((name) => [name, `color-${name}`])
);
