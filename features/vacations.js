export function getVacationStorageKey() {
  const byWeek = !!this.el.leaveScopeWeek.checked;
  return byWeek ? `vacations__${this.el.startDate.value || "no-date"}` : "vacations__global";
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
  try { this.el.leaveScopeWeek.checked = localStorage.getItem(this.C.STORAGE_KEYS.LEAVE_SCOPE_WEEK) === "1"; } catch {}

  const renderList = () => {
    const map = this.loadVacationsMap();
    const keys = Object.keys(map).sort((a, b) => a.localeCompare(b, "he"));
    if (!keys.length) {
      this.el.vacationsList.innerHTML = `<div class="muted">אין רישומי חופשה.</div>`;
      return;
    }
    this.el.vacationsList.innerHTML = keys.map((name) => {
      const entry = map[name];
      return `
        <div class="list-item">
          <div>
            <div><strong>${this.escapeHtml(name)}</strong></div>
            <div class="muted">${this.escapeHtml(entry.from || "—")} → ${this.escapeHtml(entry.to || "—")}</div>
          </div>
          <div class="row mobile-inline">
            <button class="btn btn-neutral edit-leave-btn" data-name="${this.escapeHtml(name)}">ערוך</button>
            <button class="btn btn-danger delete-leave-btn" data-name="${this.escapeHtml(name)}">מחק</button>
          </div>
        </div>`;
    }).join("");

    this.el.vacationsList.querySelectorAll(".edit-leave-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.name;
        const entry = this.loadVacationsMap()[name] || {};
        this.el.leaveNameInput.value = name;
        this.el.leaveFromInput.value = entry.from || "";
        this.el.leaveToInput.value = entry.to || "";
      });
    });

    this.el.vacationsList.querySelectorAll(".delete-leave-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.pushUndoSnapshot();
        const name = btn.dataset.name;
        const map = this.loadVacationsMap();
        delete map[name];
        this.saveVacationsMap(map);
        renderList();
        this.refreshAfterDataChange();
      });
    });
  };

  this.el.openVacationsBtn.addEventListener("click", () => {
    this.el.vacationsPanel.style.display = this.el.vacationsPanel.style.display === "block" ? "none" : "block";
    renderList();
  });
  this.el.leaveScopeWeek.addEventListener("change", () => {
    try { localStorage.setItem(this.C.STORAGE_KEYS.LEAVE_SCOPE_WEEK, this.el.leaveScopeWeek.checked ? "1" : "0"); } catch {}
    this.persistFullState();
    renderList();
    this.refreshAfterDataChange();
  });
  this.el.leaveAddBtn.addEventListener("click", () => {
    const name = this.normalizeKey(this.el.leaveNameInput.value);
    const from = this.el.leaveFromInput.value;
    const to = this.el.leaveToInput.value;
    if (!name || !from || !to) { alert("נא למלא שם וטווח תאריכים מלא."); return; }
    this.pushUndoSnapshot();
    const map = this.loadVacationsMap();
    map[name] = { from, to };
    this.saveVacationsMap(map);
    renderList();
    this.refreshAfterDataChange();
  });
  this.el.leaveClearBtn.addEventListener("click", () => {
    const name = this.normalizeKey(this.el.leaveNameInput.value);
    if (!name) { alert("נא למלא שם למחיקה."); return; }
    this.pushUndoSnapshot();
    const map = this.loadVacationsMap();
    delete map[name];
    this.saveVacationsMap(map);
    renderList();
    this.refreshAfterDataChange();
  });

  renderList();
}

