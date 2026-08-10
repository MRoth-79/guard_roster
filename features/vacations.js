export function getVacationStorageKey() {
  return "vacations__global";
}

export function loadVacationsMap() {
  try {
    const raw = localStorage.getItem(this.getVacationStorageKey());
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveVacationsMap(map) {
  try { localStorage.setItem(this.getVacationStorageKey(), JSON.stringify(map)); } catch {}
  this.persistFullState();
}

export function isOnVacation(name, isoDate) {
  const map = this.loadVacationsMap();
  const clean = this.normalizeKey(name);
  const entry = map[clean] || map[clean.replace(/\s+/g, "_")] || map[name];
  if (!entry || !entry.from || !entry.to) return false;
  return isoDate >= entry.from && isoDate <= entry.to;
}

export function buildWeeklyOnLeaveSet(startDate) {
  const set = new Set();
  if (!startDate) return set;
  const map = this.loadVacationsMap();
  const weekDates = this.getIsoDatesForWeek(startDate);
  Object.entries(map).forEach(([name, val]) => {
    if (!val?.from || !val?.to) return;
    if (weekDates.some((iso) => iso >= val.from && iso <= val.to)) set.add(name);
  });
  return set;
}

export function buildVacationsPanel() {
  // Vacation settings UI removed.
}
