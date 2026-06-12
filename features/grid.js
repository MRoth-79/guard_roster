import { renderExcelGrid } from "../ui/excel-grid-view.js";

export function createExcelGrid(app) {
  return {
    init() {
      if (!app.state.excelMatrix.length) {
        app.state.excelMatrix = app.C.TIME_SLOTS.map(() => app.state.expectedDays.map(() => ""));
      }
      this.render();
      const wrapper = app.el["excel-grid"].parentElement;
      if (!wrapper.dataset.bound) {
        wrapper.dataset.bound = "1";
        wrapper.addEventListener("paste", (e) => {
          const cell = e.target.closest("td.cell");
          if (cell) app.pushUndoSnapshot();
          this.handlePaste(e);
          app.Store.setState({ excelMatrix: app.state.excelMatrix });
          app.persistFullState();
        });
        wrapper.addEventListener("input", (e) => {
          const cell = e.target.closest("td.cell");
          if (!cell) return;
          const r = Number(cell.dataset.r);
          const c = Number(cell.dataset.c);
          app.state.excelMatrix[r][c] = this.normalizeCellValue(cell.innerText);
          this.validateCellElement(cell);
          app.Store.setState({ excelMatrix: app.state.excelMatrix });
          app.persistFullState();
        });
      }
    },

    render() {
      renderExcelGrid(app);
      this.validateAllGridCells();
    },

    normalizeCellValue(value) {
      return String(value || "").replace(/\u00A0/g, " ").split(/[\n,]+/).map((x) => x.trim()).filter(Boolean).join(", ");
    },

    parseTableLike(text) {
      return String(text || "").replace(/\r/g, "").split("\n").map((line) => {
        const useTab = line.split("\t").length >= line.split(",").length;
        return (useTab ? line.split("\t") : line.split(",")).map((x) => x.trim());
      });
    },

    loadFromText(text) {
      const parsed = app.parseScheduleText(text);
      if (!parsed.error) {
        app.state.excelMatrix = parsed.data.map((row) => row.map((cell) => this.normalizeCellValue(cell)));
        this.render();
        return;
      }
      const rows = this.parseTableLike(text).filter((row) => row.some(Boolean));
      app.state.excelMatrix = app.C.TIME_SLOTS.map(() => app.state.expectedDays.map(() => ""));
      if (!rows.length) { this.render(); return; }
      const header = rows[0];
      const hasDayHeader = header.some((h) => app.state.expectedDays.some((day) => h.includes(day.replace("יום ", "")) || h.includes(day)));
      const startRow = hasDayHeader ? 1 : 0;
      for (let r = 0; r < app.C.TIME_SLOTS.length && startRow + r < rows.length; r++) {
        const line = rows[startRow + r];
        const col0 = (line[0] || "").trim();
        const time = app.C.TIME_SLOTS[r].split("(")[0].trim();
        const hasTimeInFirstCol = col0 && time.startsWith(col0);
        const startCol = hasTimeInFirstCol ? 1 : 0;
        for (let c = 0; c < app.state.expectedDays.length && startCol + c < line.length; c++) {
          app.state.excelMatrix[r][c] = this.normalizeCellValue(line[startCol + c] || "");
        }
      }
      this.render();
    },

    handlePaste(e) {
      const cell = e.target.closest("td.cell");
      if (!cell) return;
      const text = e.clipboardData?.getData("text/plain");
      if (!text) return;
      e.preventDefault();
      const rows = this.parseTableLike(text);
      const r0 = Number(cell.dataset.r);
      const c0 = Number(cell.dataset.c);
      rows.forEach((row, r) => {
        row.forEach((value, c) => {
          const R = r0 + r;
          const C = c0 + c;
          if (R < app.state.excelMatrix.length && C < app.state.excelMatrix[0].length) {
            app.state.excelMatrix[R][C] = this.normalizeCellValue(value);
          }
        });
      });
      this.render();
    },

    isKnownName(name) {
      const clean = app.normalizeKey(name);
      return !!(app.C.COLOR_MAP[clean] || app.C.COLOR_MAP[clean.replace(/\s+/g, "_")]);
    },

    validateCellElement(cell) {
      const values = app.splitCellNames(cell.innerText || "");
      const unknowns = values.filter((name) => !this.isKnownName(name));
      const startDate = app.el.startDate.value;
      let leaveNames = [];
      if (startDate) {
        const isoDays = app.getIsoDatesForWeek(startDate);
        leaveNames = values.filter((name) => {
          const map = app.loadVacationsMap();
          const entry = map[name] || map[name.replace(/\s+/g, "_")];
          if (!entry?.from || !entry?.to) return false;
          return isoDays.some((iso) => iso >= entry.from && iso <= entry.to);
        });
      }
      cell.classList.remove("has-unknown", "on-leave-cell");
      cell.removeAttribute("title");
      if (unknowns.length) {
        cell.classList.add("has-unknown");
        cell.title = `שמות לא מזוהים: ${unknowns.join(", ")}`;
      } else if (leaveNames.length) {
        cell.classList.add("on-leave-cell");
        cell.title = `בחופשה: ${leaveNames.join(", ")}`;
      }
    },

    validateAllGridCells() {
      document.querySelectorAll("#excel-grid td.cell").forEach((cell) => this.validateCellElement(cell));
    },

    clear() {
      app.state.excelMatrix = app.C.TIME_SLOTS.map(() => app.state.expectedDays.map(() => ""));
      this.render();
      app.el.resultsContainer.innerHTML = `<p id="initialMessage">הדבק נתונים או משוך אותם מה‑Web App, ואז לחץ על ניתוח או סידור אוטומטי.</p>`;
      app.el.fairnessContent.innerHTML = `בצע ניתוח כדי לראות הסבר למה כל תא/עובד מסומן.`;
      app.updateSearchHighlights();
    },
  };
}

export function syncRenderedTableBackToMatrix() {
  const table = document.getElementById("scheduleTable");
  if (!table || !table.tBodies?.length) return;
  const rows = Array.from(table.tBodies[0].rows);
  if (rows.length !== this.C.TIME_SLOTS.length) return;

  rows.forEach((tr, rowIndex) => {
    for (let dayIndex = 0; dayIndex < this.state.expectedDays.length; dayIndex++) {
      const cell = tr.cells[dayIndex + 1];
      const names = cell
        ? Array.from(cell.querySelectorAll(".person")).map((el) => this.normalizeKey(el.textContent)).filter(Boolean)
        : [];
      this.state.excelMatrix[rowIndex][dayIndex] = names.join(", ");
    }
  });

  this.ExcelGrid.render();
  this.ExcelGrid.validateAllGridCells();
  const parsed = this.parseScheduleText(this.serializeMatrixToVerticalText());
  this.Store.setState({ excelMatrix: this.state.excelMatrix, parsedData: parsed, startDate: this.el.startDate.value });
}

export function refreshAfterDataChange() {
  this.ExcelGrid.validateAllGridCells();
  const text = this.serializeMatrixToVerticalText();
  if (text.trim()) {
    const parsed = this.parseScheduleText(text);
    this.Store.setState({ excelMatrix: this.state.excelMatrix, parsedData: parsed, startDate: this.el.startDate.value });
  } else {
    this.Store.setState({ excelMatrix: this.state.excelMatrix, parsedData: null, startDate: this.el.startDate.value });
  }
}
