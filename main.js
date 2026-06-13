import {
  DEFAULT_WEB_APP_URL,
  STORAGE_KEYS,
  RULES,
  SHEET_URL,
  SHIFT_INDEX,
  HEB_DAYS,
  TIME_SLOTS,
  SLOT_ICONS,
  COLOR_MAP,
} from "./core/constants.js";
import { createStore } from "./core/store.js";
import { makeSnapshot, applySnapshot, persistFullState, restoreFullState } from "./core/state-sync.js";
import { normalizeKey, splitCellNames, escapeHtml, aggressiveClean } from "./utils/text.js";
import { getWeekStartSetting, computeExpectedDays, initializeData, getHebDayNameFromIso, updateStartDateLabelBySetting, getDatesForWeek, getIsoDatesForWeek } from "./utils/dates.js";
import { allEmployeeNames, getScheduledEmployeeNames, nameToColorClass } from "./utils/names.js";
import { cx, insertPlainTextAtCursor, placeCaretAtEnd } from "./utils/dom.js";
import { cacheDom, bindEvents } from "./ui/layout.js";
import { bindToolbar } from "./ui/toolbar.js";
import { showStatus } from "./ui/status-banner.js";
import { createExcelGrid, syncRenderedTableBackToMatrix, refreshAfterDataChange } from "./features/grid.js";
import { nextAllowedSameDayAfter, isLessThan8SameDay, parseScheduleText, serializeMatrixToVerticalText, calculateScheduleInsights, buildDashboardSummary, getCellReasonParts, buildFairnessData } from "./features/analysis.js";
import { renderFairnessPanel } from "./ui/fairness-panel.js";
import { renderSummaryBar, renderCellBadges, renderTimeSlotCell, renderScheduleHeader, renderScheduleRow, renderExceptionsTable, renderSummaryTable, renderMainScheduleTable, renderScheduleView } from "./ui/schedule-view.js";
import { updateHighlights, updateSearchHighlights, focusSearchMatch, navigateSearch } from "./features/search.js";
import { getShiftReqStorageKey, loadShiftRequirements, saveShiftRequirements, getRequiredPerShift, buildShiftReqPanel } from "./features/shift-requirements.js";
import { getVacationStorageKey, loadVacationsMap, saveVacationsMap, isOnVacation, buildWeeklyOnLeaveSet, buildVacationsPanel } from "./features/vacations.js";
import { pushUndoSnapshot, updateUndoRedoButtons, undo, redo } from "./features/undo-redo.js";
import { fetchFromGoogleSheet } from "./features/google-sheet.js";
import { autoSchedule as runAutoSchedule } from "./features/auto-scheduler.js";
import { downloadHtmlTable } from "./features/export-html.js";

const Store = createStore();

const App = {
  C: {
    DEFAULT_WEB_APP_URL,
    STORAGE_KEYS,
    RULES,
    SHEET_URL,
    SHIFT_INDEX,
    HEB_DAYS,
    TIME_SLOTS,
    SLOT_ICONS,
    COLOR_MAP,
  },
  Store,
  state: {
    expectedDays: [],
    excelMatrix: [],
    lockedName: null,
    statusTimer: null,
    isRestoring: false,
    isRenderingFromStore: false,
    undoStack: [],
    redoStack: [],
    searchMatches: [],
    currentSearchIndex: -1,
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
  getHebDayNameFromIso,
  updateStartDateLabelBySetting,
  getDatesForWeek,
  getIsoDatesForWeek,
  allEmployeeNames,
  getScheduledEmployeeNames,
  nameToColorClass,
  cx,
  insertPlainTextAtCursor,
  placeCaretAtEnd,
  syncRenderedTableBackToMatrix,
  refreshAfterDataChange,
  nextAllowedSameDayAfter,
  isLessThan8SameDay,
  parseScheduleText,
  serializeMatrixToVerticalText,
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
  autoSchedule() {
    console.log("auto clicked");
    return runAutoSchedule(this);
  },

  downloadHtmlTable,

  init() {
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
    this.restoreFullState();
    this.updateStartDateLabelBySetting();

    this.Store.setState({
      excelMatrix: this.state.excelMatrix,
      startDate: this.el.startDate.value,
      lockedName: this.state.lockedName,
      searchQuery: this.el.guardSearchInput.value,
    });

    this.updateUndoRedoButtons();
    this.updateSearchHighlights();
    if (this.serializeMatrixToVerticalText().trim()) this.handleAnalyze();
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
    this.persistFullState();
  },

  convertEditableCellToBubbles(cell, fallbackTime = "") {
    const raw = String(cell.innerText || "").replace(/בעיה!?/g, "").replace(/משבצת\s*ריקה/g, "");
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
    this.el.guardButtonsContainer.innerHTML = "";
    names.forEach((name) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "guard-btn";
      btn.textContent = name;
      btn.addEventListener("click", () => {
        this.pushUndoSnapshot();
        btn.classList.toggle("active");
        this.persistFullState();
      });
      this.el.guardButtonsContainer.appendChild(btn);
    });
  },

  getPriorityGuardSet() {
    return new Set(Array.from(this.el.guardButtonsContainer.querySelectorAll(".guard-btn.active")).map((btn) => this.normalizeKey(btn.textContent)).filter(Boolean));
  },

  renderApp(state) {
    if (this.state.isRenderingFromStore) return;
    this.state.isRenderingFromStore = true;
    try {
      if (Array.isArray(state.excelMatrix) && state.excelMatrix.length) {
        this.state.excelMatrix = state.excelMatrix.map((row) => [...row]);
      }
      if (typeof state.lockedName !== "undefined") this.state.lockedName = state.lockedName;
      if (typeof state.startDate === "string" && this.el.startDate && this.el.startDate.value !== state.startDate) {
        this.el.startDate.value = state.startDate;
        this.updateStartDateLabelBySetting();
      }
      if (typeof state.searchQuery === "string" && this.el.guardSearchInput && this.el.guardSearchInput.value !== state.searchQuery) {
        this.el.guardSearchInput.value = state.searchQuery;
      }
      if (state.parsedData) this.renderScheduleView(state.parsedData);
      else if (this.el.resultsContainer) this.el.resultsContainer.innerHTML = `<p id="initialMessage">הדבק נתונים או משוך אותם מה‑Web App, ואז לחץ על ניתוח או סידור אוטומטי.</p>`;
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
