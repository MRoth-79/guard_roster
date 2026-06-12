export function renderExcelGrid(app) {
  const table = app.el["excel-grid"];
  const dayShort = app.state.expectedDays.map((day) => day.replace("יום ", ""));
  let html = "<thead><tr><th>שעות / יום</th>";
  dayShort.forEach((day) => { html += `<th>${app.escapeHtml(day)}</th>`; });
  html += "</tr></thead><tbody>";

  app.C.TIME_SLOTS.forEach((slot, r) => {
    const time = slot.split("(")[0].trim();
    html += `<tr><td>${app.escapeHtml(time)}</td>`;
    app.state.expectedDays.forEach((_, c) => {
      html += `<td class="cell" contenteditable="plaintext-only" data-r="${r}" data-c="${c}">${app.escapeHtml(app.state.excelMatrix[r]?.[c] || "")}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody>";
  table.innerHTML = html;
}
