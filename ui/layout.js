export function renderLayout() {
  document.getElementById("app").innerHTML = `
    <div class="card">
      <h2>טבלת משמרות</h2>
      <div id="grid"></div>
      <button id="analyzeBtn">נתח</button>
    </div>

    <div id="result" class="card"></div>
  `;
}
