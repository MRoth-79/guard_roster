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
/* ייצוא HTML: פריסה פשוטה (ללא flex) — תואם WebView בנייד */
html.html-export,html.html-export body{
  height:auto;min-height:100dvh;overflow-x:auto;overflow-y:auto;
}
html.html-export body{
  padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));
  display:block;
}
html.html-export .app-shell{display:block;max-width:100%;margin:0 auto}
html.html-export .hero{
  margin:0 auto 10px;padding:14px 16px;border-radius:22px;text-align:center;
  font-size:clamp(.95rem,3.8vw,1.25rem);font-weight:800;line-height:1.25;
}
html.html-export .card.results-shell{
  display:block;margin-bottom:0;padding:10px;overflow:visible;text-align:center;
}
html.html-export .results-shell h3{margin:0 0 8px;font-size:1rem}
html.html-export .export-schedule-wrap{
  display:block;width:100%;overflow-x:auto;overflow-y:visible;-webkit-overflow-scrolling:touch;
  border-radius:12px;border:3px solid #111;background:var(--artifact-surface);
  box-shadow:0 0 0 1px #111,var(--artifact-shadow-soft);
}
html.html-export .export-schedule-wrap .schedule-table{margin:0;border:none;box-shadow:none}
html.html-export .schedule-table{overflow:visible!important;min-width:var(--artifact-table-min-width,1100px)}
html.html-export .schedule-table tbody td{overflow:visible}
html.html-export .schedule-table thead th{position:static!important}
@media (max-width:768px),(hover:none) and (pointer:coarse){
  html.html-export{
    --artifact-table-min-width:640px;
    --artifact-time-col-width:48px;
  }
  html.html-export .results-shell h3{display:none}
  html.html-export .hero{margin-bottom:6px;padding:10px 12px;font-size:clamp(.82rem,3.2vw,1rem)}
  html.html-export .export-schedule-wrap{overflow-x:auto;overflow-y:visible}
  html.html-export .schedule-table{
    min-width:640px!important;width:max(640px,100%);table-layout:fixed;
  }
  html.html-export .schedule-table thead th{font-size:.72rem;padding:4px 2px}
  html.html-export .day-header-name{font-size:.78rem}
  html.html-export .date-text{font-size:.68rem}
  html.html-export .time-slot{font-size:.72rem;padding:6px 2px!important}
  html.html-export .schedule-table tbody td{min-height:44px;padding:4px 2px}
  html.html-export .schedule-table .person,html.html-export .schedule-table .person.person-multiline{
    white-space:normal;overflow:visible;text-overflow:unset;width:100%;max-width:100%;
    margin:4px auto;padding:6px 3px;font-size:clamp(.62rem,2.2vw + .5rem,.82rem);
    line-height:1.2;letter-spacing:0;border-radius:10px;
  }
  html.html-export .schedule-table .person.person-multiline{
    font-size:clamp(.6rem,6.5cqw,.76rem);padding:5px 2px;line-height:1.16;
  }
  html.html-export .schedule-table .person.highlight-name{transform:scale(1.04)}
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
      function clearHighlight() {
        locked = null;
        apply(null);
      }
      function isPersonTarget(e) {
        return !!(e.target && e.target.closest && e.target.closest('.person'));
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
        if (!b) {
          clearHighlight();
          return;
        }
        var name = norm(b.textContent);
        locked = (locked === name) ? null : name;
        apply(locked);
      });
      document.addEventListener('click', function (e) {
        if (isPersonTarget(e)) return;
        clearHighlight();
      });
      var touchTap = { moved: false };
      document.addEventListener('touchstart', function (e) {
        touchTap.moved = false;
      }, { passive: true });
      document.addEventListener('touchmove', function () {
        touchTap.moved = true;
      }, { passive: true });
      document.addEventListener('touchend', function (e) {
        if (touchTap.moved) return;
        if (isPersonTarget(e)) return;
        clearHighlight();
      }, { passive: true });
      table.querySelectorAll('.person').forEach(function (b) { b.style.cursor = 'pointer'; });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') clearHighlight();
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
