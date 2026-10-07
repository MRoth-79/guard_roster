import test from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

const REQUIRED_IDS = [
  "startDate", "startDateLabel", "googleSheetUrl", "fetchStatus", "guardButtonsContainer",
  "quickFetchButton", "autoScheduleButton", "saveToCloudButton", "loadFromCloudButton",
  "downloadHtmlButton", "openSheetButton", "btnExcelUpdate", "btnExcelClear",
  "openShiftReqBtn", "shiftReqPanel", "shiftReqClose", "shiftReqScopeWeek",
  "weekStartSelect", "shiftReqGrid", "statusBanner", "resultsContainer",
  "excel-grid", "toggleGuardPickerButton", "guardPickerPanel",
  "toggleUrlButton", "urlInputWrap", "autoMode",
];

function installBrowserGlobals(window) {
  const g = globalThis;
  g.window = window;
  g.document = window.document;
  g.localStorage = window.localStorage;
  g.sessionStorage = window.sessionStorage;
  g.HTMLElement = window.HTMLElement;
  g.Node = window.Node;
  g.Element = window.Element;
  g.Event = window.Event;
  g.CustomEvent = window.CustomEvent;
  g.getComputedStyle = window.getComputedStyle.bind(window);
  g.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  g.cancelAnimationFrame = clearTimeout;
}

function buildMinimalDom(document) {
  const body = document.body;
  for (const id of REQUIRED_IDS) {
    const el = document.createElement(id === "startDate" ? "input" : "div");
    el.id = id;
    if (id === "startDate") el.type = "date";
    if (id === "shiftReqScopeWeek") {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      body.appendChild(input);
      continue;
    }
    if (id === "weekStartSelect" || id === "autoMode") {
      const select = document.createElement("select");
      select.id = id;
      body.appendChild(select);
      continue;
    }
    if (id === "excel-grid") {
      const table = document.createElement("table");
      table.id = id;
      body.appendChild(table);
      continue;
    }
    body.appendChild(el);
  }
}

test("auto init renders 42 availability input cells without manual init", async () => {
  const window = new Window({ url: "http://localhost/" });
  installBrowserGlobals(window);
  buildMinimalDom(window.document);

  await import("../main.js");

  const cells = window.document.querySelectorAll("#excel-grid td.cell");
  assert.equal(cells.length, 42, "expected 6 shifts x 7 days availability cells");
  assert.equal(window.document.body.dataset.appReady, "1");
});
