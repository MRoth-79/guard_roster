export function cacheDom() {
  [
    "startDate","startDateLabel","googleSheetUrl","fetchStatus","guardButtonsContainer",
    "quickFetchButton","fetchFromSheetButton","autoScheduleButton","analyzeButton",
    "downloadHtmlButton","openSheetButton","btnExcelAuto","btnExcelClear",
    "openShiftReqBtn","shiftReqPanel","shiftReqClose","shiftReqScopeWeek",
    "weekStartSelect","shiftReqGrid","openVacationsBtn","vacationsPanel",
    "leaveScopeWeek","leaveNameInput","leaveFromInput","leaveToInput",
    "leaveAddBtn","leaveClearBtn","vacationsList","statusBanner","resultsContainer",
    "excel-grid","toggleFairnessButton","fairnessPanel","fairnessCloseBtn","fairnessContent",
    "guardSearchInput","searchPrevBtn","searchNextBtn","clearSearchBtn","searchStatus",
    "undoBtn","redoBtn","toggleUrlButton","urlInputWrap","autoMode"
  ].forEach((id) => {
    this.el[id] = document.getElementById(id);
  });
}

export function bindEvents() {
  this.el.analyzeButton.addEventListener("click", () => this.handleAnalyze());
  this.el.autoScheduleButton.addEventListener("click", () => this.autoSchedule());
  this.el.btnExcelAuto.addEventListener("click", () => this.autoSchedule());
  this.el.btnExcelClear.addEventListener("click", () => {
    this.pushUndoSnapshot();
    this.ExcelGrid.clear();
    this.Store.setState({ excelMatrix: this.state.excelMatrix, parsedData: null });
    this.persistFullState();
  });

  this.el.fetchFromSheetButton.addEventListener("click", () => this.fetchFromGoogleSheet());
  this.el.quickFetchButton.addEventListener("click", () => this.fetchFromGoogleSheet());
  this.el.downloadHtmlButton.addEventListener("click", () => this.downloadHtmlTable());
  this.el.openSheetButton.addEventListener("click", () => window.open(this.C.SHEET_URL, "_blank", "noopener,noreferrer"));

  this.el.toggleFairnessButton.addEventListener("click", () => {
    this.el.fairnessPanel.style.display = this.el.fairnessPanel.style.display === "block" ? "none" : "block";
    this.persistFullState();
  });
  this.el.fairnessCloseBtn.addEventListener("click", () => {
    this.el.fairnessPanel.style.display = "none";
    this.persistFullState();
  });

  this.el.startDate.addEventListener("change", () => {
    this.pushUndoSnapshot();
    this.updateStartDateLabelBySetting();
    this.refreshAfterDataChange();
    this.Store.setState({ startDate: this.el.startDate.value });
    this.persistFullState();
  });

  this.el.guardSearchInput.addEventListener("input", () => {
    this.Store.setState({ searchQuery: this.el.guardSearchInput.value });
  });
  this.el.searchPrevBtn.addEventListener("click", () => this.navigateSearch(-1));
  this.el.searchNextBtn.addEventListener("click", () => this.navigateSearch(1));
  this.el.clearSearchBtn.addEventListener("click", () => {
    this.el.guardSearchInput.value = "";
    this.Store.setState({ searchQuery: "" });
  });

  this.el.undoBtn.addEventListener("click", () => this.undo());
  this.el.redoBtn.addEventListener("click", () => this.redo());

  document.addEventListener("mouseover", (e) => {
    const bubble = e.target.closest(".person");
    if (bubble && !this.state.lockedName) this.updateHighlights(bubble.textContent.trim());
  }, { passive: true });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(".person") && !this.state.lockedName) this.updateHighlights(null);
  }, { passive: true });

  document.addEventListener("click", (e) => {
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
