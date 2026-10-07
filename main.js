import {
  DEFAULT_WEB_APP_URL,
  STORAGE_KEYS,
  RULES,
  SHEET_URL,
  SHIFT_INDEX,
  SHIFT_HOUR_BOUNDS,
  HEB_DAYS,
  TIME_SLOTS,
  SLOT_ICONS,
  COLOR_MAP,
  NAME_STYLES,
  NAME_ALIASES,
} from "./core/constants.js";
import { createStore } from "./core/store.js";
import { makeSnapshot, applySnapshot, persistFullState, restoreFullState } from "./core/state-sync.js";
import { normalizeKey, splitCellNames, escapeHtml, aggressiveClean } from "./utils/text.js";
import { getWeekStartSetting, computeExpectedDays, initializeData, computeUpcomingWeekStartIso, getHebDayNameFromIso, updateStartDateLabelBySetting, getDatesForWeek, getIsoDatesForWeek } from "./utils/dates.js";
import { allEmployeeNames, getScheduledEmployeeNames, nameToColorClass, injectPersonNameStyles } from "./utils/names.js";
import { cx, insertPlainTextAtCursor, placeCaretAtEnd } from "./utils/dom.js";
import { cacheDom, bindEvents } from "./ui/layout.js";
import { bindToolbar } from "./ui/toolbar.js";
import { showStatus } from "./ui/status-banner.js";
import { createExcelGrid, syncRenderedTableBackToMatrix, refreshAfterDataChange, flushActiveAvailabilityCell as flushActiveAvailabilityCellImpl } from "./features/grid.js";
import { nextAllowedSameDayAfter, isLessThan8SameDay, hoursBetweenShifts, hasMinRestBetween, parseScheduleText, serializeMatrixToVerticalText, matrixHasAssignments, calculateScheduleInsights, buildDashboardSummary, getCellReasonParts, buildFairnessData } from "./features/analysis.js";
import { renderFairnessPanel } from "./ui/fairness-panel.js";
import { renderSummaryBar, renderCellBadges, renderTimeSlotCell, renderScheduleHeader, renderScheduleRow, renderExceptionsTable, renderSummaryTable, renderMainScheduleTable, renderScheduleView } from "./ui/schedule-view.js";
import { updateHighlights, updateSearchHighlights, focusSearchMatch, navigateSearch } from "./features/search.js";
import { getShiftReqStorageKey, loadShiftRequirements, saveShiftRequirements, getRequiredPerShift, buildShiftReqPanel } from "./features/shift-requirements.js";
import { getVacationStorageKey, loadVacationsMap, saveVacationsMap, isOnVacation, buildWeeklyOnLeaveSet, buildVacationsPanel } from "./features/vacations.js";
import { pushUndoSnapshot, updateUndoRedoButtons, undo, redo } from "./features/undo-redo.js";
import {
  fetchFromGoogleSheet,
  askCloudPassword,
  makeCloudSnapshot,
  applyCloudSnapshot,
  postToCloud,
  saveToCloud,
  loadFromCloud,
} from "./features/google-sheet.js";
import { autoSchedule } from "./features/auto-scheduler.js";
import { downloadHtmlTable } from "./features/export-html.js";
const Store = createStore();

