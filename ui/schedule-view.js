export function renderSummaryBar(summary) {
  return `
    <div class="summary-bar">
      <div class="summary-card is-empty"><span class="label">תאים ריקים / חסרים</span><span class="value">${summary.emptyCells + summary.underfilled}</span></div>
      <div class="summary-card is-exceptions"><span class="label">סה״כ חריגות</span><span class="value">${summary.exceptions}</span></div>
      <div class="summary-card is-under"><span class="label">עובדים מתחת למינימום</span><span class="value">${summary.underMinimumEmployees}</span></div>
      <div class="summary-card is-nights"><span class="label">חריגות לילה 02–06</span><span class="value">${summary.nightViolations}</span></div>
    </div>
  `;
}

export function renderCellBadges(day, slot, names, required, dayIso, cellFlags) {
  const badges = [];
  if (!names.length) badges.push(`<span class="badge empty">ריק</span>`);
  else if (names.length < required) badges.push(`<span class="badge short">חסר</span>`);
  else if (names.length > required) badges.push(`<span class="badge extra">עודף</span>`);
  if (names.some((name) => this.isOnVacation(name, dayIso))) badges.push(`<span class="badge leave">חופשה</span>`);
  const key = `${day}__${slot}`;
  if (cellFlags[key]?.has("rest")) badges.push(`<span class="badge rest">מנוחה</span>`);
  return badges.length ? `<div class="cell-badges">${badges.join("")}</div>` : "";
}

export function renderTimeSlotCell(rowIdx, timeDisplay) {
  const icon = this.C.SLOT_ICONS[rowIdx] || "😂";
  return `<th scope="row" class="time-slot"><div class="time-slot-wrap"><span class="time-slot-icon">${icon}</span><span>${timeDisplay}</span></div></th>`;
}

export function renderScheduleHeader(days, datesForWeek) {
  let html = `<colgroup><col class="time-col">${days.map(() => `<col>`).join("")}</colgroup>`;
  html += `<thead><tr><th scope="col" rowspan="2">שעות / יום</th>`;
  days.forEach((day, idx) => {
    const weekendClass = day.includes("שישי") ? "friday-col" : day.includes("שבת") ? "saturday-col" : "";
    html += `<th scope="col" class="${weekendClass}"><span class="date-text">${datesForWeek[idx]}</span></th>`;
  });
  html += `</tr><tr>`;
  days.forEach((day) => {
    const weekendClass = day.includes("שישי") ? "friday-col" : day.includes("שבת") ? "saturday-col" : "";
    const dayDisplay = this.getWeekStartSetting() === "mon" && day === "יום ראשון" ? "יום ראשון" : day.replace("יום ", "");
    html += `<th scope="col" class="${weekendClass}"><span class="day-header-name">${this.escapeHtml(dayDisplay)}</span></th>`;
  });
  html += `</tr></thead>`;
  return html;
}

export function renderScheduleRow(row, rowIdx, days, isoDates, cellFlags) {
  const timeFull = this.C.TIME_SLOTS[rowIdx];
  const slot = timeFull.replace(" (Night)", "");
  const timeDisplay = slot.replace(" - ", "<br>");
  const required = this.getRequiredPerShift(rowIdx);
  let html = `<tr>${this.renderTimeSlotCell(rowIdx, timeDisplay)}`;
  row.forEach((cell, colIdx) => {
    const day = days[colIdx];
    const names = this.splitCellNames(cell || "");
    const weekendClass = day.includes("שישי") ? "friday-col" : day.includes("שבת") ? "saturday-col" : "";
    const bubbles = this.renderPersonBubbles(names, day, slot, isoDates[colIdx]);
    const badges = this.renderCellBadges(day, slot, names, required, isoDates[colIdx], cellFlags);
    const reasons = this.getCellReasonParts(day, slot, names, required, isoDates[colIdx], cellFlags);
    const title = reasons.length ? this.escapeHtml(reasons.map((r) => `• ${r}`).join(" | ")) : "";
    html += `<td class="${this.cx(weekendClass)}" data-day="${this.escapeHtml(day)}" data-time="${this.escapeHtml(slot)}" title="${title}" contenteditable="plaintext-only">${bubbles}${badges}</td>`;
  });
  html += `</tr>`;
  return html;
}

export function renderExceptionsTable(exceptions) {
  let html = `<h3>⚠️ ריכוז חריגות ואזהרות</h3>`;
  html += `<table class="exceptions-table"><thead><tr><th>יום</th><th>משמרת</th><th>עובד</th><th>פירוט החריגה</th></tr></thead><tbody>`;
  if (!exceptions.length) html += `<tr><td colspan="4">אין חריגות בסידור! ✅</td></tr>`;
  else exceptions.forEach((ex) => { html += `<tr><td>${this.escapeHtml(ex.day)}</td><td>${this.escapeHtml(ex.slot)}</td><td><b>${this.escapeHtml(ex.name)}</b></td><td>${this.escapeHtml(ex.msg)}</td></tr>`; });
  html += `</tbody></table>`;
  return html;
}

