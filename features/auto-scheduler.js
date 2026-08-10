function gapHours(bounds, prevDayIdx, prevShiftIdx, nextDayIdx, nextShiftIdx) {
  const prev = bounds[prevShiftIdx];
  const next = bounds[nextShiftIdx];
  if (!prev || !next) return -Infinity;
  return (Number(nextDayIdx) * 24 + next.start) - (Number(prevDayIdx) * 24 + prev.end);
}

function pairHasMinGap(bounds, aDay, aShift, bDay, bShift, minHours) {
  const aFirst = aDay < bDay || (aDay === bDay && aShift <= bShift);
  const hours = aFirst
    ? gapHours(bounds, aDay, aShift, bDay, bShift)
    : gapHours(bounds, bDay, bShift, aDay, aShift);
  return hours >= minHours;
}

export function autoSchedule(options = {}) {
  if (!options.skipUndo) this.pushUndoSnapshot();
  const parsed = this.parseScheduleText(this.serializeMatrixToVerticalText());
  if (parsed.error) {
    this.Store.setState({ parsedData: parsed });
    return;
  }

  const mode = this.el.autoMode?.value || "balanced";
  const priorityGuards = this.getPriorityGuardSet();
  const weeklyOnLeave = this.buildWeeklyOnLeaveSet(this.el.startDate.value);
  const allEmployees = this.allEmployeeNames().map((n) => this.normalizeKey(n));
  const I = this.C.SHIFT_INDEX;
  const minGap = Number(this.C.RULES.MIN_REST_HOURS ?? 8);
  const bounds = this.C.SHIFT_HOUR_BOUNDS;

  const employeeShiftCount = {};
  const night2to6Count = {};
  const newSchedule = parsed.data.map((row) => row.map(() => []));
  const availabilityMap = {};
  const assignmentsByName = {};

  allEmployees.forEach((name) => {
    employeeShiftCount[name] = 0;
    night2to6Count[name] = 0;
    assignmentsByName[name] = [];
  });

  const isOnLeaveThisWeek = (name) => {
    const clean = this.normalizeKey(name);
    return weeklyOnLeave.has(clean) || weeklyOnLeave.has(clean.replace(/\s+/g, "_"));
  };

  // Hard days first, but rest checks use absolute dayIdx/shiftIdx (not fill order).
  const autoDayOrder = ["יום שישי", "יום שבת", "יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי"];
  const dayOrderIndices = autoDayOrder.map((name) => parsed.days.indexOf(name)).filter((index) => index !== -1);

  parsed.data.forEach((row, shiftIdx) => {
    dayOrderIndices.forEach((dayIdx) => {
      const available = this.splitCellNames(row[dayIdx] || "")
        .map((name) => this.normalizeKey(name))
        .filter((name) => name && !isOnLeaveThisWeek(name));
      availabilityMap[dayIdx] ||= {};
      availabilityMap[dayIdx][shiftIdx] = new Set(available);
      available.forEach((name) => {
        if (!assignmentsByName[name]) {
          assignmentsByName[name] = [];
          employeeShiftCount[name] = employeeShiftCount[name] || 0;
          night2to6Count[name] = night2to6Count[name] || 0;
        }
      });
    });
  });

  const respectsGapWithExisting = (name, dayIdx, shiftIdx) => {
    const existing = assignmentsByName[name] || [];
    for (const prev of existing) {
      if (!pairHasMinGap(bounds, prev.dayIdx, prev.shiftIdx, dayIdx, shiftIdx, minGap)) {
        return false;
      }
    }
    return true;
  };

  const alreadyAssignedThatDay = (name, dayIdx) => {
    const clean = this.normalizeKey(name);
    return (assignmentsByName[clean] || []).some((a) => a.dayIdx === dayIdx);
  };

  const maxNightsSoft = this.C.RULES.MAX_NIGHT_2_6;
  const maxNightsHard = mode === "strict" ? maxNightsSoft : maxNightsSoft + 1;

  const isLegalAssignment = (name, dayIdx, shiftIdx) => {
    const clean = this.normalizeKey(name);
    if (isOnLeaveThisWeek(clean)) return false;
    if (newSchedule[shiftIdx][dayIdx].includes(clean)) return false;
    // Auto: at most one shift per person per day. Manual edits may still add a second.
    if (alreadyAssignedThatDay(clean, dayIdx)) return false;
    if ((employeeShiftCount[clean] || 0) >= this.C.RULES.MAX_ALLOWED) return false;
    if (!respectsGapWithExisting(clean, dayIdx, shiftIdx)) return false;
    if (shiftIdx === I.NIGHT_2_6 && (night2to6Count[clean] || 0) >= maxNightsHard) return false;
    return true;
  };

  const assign = (name, dayIdx, shiftIdx) => {
    const clean = this.normalizeKey(name);
    newSchedule[shiftIdx][dayIdx].push(clean);
    employeeShiftCount[clean] = (employeeShiftCount[clean] || 0) + 1;
    assignmentsByName[clean] ||= [];
    assignmentsByName[clean].push({ dayIdx, shiftIdx });
    if (shiftIdx === I.NIGHT_2_6) {
      night2to6Count[clean] = (night2to6Count[clean] || 0) + 1;
    }
  };

  const unassign = (name, dayIdx, shiftIdx) => {
    const clean = this.normalizeKey(name);
    const row = newSchedule[shiftIdx][dayIdx];
    const at = row.indexOf(clean);
    if (at >= 0) row.splice(at, 1);
    assignmentsByName[clean] = (assignmentsByName[clean] || []).filter(
      (a) => !(a.dayIdx === dayIdx && a.shiftIdx === shiftIdx)
    );
    employeeShiftCount[clean] = Math.max(0, (employeeShiftCount[clean] || 0) - 1);
    if (shiftIdx === I.NIGHT_2_6) {
      night2to6Count[clean] = Math.max(0, (night2to6Count[clean] || 0) - 1);
    }
  };

  const shiftsOrder = [];
  dayOrderIndices.forEach((dayIndex) => {
    for (let shiftIndex = 0; shiftIndex < this.C.TIME_SLOTS.length; shiftIndex++) {
      shiftsOrder.push({ dayIndex, shiftIndex });
    }
  });

  const candidateScore = (name, shiftIdx) => {
    const clean = this.normalizeKey(name);
    const shifts = employeeShiftCount[clean] || 0;
    const nights = night2to6Count[clean] || 0;
    const priority = priorityGuards.has(clean) ? 1 : 0;
    // Strongly avoid a 3rd 02–06 night once someone already has 2.
    const thirdNightPenalty = (shiftIdx === I.NIGHT_2_6 && nights >= maxNightsSoft) ? 50 : 0;
    if (mode === "priority") return [thirdNightPenalty, nights, -priority, shifts, clean];
    if (mode === "strict") return [thirdNightPenalty, nights, shifts, -priority, clean];
    return [thirdNightPenalty, nights, shifts, -priority, clean];
  };

  [1, 2, 3, 4, 5].forEach((roundTarget) => {
    shiftsOrder.forEach(({ dayIndex, shiftIndex }) => {
      const required = this.getRequiredPerShift(shiftIndex);
      const row = newSchedule[shiftIndex][dayIndex];
      if (row.length >= required) return;
      const availSet = availabilityMap[dayIndex]?.[shiftIndex];
      if (!availSet?.size) return;

      while (row.length < required) {
        const existing = new Set(row);
        const baseCandidates = Array.from(availSet).filter((name) => !existing.has(name));
        if (!baseCandidates.length) break;

        const primary = baseCandidates.filter((name) => {
          const clean = this.normalizeKey(name);
          const cap = (mode === "priority" && priorityGuards.has(clean)) ? this.C.RULES.MAX_ALLOWED : roundTarget;
          if ((employeeShiftCount[clean] || 0) >= cap) return false;
          if (!isLegalAssignment(clean, dayIndex, shiftIndex)) return false;
          // Prefer not giving a 3rd 02–06 night when alternatives exist.
          if (shiftIndex === I.NIGHT_2_6 && (night2to6Count[clean] || 0) >= maxNightsSoft) return false;
          return true;
        });
        const fallback = baseCandidates.filter((name) => {
          const clean = this.normalizeKey(name);
          return (employeeShiftCount[clean] || 0) < this.C.RULES.MAX_ALLOWED && isLegalAssignment(clean, dayIndex, shiftIndex);
        });
        const pool = (primary.length ? primary : fallback).sort((a, b) => {
          const sa = candidateScore(a, shiftIndex);
          const sb = candidateScore(b, shiftIndex);
          for (let i = 0; i < sa.length; i++) {
            if (sa[i] < sb[i]) return -1;
            if (sa[i] > sb[i]) return 1;
          }
          return 0;
        });
        if (!pool.length) break;
        assign(pool[0], dayIndex, shiftIndex);
      }
    });
  });

  // Safety net: strip same-day doubles and gap violations from auto output.
  let stripped = 0;
  Object.keys(assignmentsByName).forEach((name) => {
    const list = [...(assignmentsByName[name] || [])].sort(
      (a, b) => (a.dayIdx - b.dayIdx) || (a.shiftIdx - b.shiftIdx)
    );
    const seenDays = new Set();
    for (let i = 0; i < list.length; i++) {
      const cur = list[i];
      const prev = i > 0 ? list[i - 1] : null;
      const sameDayTwice = seenDays.has(cur.dayIdx);
      const gapBroken = prev
        && !pairHasMinGap(bounds, prev.dayIdx, prev.shiftIdx, cur.dayIdx, cur.shiftIdx, minGap);
      if (sameDayTwice || gapBroken) {
        unassign(name, cur.dayIdx, cur.shiftIdx);
        list.splice(i, 1);
        stripped += 1;
        i -= 1;
        continue;
      }
      seenDays.add(cur.dayIdx);
    }
  });

  newSchedule.forEach((row, rowIndex) => {
    row.forEach((names, dayIndex) => {
      this.state.excelMatrix[rowIndex][dayIndex] = names.join(", ");
    });
  });

  this.ExcelGrid.render();
  this.ExcelGrid.validateAllGridCells();
  const parsedAfter = this.parseScheduleText(this.serializeMatrixToVerticalText());
  this.Store.setState({ excelMatrix: this.state.excelMatrix, parsedData: parsedAfter, startDate: this.el.startDate.value });
  this.persistFullState();

  const below = allEmployees
    .map((name) => ({ name, count: employeeShiftCount[name] || 0 }))
    .filter((entry) => entry.count < this.C.RULES.MIN_REQUIRED);

  if (stripped) {
    this.showStatus(`⚠️ הסידור הושלם עם תיקון ${stripped} שיבוצים ששברו הפרש ${minGap} שע׳.`, "warning");
  } else if (!below.length) {
    this.showStatus(`✅ הסידור הושלם (${mode}) עם לפחות ${minGap} שע׳ בין משמרות. כולם עם לפחות ${this.C.RULES.MIN_REQUIRED} משמרות.`, "success");
  } else {
    this.showStatus(`⚠️ ${below.length} עובדים עדיין מתחת למינימום: ${below.map((x) => `${x.name} (${x.count})`).join(", ")}`, "warning");
  }

  this.el.resultsContainer?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
}
