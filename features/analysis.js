export function hoursBetweenShifts(prevDayIdx, prevShiftIdx, nextDayIdx, nextShiftIdx) {
  const bounds = this.C.SHIFT_HOUR_BOUNDS;
  const prev = bounds[prevShiftIdx];
  const next = bounds[nextShiftIdx];
  if (!prev || !next) return -Infinity;
  const prevEnd = Number(prevDayIdx) * 24 + prev.end;
  const nextStart = Number(nextDayIdx) * 24 + next.start;
  return nextStart - prevEnd;
}

export function hasMinRestBetween(prevDayIdx, prevShiftIdx, nextDayIdx, nextShiftIdx, minHours) {
  const min = Number(minHours ?? this.C.RULES.MIN_REST_HOURS ?? 8);
  return this.hoursBetweenShifts(prevDayIdx, prevShiftIdx, nextDayIdx, nextShiftIdx) >= min;
}

export function nextAllowedSameDayAfter(index) {
  // Derived from MIN_REST_HOURS against same-day later slots.
  for (let next = index + 1; next < this.C.TIME_SLOTS.length; next++) {
    if (this.hasMinRestBetween(0, index, 0, next)) return next;
  }
  return Infinity;
}

export function isLessThan8SameDay(prevIdx, curIdx) {
  return !this.hasMinRestBetween(0, prevIdx, 0, curIdx);
}

export function parseScheduleText(text) {
  const lines = String(text || "").split(/\r?\n|\r/);
  const rawDayData = {};
  let currentDay = null;

  lines.forEach((line) => {
    const cleaned = this.aggressiveClean(line);
    if (!cleaned) return;
    const dayMatch = this.state.expectedDays.find((day) => cleaned === day || cleaned.startsWith(day));
    if (dayMatch) {
      currentDay = dayMatch;
      rawDayData[currentDay] = [];
      return;
    }
    if (!currentDay) return;
    const parts = cleaned.split(/\s{2,}|\t/).map((x) => x.trim()).filter(Boolean);
    if (!parts.length) return;
    const timePart = parts[0];
    const isTime = this.C.TIME_SLOTS.some((slot) => timePart.startsWith(slot.split("(")[0].trim()));
    if (isTime) rawDayData[currentDay].push(parts.slice(1).join(","));
  });

  if (!Object.keys(rawDayData).length) {
    return { error: "לא נמצאו נתונים תקינים. ודא שהטקסט מתחיל ביום תקין." };
  }

  const matrix = [];
  for (let row = 0; row < this.C.TIME_SLOTS.length; row++) {
    const rowData = [];
    for (let col = 0; col < this.state.expectedDays.length; col++) {
      const day = this.state.expectedDays[col];
      const dayShifts = rawDayData[day];
      if (!dayShifts) return { error: `שגיאה: היום ${day} חסר.` };
      if (dayShifts.length !== this.C.TIME_SLOTS.length) {
        return { error: `שגיאה ביום ${day}: נמצאו ${dayShifts.length} משמרות במקום ${this.C.TIME_SLOTS.length}.` };
      }
      rowData.push(dayShifts[row]);
    }
    matrix.push(rowData);
  }
  return { days: this.state.expectedDays, data: matrix };
}

export function serializeMatrixToVerticalText() {
  let out = "";
  this.state.expectedDays.forEach((day, dayIndex) => {
    out += `${day}\n`;
    this.C.TIME_SLOTS.forEach((slot, rowIndex) => {
      const time = slot.split("(")[0].trim();
      const cell = this.state.excelMatrix[rowIndex]?.[dayIndex] || "";
      out += `${time}\t${cell}\n`;
    });
    out += "\n";
  });
  return out.trim();
}

export function calculateScheduleInsights(scheduleData, days) {
  const I = this.C.SHIFT_INDEX;
  const allShifts = {};
  const night2to6Count = {};
  const exceptions = [];
  const cellFlags = {};
  const assignmentsByName = {};

  const markCellFlag = (day, slot, flag) => {
    const key = `${day}__${slot}`;
    cellFlags[key] ||= new Set();
    cellFlags[key].add(flag);
  };

  scheduleData.forEach((row, rowIdx) => {
    row.forEach((cell, colIdx) => {
      const day = days[colIdx];
      const names = this.splitCellNames(cell || "");

      names.forEach((name) => {
        allShifts[name] = (allShifts[name] || 0) + 1;
        assignmentsByName[name] ||= [];
        assignmentsByName[name].push({ dayIdx: colIdx, shiftIdx: rowIdx, day, slot: this.C.TIME_SLOTS[rowIdx] });

        if (rowIdx === I.NIGHT_2_6) {
          night2to6Count[name] = (night2to6Count[name] || 0) + 1;
          if (night2to6Count[name] > this.C.RULES.MAX_NIGHT_2_6) {
            exceptions.push({ day: "סיכום שבועי", slot: "02:00 - 06:00", name, msg: `חריגה: ${night2to6Count[name]} לילות (מקסימום ${this.C.RULES.MAX_NIGHT_2_6})` });
          }
        }
      });
    });
  });

  // Rest rule: warn on < MIN_REST_HOURS between consecutive assignments.
  // Manual edits are allowed — we only flag, never block.
  Object.entries(assignmentsByName).forEach(([name, list]) => {
    list.sort((a, b) => (a.dayIdx - b.dayIdx) || (a.shiftIdx - b.shiftIdx));
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const cur = list[i];
      if (this.hasMinRestBetween(prev.dayIdx, prev.shiftIdx, cur.dayIdx, cur.shiftIdx)) continue;
      const hours = this.hoursBetweenShifts(prev.dayIdx, prev.shiftIdx, cur.dayIdx, cur.shiftIdx);
      const sameDay = prev.dayIdx === cur.dayIdx;
      const msg = sameDay
        ? `פחות מ־${this.C.RULES.MIN_REST_HOURS} שעות בין משמרות באותו יום (${hours} שע׳)`
        : `פחות מ־${this.C.RULES.MIN_REST_HOURS} שעות בין משמרות רצופות (${hours} שע׳)`;
      exceptions.push({ day: cur.day, slot: cur.slot, name, msg });
      markCellFlag(cur.day, cur.slot.replace(" (Night)", ""), "rest");
    }
  });

  return { allShifts, night2to6Count, exceptions, cellFlags };
}

