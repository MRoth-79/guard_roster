// 1. פונקציית הבנייה של הטבלה העליונה (Grid)
export function renderExcelGrid(app) {
  const table = app.el["excel-grid"];
  if (!table) return;

  const expectedDays = app.state?.expectedDays || [
    "יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "יום שבת"
  ];
  
  const dayShort = expectedDays.map((day) => day.replace("יום ", ""));
  let html = "<thead><tr><th>שעות / יום</th>";
  dayShort.forEach((day) => { 
    html += `<th>${app.escapeHtml ? app.escapeHtml(day) : day}</th>`; 
  });
  html += "</tr></thead><tbody>";

  const timeSlots = app.C?.TIME_SLOTS || [
    "02:00 - 06:00 (Night)",
    "06:00 - 10:00",
    "10:00 - 14:00",
    "14:00 - 18:00",
    "18:00 - 22:00",
    "22:00 - 02:00 (Night)"
  ];

  timeSlots.forEach((slot, r) => {
    const time = slot.split("(")[0].trim();
    html += `<tr><td>${app.escapeHtml ? app.escapeHtml(time) : time}</td>`;
    expectedDays.forEach((_, c) => {
      const cellVal = app.state?.excelMatrix?.[r]?.[c] || "";
      const cleanVal = app.escapeHtml ? app.escapeHtml(cellVal) : cellVal;
      html += `<td class="cell" contenteditable="plaintext-only" data-r="${r}" data-c="${c}">${cleanVal}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody>";
  table.innerHTML = html;
}

// 2. פונקציית ניהול האירועים של הטבלה (ללא קפיצות מסך)
export function setupExcelGridEvents(app) {
  const table = app.el["excel-grid"];
  if (!table) return;

  // טיפול בלחיצה על Enter ופוקוס בתוך תא
  table.addEventListener("keydown", (e) => {
    const cell = e.target.closest("td.cell");
    if (!cell) return;

    if (e.key === "Enter") {
      e.preventDefault(); // מניעת ירידת שורה בתוך התא
      cell.blur(); // יציאה מהתא כדי לשמור שינויים ולהתקדם
    }
  });

  // עדכון הנתונים בעת הקלדה
  table.addEventListener("input", (e) => {
    const cell = e.target.closest("td.cell");
    if (!cell) return;

    const r = cell.dataset.r;
    const c = cell.dataset.c;

    if (!app.state.excelMatrix) app.state.excelMatrix = [];
    if (!app.state.excelMatrix[r]) app.state.excelMatrix[r] = [];

    // ניקוי ירידות שורה ורווחים
    const cleanValue = cell.innerText.replace(/\r?\n|\r/g, " ").trim();
    app.state.excelMatrix[r][c] = cleanValue;

    // רענון הלוח התחתון
    if (typeof app.renderScheduleView === "function" && typeof app.getParsedData === "function") {
      app.renderScheduleView(app.getParsedData());
    }
  });
}