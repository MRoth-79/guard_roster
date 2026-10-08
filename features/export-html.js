export function downloadHtmlTable() {
  const rawResultsHtml = this.el.resultsContainer.innerHTML;
  const startDate = this.el.startDate.value;
  if (!startDate || !rawResultsHtml || rawResultsHtml.includes("משוך וסדר") || rawResultsHtml.includes("הדבק נתונים")) {
    alert("בחר תאריך וסדר משמרות לפני ההורדה.");
    return;
  }

  const tmp = document.createElement("div");
  tmp.innerHTML = rawResultsHtml;
  tmp.querySelector(".summary-bar")?.remove();
  tmp.querySelector(".results-info")?.remove();
  Array.from(tmp.querySelectorAll("h3"))
    .filter((h) => h.textContent.includes("סיכום הופעות"))
    .forEach((h) => h.remove());
  tmp.querySelector(".summary-table")?.remove();

  const scheduleTable = tmp.querySelector("#scheduleTable");
  if (!scheduleTable) {
    alert("לא נמצאה טבלת משמרות להורדה.");
    return;
  }
  const scheduleTitle = Array.from(tmp.querySelectorAll("h3")).find((h) => h.textContent.includes("טבלת משמרות"));
  let resultsHtml = `${scheduleTitle ? scheduleTitle.outerHTML : "<h3>טבלת משמרות</h3>"}<div class="export-schedule-wrap">${scheduleTable.outerHTML}</div>`;

  const [y, m, d] = startDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const fmt = (dt) => `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
  const title = `טבלת משמרות ${fmt(start)} - ${fmt(end)}`;
  const style = Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent)
    .join("\n");
  const exportExtraStyle = `
html.html-export,html.html-export body{height:100%;min-height:100dvh;overflow:hidden}
html.html-export body{
  padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));
  display:flex;flex-direction:column;
}
html.html-export .app-shell{flex:1;min-height:0;display:flex;flex-direction:column;max-width:100%}
html.html-export .hero{
  flex-shrink:0;margin-bottom:10px;padding:14px 16px;border-radius:22px;
  font-size:clamp(.95rem,3.8vw,1.25rem);font-weight:800;line-height:1.25;
}
html.html-export .card.results-shell{
  flex:1;min-height:0;margin-bottom:0;padding:10px;overflow:hidden;
  display:flex;flex-direction:column;text-align:center;
}
html.html-export .results-shell h3{flex-shrink:0;margin:0 0 8px;font-size:1rem}
html.html-export .export-schedule-wrap{
  flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;
  border-radius:12px;border:3px solid #111;background:var(--artifact-surface);
  box-shadow:0 0 0 1px #111,var(--artifact-shadow-soft);
}
html.html-export .export-schedule-wrap .schedule-table{margin:0;border:none;box-shadow:none}
@media (max-width:768px){
  html.html-export .schedule-table{min-width:720px}
  html.html-export .schedule-table th,html.html-export .schedule-table td{padding:6px 4px}
  html.html-export .person{font-size:clamp(.92em,2.6vw + .65em,1.15em);padding:8px 12px}
}
`;

  // --- סקריפט inline עצמאי: משתמש באותן מחלקות של האפליקציה
  //     (spotlight-active על הקונטיינר + highlight-name על ה-bubble)
  //     כך שההדגשה זהה לחלוטין לטבלה הרגילה. כולל נעילה בקליק. ---
  const highlightScript = `
    (function () {
      var root = document.querySelector('.results-shell');
      var table = document.getElementById('scheduleTable');
      if (!root || !table) return;
      var locked = null;
      var norm = function (s) { return (s || '').replace(/\\u00A0/g, ' ').trim(); };
      function apply(name) {
        var bubbles = root.querySelectorAll('.person');
        if (!name) {
          root.classList.remove('spotlight-active');
          bubbles.forEach(function (b) { b.classList.remove('highlight-name'); });
          return;
        }
        root.classList.add('spotlight-active');
        bubbles.forEach(function (b) {
          b.classList.toggle('highlight-name', norm(b.textContent) === name);
        });
      }
      table.addEventListener('mouseover', function (e) {
        if (locked) return;
        var b = e.target.closest('.person');
        if (b) apply(norm(b.textContent));
      });
      table.addEventListener('mouseout', function (e) {
        if (locked) return;
        if (e.target.closest('.person')) apply(null);
      });
      table.addEventListener('touchstart', function (e) {
        if (locked) return;
        var b = e.target.closest('.person');
        if (b) apply(norm(b.textContent));
      }, { passive: true });
      table.addEventListener('click', function (e) {
        var b = e.target.closest('.person');
        if (!b) return;
        var name = norm(b.textContent);
        locked = (locked === name) ? null : name;
        apply(locked);
      });
      table.querySelectorAll('.person').forEach(function (b) { b.style.cursor = 'pointer'; });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { locked = null; apply(null); }
      });
    })();
  `;

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl" class="html-export">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${title}</title>
<style>${style}${exportExtraStyle}</style>
</head>
<body>
  <div class="app-shell">
    <div class="hero">${title}</div>
    <div class="card results-shell">${resultsHtml.replace(/contenteditable="plaintext-only"/g, 'contenteditable="false"')}</div>
  </div>
  <script>
    window.GleanBridge = window.GleanBridge || { postMessage() {}, onMessage() {} };
    window.GleanBridge.postMessage({ actionId: 'export-pdf', type: 'glean-add-menu', metadata: { label: 'Export as PDF', icon: 'export' } });
    window.GleanBridge.onMessage('action', function(data) { if (data.actionId === 'export-pdf') window.print(); });
  <\/script>
  <script>${highlightScript}<\/script>
</body>
</html>`.trim();

  const blob = new Blob(["\ufeff" + html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sidur_${startDate}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