export function renderSummaryTable(allShifts, night2to6Count) {
  let html = `<h3>סיכום הופעות (רק מי שמשובץ השבוע)</h3>`;
  html += `<table class="summary-table"><thead><tr><th>מס'</th><th>שם העובד</th><th>סה"כ הופעות</th><th>משמרות 02–06</th><th>סטטוס</th></tr></thead><tbody>`;
  const sortedNames = this.getScheduledEmployeeNames(allShifts);
  if (!sortedNames.length) {
    html += `<tr><td colspan="5">אין עובדים משובצים השבוע.</td></tr>`;
  } else {
    let serial = 1;
    sortedNames.forEach((name) => {
      const count = allShifts[name] || 0;
      const nights = night2to6Count[name] || 0;
      let rowClass = "";
      let status = "";
      if (count >= this.C.RULES.MAX_ALLOWED) { rowClass = "shifts-5-count"; status = `✅ עמד (${count})`; }
      else if (count === 4) { rowClass = "shifts-4-count"; status = "✅ עמד (4)"; }
      else if (count === 3) { rowClass = "shifts-3-count"; status = "🆗 עמד (3)"; }
      else { rowClass = "low-shifts"; status = `❌ פחות מ־3 (${count})`; }
      if (nights > this.C.RULES.MAX_NIGHT_2_6) rowClass += " night-limit-fail-row";
      html += `<tr class="${rowClass}"><td>${serial++}</td><td>${this.escapeHtml(name)}</td><td>${count}</td><td>${nights > this.C.RULES.MAX_NIGHT_2_6 ? `<span class="night-limit-fail">❌ ${nights}</span>` : `<span class="night-limit-ok">✅ ${nights}</span>`}</td><td>${status}</td></tr>`;
    });
  }
  html += `</tbody></table>`;
  return html;
}

export function renderMainScheduleTable(parsed, datesForWeek, isoDates, cellFlags) {
  let html = `<table id="scheduleTable" class="schedule-table" role="table">`;
  html += this.renderScheduleHeader(parsed.days, datesForWeek);
  html += `<tbody>`;
  parsed.data.forEach((row, rowIdx) => { html += this.renderScheduleRow(row, rowIdx, parsed.days, isoDates, cellFlags); });
  html += `</tbody></table>`;
  return html;
}

export function renderScheduleView(parsed) {
  if (!parsed) {
    this.el.resultsContainer.innerHTML = `<p id="initialMessage">הדבק נתונים או משוך אותם מה‑Web App, ואז לחץ על ניתוח או סידור אוטומטי.</p>`;
    this.el.fairnessContent.innerHTML = `בצע ניתוח כדי לראות הסבר למה כל תא/עובד מסומן.`;
    return;
  }
  if (parsed.error) {
    this.el.resultsContainer.innerHTML = `<p class="warning-text">❌ ${this.escapeHtml(parsed.error)}</p>`;
    this.el.fairnessContent.innerHTML = `<div class="empty-state">אין נתונים תקינים להצגת פאנל הוגנות.</div>`;
    return;
  }
  if (!this.el.startDate.value) {
    this.el.resultsContainer.innerHTML = `<p class="warning-text">❌ אנא בחר תאריך תחילת שבוע.</p>`;
    this.el.fairnessContent.innerHTML = `<div class="empty-state">בחר תאריך תחילת שבוע.</div>`;
    return;
  }

  const datesForWeek = this.getDatesForWeek(this.el.startDate.value);
  const isoDates = this.getIsoDatesForWeek(this.el.startDate.value);
  const insights = this.calculateScheduleInsights(parsed.data, parsed.days);
  const dashboard = this.buildDashboardSummary(parsed, insights);
  const doubleShifts = this.C.TIME_SLOTS
    .map((slot, idx) => ({ idx, label: slot.replace(" (Night)", "") }))
    .filter((entry) => this.getRequiredPerShift(entry.idx) === 2)
    .map((entry) => entry.label.replace(" - ", "–"))
    .join(", ");

  let html = `<h3>טבלת משמרות</h3>`;
  html += this.renderSummaryBar(dashboard);
  html += `<div class="results-info">${doubleShifts ? `משמרות עם 2 שומרים: ${doubleShifts}.` : "כל המשמרות = 1 שומר."} מינימום ${this.C.RULES.MIN_REQUIRED} לעובד.</div>`;
  html += this.renderMainScheduleTable(parsed, datesForWeek, isoDates, insights.cellFlags);
  html += this.renderExceptionsTable(insights.exceptions);
  html += this.renderSummaryTable(insights.allShifts, insights.night2to6Count);

  this.el.resultsContainer.innerHTML = html;
  this.renderFairnessPanel(parsed, insights);
  this.setupScheduleEditors();
  this.updateHighlights(this.state.lockedName);
}

