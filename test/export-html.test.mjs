import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Window } from "happy-dom";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("exported HTML shell renders schedule table in mobile WebView-like viewport", () => {
  const exportSrc = readFileSync(join(root, "features/export-html.js"), "utf8");
  const indexHtml = readFileSync(join(root, "index.html"), "utf8");
  const styleMatch = indexHtml.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(styleMatch, "index.html style block");
  const baseStyle = styleMatch[1];

  const extraStart = exportSrc.indexOf("const exportExtraStyle = `") + "const exportExtraStyle = `".length;
  const extraEnd = exportSrc.indexOf("`;", extraStart);
  const exportExtraStyle = exportSrc.slice(extraStart, extraEnd);

  const tableHtml = `<table id="scheduleTable" class="schedule-table" role="table">
    <thead><tr><th>שעות</th><th>א</th></tr></thead>
    <tbody><tr><td class="time-slot">08:00</td><td><span class="person">חברוני</span></td></tr></tbody>
  </table>`;

  const body = `<div class="app-shell"><div class="hero">טבלה</div>
    <div class="card results-shell"><div class="export-schedule-wrap">${tableHtml}</div></div></div>`;

  const html = `<!DOCTYPE html><html lang="he" dir="rtl" class="html-export"><head>
    <meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
    <style>${baseStyle}${exportExtraStyle}</style></head><body>${body}</body></html>`;

  const window = new Window({ innerWidth: 390, innerHeight: 844 });
  window.document.write(html);
  window.document.close();

  const table = window.document.getElementById("scheduleTable");
  assert.ok(table, "schedule table in DOM");
  const th = table.querySelector("thead th");
  const person = table.querySelector(".person");
  assert.ok(th, "header cell");
  assert.ok(person, "person bubble");
  assert.match(person.textContent, /חברוני/);

  const wrap = window.document.querySelector(".export-schedule-wrap");
  assert.ok(wrap, "schedule wrap");
  assert.ok(wrap.innerHTML.includes("scheduleTable"), "table markup inside wrap");
  assert.doesNotMatch(exportExtraStyle, /flex:1;min-height:0/, "export avoids flex collapse layout");
});
