#ui/excel-grid-view.js
import { TIME_SLOTS, HEB_DAYS } from "../core/constants.js";

export function renderGrid(matrix) {
  const container = document.getElementById("excel-grid");

  let html = "<table>";

  html += "<tr><th>שעה</th>";
  HEB_DAYS.forEach(d => html += `<th>${d}</th>`);
  html += "</tr>";

  TIME_SLOTS.forEach((slot, r) => {
    html += `<tr><td>${slot}</td>`;
    HEB_DAYS.forEach((_, c) => {
      html += `
        <td contenteditable="plaintext-only" data-r="${r}" data-c="${c}">
          ${matrix[r][c] || ""}
        </td>
      `;
    });
    html += "</tr>";
  });

  html += "</table>";

  container.innerHTML = html;
}
