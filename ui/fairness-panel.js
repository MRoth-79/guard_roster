export function renderFairnessPanel(parsed, insights) {
  if (parsed.error) {
    this.el.fairnessContent.innerHTML = `<div class="empty-state">אין נתונים תקינים להצגת פאנל הוגנות.</div>`;
    return;
  }

  const fair = this.buildFairnessData(parsed, insights);
  const employeeRows = fair.employees.map((emp) => `
    <tr>
      <td><strong>${this.escapeHtml(emp.name)}</strong></td>
      <td>${emp.count}</td>
      <td>${emp.nights}</td>
      <td>${emp.leaveDays}</td>
      <td><span class="pill ${emp.status.cls}">${this.escapeHtml(emp.status.text)}</span></td>
      <td><ul class="reason-list">${emp.reasons.map((r) => `<li>${this.escapeHtml(r)}</li>`).join("")}</ul></td>
    </tr>
  `).join("");

  const cellRows = fair.cells.length
    ? fair.cells.map((cell) => `
      <tr>
        <td>${this.escapeHtml(cell.day)}</td>
        <td>${this.escapeHtml(cell.date)}</td>
        <td>${this.escapeHtml(cell.slot)}</td>
        <td>${this.escapeHtml(cell.assigned)}</td>
        <td>${cell.required}</td>
        <td><ul class="reason-list">${cell.reasons.map((r) => `<li>${this.escapeHtml(r)}</li>`).join("")}</ul></td>
      </tr>
    `).join("")
    : `<tr><td colspan="6" class="empty-state">אין תאים מסומנים כרגע.</td></tr>`;

  this.el.fairnessContent.innerHTML = `
    <div class="fairness-summary">
      <div class="fairness-card"><span class="label">עובדים מאוזנים</span><span class="value">${fair.summary.balanced}</span></div>
      <div class="fairness-card"><span class="label">עובדים שדורשים תשומת לב</span><span class="value">${fair.summary.attention}</span></div>
      <div class="fairness-card"><span class="label">עובדים בלי שיבוץ</span><span class="value">${fair.summary.zeroAssigned}</span></div>
      <div class="fairness-card"><span class="label">תאים מסומנים עם הסבר</span><span class="value">${fair.summary.markedCells}</span></div>
    </div>
    <div class="fairness-layout">
      <section class="fairness-section">
        <h3>הוגנות עובדים — למה כל עובד מסומן</h3>
        <div class="fairness-table-wrap">
          <table class="fairness-table">
            <thead><tr><th>עובד</th><th>סה"כ</th><th>02–06</th><th>ימי חופשה</th><th>סטטוס</th><th>הסבר</th></tr></thead>
            <tbody>${employeeRows}</tbody>
          </table>
        </div>
      </section>
      <section class="fairness-section">
        <h3>תאים מסומנים — למה כל תא קיבל סימון</h3>
        <div class="fairness-table-wrap">
          <table class="fairness-table">
            <thead><tr><th>יום</th><th>תאריך</th><th>משמרת</th><th>שובצו</th><th>נדרש</th><th>הסבר</th></tr></thead>
            <tbody>${cellRows}</tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

