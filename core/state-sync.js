export function makeSnapshot() {
  return {
    expectedDays: [...this.state.expectedDays],
    excelMatrix: this.state.excelMatrix.map((row) => [...row]),
    startDate: this.el.startDate?.value || "",
    googleSheetUrl: this.C.SHEET_URL,
    lockedName: this.state.lockedName,
    weekStart: this.getWeekStartSetting(),
    priorityGuards: Array.from(this.getPriorityGuardSet()),
    shiftReqScopeWeek: !!this.el.shiftReqScopeWeek?.checked,
    searchQuery: this.Store.getState().searchQuery || "",
    autoMode: this.el.autoMode?.value || "balanced",
    urlOpen: !!this.el.urlInputWrap?.classList.contains("open"),
  };
}

export function applySnapshot(snapshot) {
  if (!snapshot) return;
  this.state.isRestoring = true;

  this.state.expectedDays = Array.isArray(snapshot.expectedDays) && snapshot.expectedDays.length === 7
    ? [...snapshot.expectedDays]
    : this.computeExpectedDays(snapshot.weekStart || this.getWeekStartSetting());

  this.state.excelMatrix = Array.isArray(snapshot.excelMatrix) && snapshot.excelMatrix.length === this.C.TIME_SLOTS.length
    ? snapshot.excelMatrix.map((row) => Array.isArray(row) ? [...row] : this.state.expectedDays.map(() => ""))
    : this.C.TIME_SLOTS.map(() => this.state.expectedDays.map(() => ""));

  this.el.startDate.value = snapshot.startDate || this.el.startDate.value || this.computeUpcomingWeekStartIso();
  // Reject non-ISO values that make <input type="date"> appear blank.
  if (this.el.startDate.value && !/^\d{4}-\d{2}-\d{2}$/.test(this.el.startDate.value)) {
    this.el.startDate.value = this.computeUpcomingWeekStartIso();
  }
  if (this.el.googleSheetUrl) this.el.googleSheetUrl.value = this.C.SHEET_URL;
  try { localStorage.setItem(this.C.STORAGE_KEYS.SHEET_URL, this.C.SHEET_URL); } catch {}
  this.state.lockedName = snapshot.lockedName || null;
  if (this.el.guardSearchInput) this.el.guardSearchInput.value = snapshot.searchQuery || "";
  if (this.el.autoMode) this.el.autoMode.value = snapshot.autoMode || "balanced";
  if (this.el.urlInputWrap) this.el.urlInputWrap.classList.toggle("open", !!snapshot.urlOpen);
  if (this.el.toggleUrlButton) {
    this.el.toggleUrlButton.textContent = this.el.urlInputWrap?.classList.contains("open") ? "🔗 סגור URL" : "🔗 URL";
  }

  const weekStart = snapshot.weekStart === "sun" || snapshot.weekStart === "mon"
    ? snapshot.weekStart
    : this.getWeekStartSetting();
  try { localStorage.setItem(this.C.STORAGE_KEYS.WEEK_START, weekStart); } catch {}
  if (this.el.weekStartSelect) this.el.weekStartSelect.value = weekStart;

  if (typeof snapshot.shiftReqScopeWeek === "boolean" && this.el.shiftReqScopeWeek) {
    this.el.shiftReqScopeWeek.checked = snapshot.shiftReqScopeWeek;
    try { localStorage.setItem(this.C.STORAGE_KEYS.SHIFT_REQ_SCOPE_WEEK, snapshot.shiftReqScopeWeek ? "1" : "0"); } catch {}
  }

  this.ExcelGrid?.render?.();
  this.state.priorityGuards = (snapshot.priorityGuards || []).map((x) => this.normalizeKey(x)).filter(Boolean);
  this.renderGuardButtons();

  this.updateStartDateLabelBySetting();
  const parsed = this.parseScheduleText(this.serializeMatrixToVerticalText());
  this.Store.setState({
    excelMatrix: this.state.excelMatrix,
    startDate: this.el.startDate.value,
    lockedName: this.state.lockedName,
    searchQuery: snapshot.searchQuery || "",
    parsedData: parsed,
  });

  this.state.isRestoring = false;
}

export function persistFullState() {
  if (this.state.isRestoring) return;
  try {
    localStorage.setItem(this.C.STORAGE_KEYS.FULL_STATE, JSON.stringify(this.makeSnapshot()));
  } catch {}
}

export function restoreFullState() {
  try {
    const raw = localStorage.getItem(this.C.STORAGE_KEYS.FULL_STATE);
    if (!raw) {
      this.el.googleSheetUrl.value = this.C.SHEET_URL;
      try { localStorage.setItem(this.C.STORAGE_KEYS.SHEET_URL, this.C.SHEET_URL); } catch {}
      return;
    }
    const parsed = JSON.parse(raw);
    this.applySnapshot(parsed);
  } catch {
    this.el.googleSheetUrl.value = this.C.SHEET_URL;
    try { localStorage.setItem(this.C.STORAGE_KEYS.SHEET_URL, this.C.SHEET_URL); } catch {}
  }
}
