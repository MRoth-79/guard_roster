export function makeSnapshot() {
  return {
    expectedDays: [...this.state.expectedDays],
    excelMatrix: this.state.excelMatrix.map((row) => [...row]),
    startDate: this.el.startDate.value,
    googleSheetUrl: this.el.googleSheetUrl.value,
    lockedName: this.state.lockedName,
    fairnessOpen: this.el.fairnessPanel.style.display === "block",
    weekStart: this.getWeekStartSetting(),
    priorityGuards: Array.from(this.getPriorityGuardSet()),
    shiftReqScopeWeek: !!this.el.shiftReqScopeWeek.checked,
    leaveScopeWeek: !!this.el.leaveScopeWeek.checked,
    searchQuery: this.Store.getState().searchQuery || "",
    autoMode: this.el.autoMode.value,
    urlOpen: this.el.urlInputWrap.classList.contains("open"),
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

  this.el.startDate.value = snapshot.startDate || this.el.startDate.value;
  this.el.googleSheetUrl.value = snapshot.googleSheetUrl || this.el.googleSheetUrl.value || this.C.DEFAULT_WEB_APP_URL;
  this.state.lockedName = snapshot.lockedName || null;
  this.el.fairnessPanel.style.display = snapshot.fairnessOpen ? "block" : "none";
  this.el.guardSearchInput.value = snapshot.searchQuery || "";
  this.el.autoMode.value = snapshot.autoMode || "balanced";
  this.el.urlInputWrap.classList.toggle("open", !!snapshot.urlOpen);
  this.el.toggleUrlButton.textContent = this.el.urlInputWrap.classList.contains("open") ? "🔗 סגור URL" : "🔗 URL";

  this.ExcelGrid.render();
  this.renderGuardButtons();

  const selected = new Set((snapshot.priorityGuards || []).map((x) => this.normalizeKey(x)));
  this.el.guardButtonsContainer.querySelectorAll(".guard-btn").forEach((btn) => {
    btn.classList.toggle("active", selected.has(this.normalizeKey(btn.textContent)));
  });

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
      this.el.googleSheetUrl.value = localStorage.getItem(this.C.STORAGE_KEYS.SHEET_URL) || this.C.DEFAULT_WEB_APP_URL;
      return;
    }
    const parsed = JSON.parse(raw);
    this.applySnapshot(parsed);
  } catch {
    this.el.googleSheetUrl.value = localStorage.getItem(this.C.STORAGE_KEYS.SHEET_URL) || this.C.DEFAULT_WEB_APP_URL;
  }
}
