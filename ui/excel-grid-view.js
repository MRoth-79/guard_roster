export function setupExcelGridEvents(app) {
  const table = app.el["excel-grid"];
  if (!table) return;

  // 1. טיפול בלחיצה על Enter ופוקוס בתוך תא
  table.addEventListener("keydown", (e) => {
    const cell = e.target.closest("td.cell");
    if (!cell) return;

    if (e.key === "Enter") {
      e.preventDefault(); // מניעת ירידת שורה בתוך התא
      cell.blur(); // יציאה מהתא כדי לשמור שינויים ולהתקדם
    }
  });

  // 2. עדכון הנתונים בעת הקלדה (ללא גלילה קופצת)
  table.addEventListener("input", (e) => {
    const cell = e.target.closest("td.cell");
    if (!cell) return;

    const r = cell.dataset.r;
    const c = cell.dataset.c;

    // ניקוי ירידות שורה ורווחים כפולים
    const cleanValue = cell.innerText.replace(/\r?\n|\r/g, " ").trim();
    app.state.excelMatrix[r][c] = cleanValue;

    // רענון הלוח התחתון
    if (typeof app.renderScheduleView === "function") {
      app.renderScheduleView(app.getParsedData());
    }
  });
}
