export function renderExcelGrid(app) {
  const table = app.el["excel-grid"];
  if (!table) return;
  const dayShort = app.state.expectedDays.map((day) => day.replace("יום ", ""));
  let html = `<colgroup><col class="time-col">${dayShort.map(() => `<col>`).join("")}</colgroup>`;
  html += `<thead><tr><th class="time-col time-slot" scope="col">שעות / יום</th>`;
  dayShort.forEach((day) => { html += `<th scope="col">${app.escapeHtml(day)}</th>`; });
  html += "</tr></thead><tbody>";

  app.C.TIME_SLOTS.forEach((slot, r) => {
    const time = slot.split("(")[0].trim();
    html += `<tr><td class="time-col time-slot">${app.escapeHtml(time)}</td>`;
    app.state.expectedDays.forEach((_, c) => {
      html += `<td class="cell" contenteditable="plaintext-only" data-r="${r}" data-c="${c}">${app.escapeHtml(app.state.availabilityMatrix[r]?.[c] || "")}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody>";
  table.innerHTML = html;
}