const App = {
  C: {
    DEFAULT_WEB_APP_URL,
    STORAGE_KEYS,
    RULES,
    SHEET_URL,
    SHIFT_INDEX,
    SHIFT_HOUR_BOUNDS,
    HEB_DAYS,
    TIME_SLOTS,
    SLOT_ICONS,
    COLOR_MAP,
    NAME_STYLES,
    NAME_ALIASES,
  },
  Store,
  state: {
    expectedDays: [],
    excelMatrix: [],
    availabilityMatrix: [],
    lockedName: null,
    statusTimer: null,
    isRestoring: false,
    isRenderingFromStore: false,
    undoStack: [],
    redoStack: [],
    searchMatches: [],
    currentSearchIndex: -1,
    priorityGuards: [],
  },
  el: {},

  cacheDom,
  bindEvents,
  bindToolbar,
  showStatus,
  makeSnapshot,
  applySnapshot,
  persistFullState,
  restoreFullState,
  normalizeKey,
  splitCellNames,
  escapeHtml,
  aggressiveClean,
  getWeekStartSetting,
  computeExpectedDays,
  initializeData,
  computeUpcomingWeekStartIso,
  getHebDayNameFromIso,
  updateStartDateLabelBySetting,
  getDatesForWeek,
  getIsoDatesForWeek,
  allEmployeeNames,
  getScheduledEmployeeNames,
  nameToColorClass,
  injectPersonNameStyles,
  cx,
  insertPlainTextAtCursor,
  placeCaretAtEnd,
  syncRenderedTableBackToMatrix,
  refreshAfterDataChange,
  flushActiveAvailabilityCell() {
    flushActiveAvailabilityCellImpl(this);
  },
  nextAllowedSameDayAfter,
  isLessThan8SameDay,
  hoursBetweenShifts,
  hasMinRestBetween,
  parseScheduleText,
  serializeMatrixToVerticalText,
  matrixHasAssignments,
  calculateScheduleInsights,
  buildDashboardSummary,
  getCellReasonParts,
  buildFairnessData,
  renderFairnessPanel,
  renderSummaryBar,
  renderCellBadges,
  renderTimeSlotCell,
  renderScheduleHeader,
  renderScheduleRow,
  renderExceptionsTable,
  renderSummaryTable,
  renderMainScheduleTable,
  renderScheduleView,
  updateHighlights,
  updateSearchHighlights,
  focusSearchMatch,
  navigateSearch,
  getShiftReqStorageKey,
  loadShiftRequirements,
  saveShiftRequirements,
  getRequiredPerShift,
  buildShiftReqPanel,
  getVacationStorageKey,
  loadVacationsMap,
  saveVacationsMap,
  isOnVacation,
  buildWeeklyOnLeaveSet,
  buildVacationsPanel,
  pushUndoSnapshot,
  updateUndoRedoButtons,
  undo,
  redo,
  fetchFromGoogleSheet,
  autoSchedule,
  downloadHtmlTable,
  askCloudPassword,
  makeCloudSnapshot,
  applyCloudSnapshot,
  postToCloud,
  saveToCloud,
  loadFromCloud,

  init() {
    try {
      this.injectPersonNameStyles();
      this.cacheDom();
      this.bindToolbar();
      this.bindEvents();
      this.state.expectedDays = this.computeExpectedDays(this.getWeekStartSetting());
      this.initializeData();
      this.ExcelGrid = createExcelGrid(this);
      this.ExcelGrid.init();
      this.renderGuardButtons();
      this.buildShiftReqPanel();
      this.buildVacationsPanel();
      try {
        this.restoreFullState();
      } catch (err) {
        console.error("restoreFullState failed", err);
      }

      const upcomingIso = this.computeUpcomingWeekStartIso();
      const dateBeforeBump = this.el.startDate?.value || "";
      if (!this.el.startDate?.value || this.el.startDate.value < upcomingIso) {
        this.el.startDate.value = upcomingIso;
      }
      const emptyWeek = () => this.C.TIME_SLOTS.map(() => this.state.expectedDays.map(() => ""));
      if (dateBeforeBump && dateBeforeBump !== this.el.startDate.value) {
        this.state.excelMatrix = emptyWeek();
        this.state.availabilityMatrix = emptyWeek();
      }

      const weekStart = this.getWeekStartSetting();
      const canonicalDays = this.computeExpectedDays(weekStart);
      if (!Array.isArray(this.state.expectedDays) || this.state.expectedDays.length !== 7) {
        this.state.expectedDays = canonicalDays;
      } else if (this.state.expectedDays[0] !== canonicalDays[0]) {
        const oldDays = [...this.state.expectedDays];
        const remap = (matrix) => (matrix.length ? matrix : this.C.TIME_SLOTS.map(() => oldDays.map(() => "")))
          .map((row) => canonicalDays.map((day) => {
            const oldIndex = oldDays.indexOf(day);
            return oldIndex >= 0 ? (row[oldIndex] || "") : "";
          }));
        this.state.excelMatrix = remap(this.state.excelMatrix);
        this.state.availabilityMatrix = remap(this.state.availabilityMatrix);
        this.state.expectedDays = canonicalDays;
      }
      if (!Array.isArray(this.state.excelMatrix) || this.state.excelMatrix.length !== this.C.TIME_SLOTS.length) {
        this.state.excelMatrix = emptyWeek();
      }
      if (!Array.isArray(this.state.availabilityMatrix) || this.state.availabilityMatrix.length !== this.C.TIME_SLOTS.length) {
        this.state.availabilityMatrix = this.state.excelMatrix.map((row) => [...row]);
      }
      this.ExcelGrid.render();
      this.updateStartDateLabelBySetting();

      this.Store.setState({
        excelMatrix: this.state.excelMatrix,
        availabilityMatrix: this.state.availabilityMatrix,
        startDate: this.el.startDate.value,
        lockedName: this.state.lockedName,
        searchQuery: "",
      });

      this.updateUndoRedoButtons();
      this.updateSearchHighlights();
      if (this.serializeMatrixToVerticalText().trim()) this.handleAnalyze();
      document.body.dataset.appReady = "1";
    } catch (err) {
      console.error("App.init failed", err);
      try {
        this.showStatus(`שגיאת אתחול: ${err?.message || err}`, "error");
      } catch {}
    }
  },

  handleAnalyze() {
    const parsed = this.parseScheduleText(this.serializeMatrixToVerticalText());
    this.Store.setState({
      excelMatrix: this.state.excelMatrix,
      parsedData: parsed,
      startDate: this.el.startDate.value,
    });
    this.persistFullState();
  },

  updateScheduleFromGrid() {
    this.flushActiveAvailabilityCell();
    this.ExcelGrid.validateAllGridCells();
    const hasAvailability = this.matrixHasAssignments(this.state.availabilityMatrix);
    if (!hasAvailability) {
      this.showStatus("טבלת הזמינות ריקה — אין מה לסדר.", "warning");
      return;
    }
    this.autoSchedule({ skipUndo: true });
    this.showStatus("הסידור התחתון עודכן לפי זמינות מהטבלה העליונה.", "success");
    this.el.resultsContainer?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  },

  startCellEditing(td) {
    if (!td || td.dataset.editing === "1") return;
    this.pushUndoSnapshot();
    const names = Array.from(td.querySelectorAll(".person")).map((el) => this.normalizeKey(el.textContent)).filter(Boolean);
    td.dataset.editing = "1";
    td.classList.add("editing-cell");
    td.textContent = names.join(", ");
    this.placeCaretAtEnd(td);
  },

  finishCellEditing(td) {
    if (!td || td.dataset.editing !== "1") return;
    this.convertEditableCellToBubbles(td);
    td.dataset.editing = "0";
    td.classList.remove("editing-cell");
    this.syncRenderedTableBackToMatrix();
    this.handleAnalyze();
    this.persistFullState();
  },

  convertEditableCellToBubbles(cell, fallbackTime = "") {
    const raw = String(cell.innerText || "").replace(/בעיה!?/g, "").replace(/משבצת\s*ריקה/g, "").replace(/(^|\s)ריק(\s|$)/g, " ");
    const names = this.splitCellNames(raw);
    const dayName = cell.getAttribute("data-day") || "";
    const timeLabel = cell.getAttribute("data-time") || fallbackTime;
    const dayIndex = this.state.expectedDays.indexOf(dayName);
    const dayIso = dayIndex >= 0 ? this.getIsoDatesForWeek(this.el.startDate.value)[dayIndex] : "";
    cell.innerHTML = this.renderPersonBubbles(names, dayName, timeLabel, dayIso);
  },

  renderPersonBubbles(names, dayLabel, timeLabel, dayIso) {
    return (names || []).map((rawName) => {
      const clean = this.normalizeKey(rawName);
      const classes = ["person"];
      const colorClass = this.nameToColorClass(clean);
      if (colorClass) classes.push(colorClass);
      else classes.push("unknown-name");
      if (dayIso && this.isOnVacation(clean, dayIso)) classes.push("on-leave");
      const title = `${this.escapeHtml(clean)} - ${this.escapeHtml(dayLabel)}, ${this.escapeHtml(timeLabel)}`;
      return `<span class="${classes.join(" ")}" title="${title}" role="button" tabindex="0" aria-label="${title}">${this.escapeHtml(clean)}</span>`;
    }).join("");
  },

  renderGuardButtons() {
    const names = this.allEmployeeNames();
    const selected = new Set((this.state.priorityGuards || []).map((n) => this.normalizeKey(n)));
    this.el.guardButtonsContainer.innerHTML = "";
    names.forEach((name) => {
      const clean = this.normalizeKey(name);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "guard-btn";
      btn.textContent = name;
      btn.dataset.name = clean;
      btn.setAttribute("aria-pressed", selected.has(clean) ? "true" : "false");
      if (selected.has(clean)) btn.classList.add("active");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const set = new Set((this.state.priorityGuards || []).map((n) => this.normalizeKey(n)));
        if (set.has(clean)) set.delete(clean);
        else set.add(clean);
        this.state.priorityGuards = Array.from(set);
        const on = set.has(clean);
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        if (set.size && this.el.autoMode?.value === "balanced") {
          this.el.autoMode.value = "priority";
          this.showStatus("מצב הסידור הועבר ל«עדיפות לשומרים מסומנים».", "success");
        }
        this.persistFullState();
      });
      this.el.guardButtonsContainer.appendChild(btn);
    });
  },

  getPriorityGuardSet() {
    return new Set((this.state.priorityGuards || []).map((n) => this.normalizeKey(n)).filter(Boolean));
  },

  renderApp(state) {
    if (this.state.isRenderingFromStore) return;
    this.state.isRenderingFromStore = true;
    try {
      if (Array.isArray(state.availabilityMatrix) && state.availabilityMatrix.length) {
        this.state.availabilityMatrix = state.availabilityMatrix.map((row) => [...row]);
        try { this.ExcelGrid?.render?.(); } catch {}
      }
      if (Array.isArray(state.excelMatrix) && state.excelMatrix.length) {
        this.state.excelMatrix = state.excelMatrix.map((row) => [...row]);
      }
      if (typeof state.lockedName !== "undefined") this.state.lockedName = state.lockedName;
      // Never wipe a visible date with an empty store value.
      if (typeof state.startDate === "string" && state.startDate && this.el.startDate && this.el.startDate.value !== state.startDate) {
        this.el.startDate.value = state.startDate;
        this.updateStartDateLabelBySetting();
      }
      if (typeof state.searchQuery === "string" && this.el.guardSearchInput && this.el.guardSearchInput.value !== state.searchQuery) {
        this.el.guardSearchInput.value = state.searchQuery;
      }
      if (state.parsedData) this.renderScheduleView(state.parsedData);
      else if (this.el.resultsContainer) this.el.resultsContainer.innerHTML = `<p id="initialMessage">לחץ על «משוך וסדר» או הדבק זמינות לטבלה ולחץ «סדר מחדש».</p>`;
      this.updateHighlights(state.lockedName);
      this.updateSearchHighlights();
    } finally {
      this.state.isRenderingFromStore = false;
    }
  },

  setupScheduleEditors() {
    this.el.resultsContainer.querySelectorAll('td[contenteditable="plaintext-only"]').forEach((td) => {
      if (td.dataset.bound === "1") return;
      td.dataset.bound = "1";
      td.addEventListener("dblclick", () => this.startCellEditing(td));
      td.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && td.dataset.editing === "1") {
          e.preventDefault();
          this.finishCellEditing(td);
          td.blur();
        }
      });
      td.addEventListener("blur", () => this.finishCellEditing(td));
    });
  },
};

window.ShiftSchedulerApp = App;
Store.subscribe((state) => App.renderApp(state));
document.addEventListener("DOMContentLoaded", () => App.init());

window.GleanBridge = window.GleanBridge || { postMessage() {}, onMessage() {} };
window.GleanBridge.postMessage({
  actionId: "export-pdf",
  type: "glean-add-menu",
  metadata: { label: "Export as PDF", icon: "export" },
});
window.GleanBridge.onMessage("action", function(data) {
  if (data.actionId === "export-pdf") window.print();
});
