export function getShiftReqStorageKey() {
  const byWeek = !!this.el.shiftReqScopeWeek.checked;
  return byWeek ? `shift_requirements__${this.el.startDate.value || "no-date"}` : "shift_requirements__global";
}

export function loadShiftRequirements() {
  const defaults = { 0:1, 1:1, 2:1, 3:1, 4:1, 5:1 };
  try {
    const raw = localStorage.getItem(this.getShiftReqStorageKey());
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? { ...defaults, ...parsed } : defaults;
  } catch {
    return defaults;
  }
}

export function saveShiftRequirements(map) {
  try { localStorage.setItem(this.getShiftReqStorageKey(), JSON.stringify(map)); } catch {}
  this.persistFullState();
}

export function getRequiredPerShift(index) {
  const map = this.loadShiftRequirements();
  return Number(map[index] ?? 1) === 2 ? 2 : 1;
}

export function buildShiftReqPanel() {
  try { this.el.shiftReqScopeWeek.checked = localStorage.getItem(this.C.STORAGE_KEYS.SHIFT_REQ_SCOPE_WEEK) === "1"; } catch {}
  this.el.weekStartSelect.value = this.getWeekStartSetting();

  const renderRows = () => {
    const map = this.loadShiftRequirements();
    this.el.shiftReqGrid.innerHTML = "";
    this.C.TIME_SLOTS.forEach((slot, idx) => {
      const label = document.createElement("div");
      label.className = "req-label";
      label.textContent = slot.replace(" (Night)", "");
      const control = document.createElement("div");
      control.className = "req-control";
      [1, 2].forEach((value) => {
        const opt = document.createElement("span");
        opt.className = this.cx("req-opt", Number(map[idx] ?? 1) === value && "active");
        opt.textContent = String(value);
        opt.addEventListener("click", () => {
          this.pushUndoSnapshot();
          map[idx] = value;
          this.saveShiftRequirements(map);
          renderRows();
          this.refreshAfterDataChange();
        });
        control.appendChild(opt);
      });
      this.el.shiftReqGrid.appendChild(label);
      this.el.shiftReqGrid.appendChild(control);
    });
  };

  this.el.openShiftReqBtn.addEventListener("click", () => {
    this.el.shiftReqPanel.style.display = this.el.shiftReqPanel.style.display === "block" ? "none" : "block";
    renderRows();
  });
  this.el.shiftReqClose.addEventListener("click", () => { this.el.shiftReqPanel.style.display = "none"; });
  this.el.shiftReqScopeWeek.addEventListener("change", () => {
    try { localStorage.setItem(this.C.STORAGE_KEYS.SHIFT_REQ_SCOPE_WEEK, this.el.shiftReqScopeWeek.checked ? "1" : "0"); } catch {}
    this.persistFullState();
    renderRows();
    this.refreshAfterDataChange();
  });
  this.el.weekStartSelect.addEventListener("change", () => {
    this.pushUndoSnapshot();
    const val = this.el.weekStartSelect.value === "sun" ? "sun" : "mon";
    try { localStorage.setItem(this.C.STORAGE_KEYS.WEEK_START, val); } catch {}
    this.state.expectedDays = this.computeExpectedDays(val);
    this.ExcelGrid.init();
    this.updateStartDateLabelBySetting();
    renderRows();
    this.refreshAfterDataChange();
    this.persistFullState();
  });

  renderRows();
}

