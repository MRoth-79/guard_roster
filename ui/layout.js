export function cacheDom() {
  [
    "startDate","startDateLabel","googleSheetUrl","fetchStatus","guardButtonsContainer",
    "quickFetchButton","autoScheduleButton","saveToCloudButton","loadFromCloudButton",
    "downloadHtmlButton","openSheetButton","btnExcelUpdate","btnExcelClear",
    "openShiftReqBtn","shiftReqPanel","shiftReqClose","shiftReqScopeWeek",
    "weekStartSelect","shiftReqGrid","statusBanner","resultsContainer",
    "excel-grid","toggleGuardPickerButton","guardPickerPanel",
    "toggleUrlButton","urlInputWrap","autoMode"
  ].forEach((id) => {
    this.el[id] = document.getElementById(id);
  });
}

function runAppAction(app, fn) {
  try {
    fn.call(app);
  } catch (err) {
    console.error(err);
    app.showStatus?.(`שגיאה: ${err?.message || err}`, "error");
  }
}

export function bindEvents() {
  const buttonActions = {
    autoScheduleButton: () => this.autoSchedule(),
    btnExcelUpdate: () => this.updateScheduleFromGrid(),
    btnExcelClear: () => {
      this.pushUndoSnapshot();
      this.ExcelGrid?.clear?.();
      this.Store.setState({ excelMatrix: this.state.excelMatrix, parsedData: null });
      this.persistFullState();
    },
    quickFetchButton: () => this.fetchFromGoogleSheet(),
    downloadHtmlButton: () => this.downloadHtmlTable(),
    openSheetButton: () => window.open(this.C.SHEET_URL, "_blank", "noopener,noreferrer"),
    saveToCloudButton: () => this.saveToCloud(),
    loadFromCloudButton: () => this.loadFromCloud(),
    toggleGuardPickerButton: () => {
      if (!this.el.guardPickerPanel) return;
      const open = this.el.guardPickerPanel.classList.toggle("open");
      this.el.toggleGuardPickerButton?.setAttribute("aria-expanded", String(open));
    },
    toggleUrlButton: () => {
      if (!this.el.urlInputWrap) return;
      const open = this.el.urlInputWrap.classList.toggle("open");
      if (this.el.toggleUrlButton) {
        this.el.toggleUrlButton.textContent = open ? "🔗 סגור URL" : "🔗 URL";
      }
    },
  };

  this.el.startDate?.addEventListener("change", () => {
    runAppAction(this, () => {
      this.pushUndoSnapshot();
      this.updateStartDateLabelBySetting();
      this.refreshAfterDataChange();
      this.Store.setState({ startDate: this.el.startDate.value });
      this.persistFullState();
    });
  });

  document.addEventListener("mouseover", (e) => {
    const bubble = e.target.closest(".person");
    if (bubble && !this.state.lockedName) this.updateHighlights(bubble.textContent.trim());
  }, { passive: true });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(".person") && !this.state.lockedName) this.updateHighlights(null);
  }, { passive: true });

  document.addEventListener("click", (e) => {
    const actionBtn = e.target.closest("button[id]");
    const action = actionBtn ? buttonActions[actionBtn.id] : null;
    if (action) {
      e.preventDefault();
      runAppAction(this, action);
      return;
    }

    const bubble = e.target.closest(".person");
    if (bubble) {
      const scheduleCell = bubble.closest('#scheduleTable td[contenteditable="plaintext-only"]');
      if (scheduleCell) {
        e.preventDefault();
        this.startCellEditing(scheduleCell);
        return;
      }
      const name = bubble.textContent.trim();
      const newName = this.state.lockedName === name ? null : name;
      this.state.lockedName = newName;
      this.Store.setState({ lockedName: newName });
      this.persistFullState();
      return;
    }

    const emptyScheduleCell = e.target.closest('#scheduleTable td[contenteditable="plaintext-only"]');
    if (emptyScheduleCell && !emptyScheduleCell.querySelector(".person")) {
      e.preventDefault();
      this.startCellEditing(emptyScheduleCell);
      return;
    }

    const isUi = !!(e.target.closest("button") || e.target.closest("input") || e.target.closest("select") || e.target.closest("a"));
    if (!isUi) {
      this.state.lockedName = null;
      this.Store.setState({ lockedName: null });
      this.persistFullState();
    }
  }, { passive: false });

  document.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === "Escape") {
      this.state.lockedName = null;
      this.Store.setState({ lockedName: null });
      this.persistFullState();
      return;
    }
    if (mod && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      this.undo();
      return;
    }
    if (mod && ((e.key === "y" || e.key === "Y") || (e.shiftKey && (e.key === "z" || e.key === "Z")))) {
      e.preventDefault();
      this.redo();
    }
  });

  document.addEventListener("beforeinput", (e) => {
    if (e.inputType === "insertParagraph" && e.target?.isContentEditable) {
      e.preventDefault();
      this.insertPlainTextAtCursor("\n");
    }
  }, { passive: false });

  document.addEventListener("paste", (e) => {
    if (e.target?.isContentEditable) {
      const text = e.clipboardData?.getData("text/plain");
      if (!text) return;
      e.preventDefault();
      this.insertPlainTextAtCursor(text);
    }
  }, { passive: false });
}
