import { RULES, SHIFT_INDEX, TIME_SLOTS } from "../core/constants.js";
import { allEmployeeNames } from "../utils/names.js";
import { normalizeKey, splitCellNames } from "../utils/text.js";
import { nextAllowedSameDayAfter } from "./analysis.js";

export function autoSchedule(app) {
  app.pushUndoSnapshot();

  const parsed = app.parseScheduleText(app.serializeMatrixToVerticalText());
  if (parsed.error) {
    app.Store.setState({ parsedData: parsed });
    return;
  }

  const mode = app.el.autoMode?.value || "balanced";
  const priorityGuards = app.getPriorityGuardSet();
  const weeklyOnLeave = app.buildWeeklyOnLeaveSet(app.el.startDate.value);
  const allEmployees = allEmployeeNames();
  const I = SHIFT_INDEX;

  const employeeShiftCount = {};
  const night2to6Count = {};
  const newSchedule = parsed.data.map((row) => row.map(() => []));
  const availabilityMap = {};
  const night2202Blocks = parsed.days.map(() => new Set());
  const night0206Blocks = parsed.days.map(() => new Set());
  const minNextAllowed = parsed.days.map(() => ({}));

  allEmployees.forEach((name) => {
    employeeShiftCount[name] = 0;
    night2to6Count[name] = 0;
  });

  const isOnLeaveThisWeek = (name) => {
    const clean = normalizeKey(name);
    return weeklyOnLeave.has(clean) || weeklyOnLeave.has(clean.replace(/\s+/g, "_"));
  };

  const autoDayOrder = [
    "יום שישי",
    "יום שבת",
    "יום ראשון",
    "יום שני",
    "יום שלישי",
    "יום רביעי",
    "יום חמישי",
  ];

  const dayOrderIndices = autoDayOrder
    .map((name) => parsed.days.indexOf(name))
    .filter((index) => index !== -1);

  parsed.data.forEach((row, shiftIdx) => {
    dayOrderIndices.forEach((dayIdx) => {
      const available = splitCellNames(row[dayIdx] || "").filter(
        (name) => !isOnLeaveThisWeek(name)
      );
      availabilityMap[dayIdx] ||= {};
      availabilityMap[dayIdx][shiftIdx] = new Set(available);
    });
  });

  const isLegalAssignment = (name, dayIdx, shiftIdx) => {
    if (isOnLeaveThisWeek(name)) return false;
    if (newSchedule[shiftIdx][dayIdx].includes(name)) return false;

    for (let s = 0; s < TIME_SLOTS.length; s++) {
      if (newSchedule[s][dayIdx].includes(name)) return false;
    }

    if ((employeeShiftCount[name] || 0) >= RULES.MAX_ALLOWED) return false;

    const minAllowed = minNextAllowed[dayIdx][name];
    if (minAllowed !== undefined && shiftIdx < minAllowed) return false;

    if (shiftIdx === I.NIGHT_2_6) {
      const strictNightLimit =
        mode === "strict" ? RULES.MAX_NIGHT_2_6 : RULES.MAX_NIGHT_2_6 + 1;
      if ((night2to6Count[name] || 0) >= strictNightLimit) return false;
    }

    if (
      (shiftIdx === I.MORNING_6_10 || shiftIdx === I.NIGHT_2_6) &&
      night2202Blocks[dayIdx].has(name)
    ) {
      return false;
    }

    if (
      (shiftIdx === I.MORNING_6_10 || shiftIdx === I.MORNING_10_14) &&
      night0206Blocks[dayIdx].has(name)
    ) {
      return false;
    }

    if (shiftIdx === I.NIGHT_2_6 && dayIdx > 0) {
      const prevNight = newSchedule[I.NIGHT_22_2][dayIdx - 1] || [];
      const prevEvening = newSchedule[I.EVENING_18_22][dayIdx - 1] || [];
      if (prevNight.includes(name) || prevEvening.includes(name)) return false;
    }

    return true;
  };

  const assign = (name, dayIdx, shiftIdx) => {
    newSchedule[shiftIdx][dayIdx].push(name);
    employeeShiftCount[name] = (employeeShiftCount[name] || 0) + 1;
  
    const nextAllowed = nextAllowedSameDayAfter.call(app, shiftIdx);
    const current = minNextAllowed[dayIdx][name];
    minNextAllowed[dayIdx][name] =
      current === undefined ? nextAllowed : Math.max(current, nextAllowed);
  
    if (shiftIdx === I.NIGHT_2_6) {
      night2to6Count[name] = (night2to6Count[name] || 0) + 1;
      night0206Blocks[dayIdx].add(name);
    }
  
    if (shiftIdx === I.NIGHT_22_2 && dayIdx + 1 < parsed.days.length) {
      night2202Blocks[dayIdx + 1].add(name);
    }
  };


  const shiftsOrder = [];
  dayOrderIndices.forEach((dayIndex) => {
    for (let shiftIndex = 0; shiftIndex < TIME_SLOTS.length; shiftIndex++) {
      shiftsOrder.push({ dayIndex, shiftIndex });
    }
  });

  const candidateScore = (name) => {
    const shifts = employeeShiftCount[name] || 0;
    const nights = night2to6Count[name] || 0;
    const priority = priorityGuards.has(name) ? 1 : 0;

    if (mode === "priority") return [shifts, -priority, nights, name];
    if (mode === "strict") return [nights, shifts, -priority, name];
    return [shifts, nights, -priority, name];
  };

  [1, 2, 3, 4, 5].forEach((roundTarget) => {
    shiftsOrder.forEach(({ dayIndex, shiftIndex }) => {
      const required = app.getRequiredPerShift(shiftIndex);
      const row = newSchedule[shiftIndex][dayIndex];
      if (row.length >= required) return;

      const availSet = availabilityMap[dayIndex]?.[shiftIndex];
      if (!availSet?.size) return;

      while (row.length < required) {
        const existing = new Set(row);
        const baseCandidates = Array.from(availSet).filter(
          (name) => !existing.has(name)
        );
        if (!baseCandidates.length) break;

        const primary = baseCandidates.filter(
          (name) =>
            (employeeShiftCount[name] || 0) < roundTarget &&
            isLegalAssignment(name, dayIndex, shiftIndex)
        );

        const fallback = baseCandidates.filter(
          (name) =>
            (employeeShiftCount[name] || 0) < RULES.MAX_ALLOWED &&
            isLegalAssignment(name, dayIndex, shiftIndex)
        );

        const pool = (primary.length ? primary : fallback).sort((a, b) => {
          const sa = candidateScore(a);
          const sb = candidateScore(b);
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

  newSchedule.forEach((row, rowIndex) => {
    row.forEach((names, dayIndex) => {
      app.state.excelMatrix[rowIndex][dayIndex] = names.join(", ");
    });
  });

  app.ExcelGrid.render();
  app.ExcelGrid.validateAllGridCells();

  const parsedAfter = app.parseScheduleText(app.serializeMatrixToVerticalText());
  app.Store.setState({
    excelMatrix: app.state.excelMatrix,
    parsedData: parsedAfter,
    startDate: app.el.startDate.value,
  });

  app.persistFullState();

  const below = allEmployees
    .map((name) => ({ name, count: employeeShiftCount[name] || 0 }))
    .filter((entry) => entry.count < RULES.MIN_REQUIRED);

  if (!below.length) {
    app.showStatus(
      `✅ הסידור הושלם (${mode}). כולם עם לפחות ${RULES.MIN_REQUIRED} משמרות.`,
      "success"
    );
  } else {
    app.showStatus(
      `⚠️ ${below.length} עובדים עדיין מתחת למינימום: ${below
        .map((x) => `${x.name} (${x.count})`)
        .join(", ")}`,
      "warning"
    );
  }

  return {
    matrix: newSchedule.map((row) => row.map((cell) => [...cell])),
    stats: {
      employeeShiftCount,
      night2to6Count,
      belowMinimum: below,
      mode,
    },
  };
}