export function buildDashboardSummary(parsed, insights) {
  let emptyCells = 0;
  let underfilled = 0;
  parsed.data.forEach((row, rowIdx) => {
    row.forEach((cell) => {
      const names = this.splitCellNames(cell || "");
      const required = this.getRequiredPerShift(rowIdx);
      if (names.length === 0) emptyCells += 1;
      else if (names.length < required) underfilled += 1;
    });
  });

  const underMinimumEmployees = this.allEmployeeNames().filter((name) => (insights.allShifts[name] || 0) < this.C.RULES.MIN_REQUIRED).length;
  const nightViolations = this.allEmployeeNames().filter((name) => (insights.night2to6Count[name] || 0) > this.C.RULES.MAX_NIGHT_2_6).length;
  return { emptyCells, exceptions: insights.exceptions.length, underMinimumEmployees, nightViolations, underfilled };
}

export function getCellReasonParts(day, slot, names, required, dayIso, cellFlags) {
  const reasons = [];
  const leaveNames = names.filter((name) => this.isOnVacation(name, dayIso));
  if (names.length && names.length < required) reasons.push(`חסרים ${required - names.length} שומרים (שובצו ${names.length} מתוך ${required}).`);
  else if (names.length > required) reasons.push(`יש עודף של ${names.length - required} שומרים (נדרשים ${required}).`);
  if (leaveNames.length) reasons.push(`מסומנים בחופשה/מילואים: ${leaveNames.join(", ")}.`);
  const key = `${day}__${slot}`;
  if (cellFlags[key]?.has("rest")) reasons.push("קיימת התנגשות עם כלל ההפרש המינימלי בין משמרות במשבצת הזאת.");
  return reasons;
}

export function buildFairnessData(parsed, insights) {
  const isoDates = this.getIsoDatesForWeek(this.el.startDate.value);
  const employees = this.allEmployeeNames().map((name) => {
    const count = insights.allShifts[name] || 0;
    const nights = insights.night2to6Count[name] || 0;
    const leaveDays = isoDates.filter((iso) => this.isOnVacation(name, iso)).length;
    const reasons = [];
    let status = { cls: "ok", text: "מאוזן" };

    if (count === 0) {
      status = { cls: "bad", text: "לא שובץ" };
      reasons.push(leaveDays ? `לא שובץ השבוע. קיימים ${leaveDays} ימי חופשה/מילואים.` : "לא שובץ בכלל השבוע.");
    } else {
      if (count < this.C.RULES.MIN_REQUIRED) {
        status = { cls: "bad", text: "פחות מדי" };
        reasons.push(`פחות מהמינימום: ${count} משמרות מתוך ${this.C.RULES.MIN_REQUIRED}.`);
      } else if (count > this.C.RULES.MAX_ALLOWED) {
        status = { cls: "bad", text: "יותר מדי" };
        reasons.push(`מעל המקסימום: ${count} משמרות מתוך ${this.C.RULES.MAX_ALLOWED}.`);
      } else if (count === this.C.RULES.MIN_REQUIRED) {
        status = { cls: "warn", text: "בדיוק מינימום" };
        reasons.push(`שובץ בדיוק על סף המינימום (${count}).`);
      } else {
        reasons.push(`כמות המשמרות בטווח תקין (${count}).`);
      }
    }

    if (nights > this.C.RULES.MAX_NIGHT_2_6) {
      status = { cls: "bad", text: "חריגת לילות" };
      reasons.push(`חריגה בלילות 02–06: שובץ ${nights} פעמים.`);
    } else if (nights === this.C.RULES.MAX_NIGHT_2_6 && count > 0) {
      reasons.push(`הגיע לתקרת לילות 02–06 (${nights}).`);
    }

    if (leaveDays > 0) reasons.push(`חופשה/מילואים ב-${leaveDays} ימים מתוך השבוע.`);
    if (!reasons.length) reasons.push("אין חריגות או סימונים מיוחדים.");
    return { name, count, nights, leaveDays, status, reasons };
  });

  const cells = [];
  parsed.data.forEach((row, rowIdx) => {
    row.forEach((cell, colIdx) => {
      const names = this.splitCellNames(cell || "");
      const day = parsed.days[colIdx];
      const slot = this.C.TIME_SLOTS[rowIdx].replace(" (Night)", "");
      const required = this.getRequiredPerShift(rowIdx);
      const dayIso = isoDates[colIdx];
      const reasons = this.getCellReasonParts(day, slot, names, required, dayIso, insights.cellFlags);
      if (reasons.length) {
        cells.push({
          day,
          date: this.getDatesForWeek(this.el.startDate.value)[colIdx],
          slot,
          assigned: names.length ? names.join(", ") : "—",
          required,
          reasons,
        });
      }
    });
  });

  return {
    employees,
    cells,
    summary: {
      balanced: employees.filter((x) => x.status.cls === "ok").length,
      attention: employees.filter((x) => x.status.cls !== "ok").length,
      zeroAssigned: employees.filter((x) => x.count === 0).length,
      markedCells: cells.length,
    },
  };
}

