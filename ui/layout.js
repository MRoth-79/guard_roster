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

function bindClick(app, el, fn) {
  if (!el) return;
  el.addEventListener("click", (e) => {
    e.preventDefault();
    runAppAction(app, fn);
  });
}

export function bindEvents() {
  const app = this;

  bindClick(app, app.el.autoScheduleButton, () => app.autoSchedule());
  bindClick(app, app.el.btnExcelUpdate, () => app.updateScheduleFromGrid());
  bindClick(app, app.el.btnExcelClear, () => {
    app.pushUndoSnapshot();
    app.ExcelGrid?.clear?.();
    app.Store.setState({
      excelMatrix: app.state.excelMatrix,
      availabilityMatrix: app.state.availabilityMatrix,
      parsedData: null,
    });
    app.persistFullState();
  });
  bindClick(app, app.el.quickFetchButton, () => app.fetchFromGoogleSheet());
  bindClick(app, app.el.downloadHtmlButton, () => app.downloadHtmlTable());
  bindClick(app, app.el.openSheetButton, () => window.open(app.C.SHEET_URL, "_blank", "noopener,noreferrer"));
  bindClick(app, app.el.saveToCloudButton, () => app.saveToCloud());
  bindClick(app, app.el.loadFromCloudButton, () => app.loadFromCloud());
  bindClick(app, app.el.toggleGuardPickerButton, () => {
    if (!app.el.guardPickerPanel) return;
    const open = app.el.guardPickerPanel.classList.toggle("open");
    app.el.toggleGuardPickerButton?.setAttribute("aria-expanded", String(open));
  });
  bindClick(app, app.el.toggleUrlButton, () => {
    if (!app.el.urlInputWrap) return;
    const open = app.el.urlInputWrap.classList.toggle("open");
    if (app.el.toggleUrlButton) {
      app.el.toggleUrlButton.textContent = open ? "🔗 סגור URL" : "🔗 URL";
    }
  });

  app.el.startDate?.addEventListener("change", () => {
    runAppAction(app, () => {
      app.pushUndoSnapshot();
      app.updateStartDateLabelBySetting();
      app.refreshAfterDataChange();
      app.Store.setState({ startDate: app.el.startDate.value });
      app.persistFullState();
    });
  });

  document.addEventListener("mouseover", (e) => {
    const bubble = e.target.closest(".person");
    if (bubble && !app.state.lockedName) app.updateHighlights(bubble.textContent.trim());
  }, { passive: true });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(".person") && !app.state.lockedName) app.updateHighlights(null);
  }, { passive: true });

  document.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;

    const bubble = e.target.closest(".person");
    if (bubble) {
      const scheduleCell = bubble.closest('#scheduleTable td[contenteditable="plaintext-only"]');
      if (scheduleCell) {
        e.preventDefault();
        app.startCellEditing(scheduleCell);
        return;
      }
      const name = bubble.textContent.trim();
      const newName = app.state.lockedName === name ? null : name;
      app.state.lockedName = newName;
      app.Store.setState({ lockedName: newName });
      app.persistFullState();
      return;
    }

    const emptyScheduleCell = e.target.closest('#scheduleTable td[contenteditable="plaintext-only"]');
    if (emptyScheduleCell && !emptyScheduleCell.querySelector(".person")) {
      e.preventDefault();
      app.startCellEditing(emptyScheduleCell);
      return;
    }

    const isUi = !!(e.target.closest("input") || e.target.closest("select") || e.target.closest("a"));
    if (!isUi) {
      app.state.lockedName = null;
      app.Store.setState({ lockedName: null });
      app.persistFullState();
    }
  }, { passive: false });

  document.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === "Escape") {
      app.state.lockedName = null;
      app.Store.setState({ lockedName: null });
      app.persistFullState();
      return;
    }
    if (mod && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      app.undo();
      return;
    }
    if (mod && ((e.key === "y" || e.key === "Y") || (e.shiftKey && (e.key === "z" || e.key === "Z")))) {
      e.preventDefault();
      app.redo();
    }
  });

  document.addEventListener("beforeinput", (e) => {
    if (e.inputType === "insertParagraph" && e.target?.isContentEditable) {
      e.preventDefault();
      app.insertPlainTextAtCursor("\n");
    }
  }, { passive: false });

  document.addEventListener("paste", (e) => {
    if (e.target?.isContentEditable) {
      const text = e.clipboardData?.getData("text/plain");
      if (!text) return;
      e.preventDefault();
      app.insertPlainTextAtCursor(text);
    }
  }, { passive: false });
}
