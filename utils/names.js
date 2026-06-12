export function allEmployeeNames() {
  return Object.keys(this.C.COLOR_MAP)
    .map((name) => name.replace(/_/g, " "))
    .sort((a, b) => a.localeCompare(b, "he"));
}

export function getScheduledEmployeeNames(allShifts) {
  return Object.keys(allShifts)
    .filter((name) => (allShifts[name] || 0) > 0)
    .sort((a, b) => {
      const aCount = allShifts[a] || 0;
      const bCount = allShifts[b] || 0;
      if (bCount !== aCount) return bCount - aCount;
      return a.localeCompare(b, "he");
    });
}

export function nameToColorClass(name) {
  const clean = this.normalizeKey(name);
  if (this.C.COLOR_MAP[clean]) return this.C.COLOR_MAP[clean];
  const underscored = clean.replace(/\s+/g, "_");
  return this.C.COLOR_MAP[underscored] || null;
}

