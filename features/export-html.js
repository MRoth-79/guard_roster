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
  let resultsHtml = `${scheduleTitle ? scheduleTitle.outerHTML : "<h3>טבלת משמרות</h3>"}<div class="export-schedule-wrap"><div class="export-schedule-fit" id="exportScheduleFit"><div class="export-schedule-scale" id="exportScheduleScale">${scheduleTable.outerHTML}</div></div></div>`;

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
  display:flex;flex-direction:column;align-items:center;
}
html.html-export .export-schedule-fit{
  width:100%;flex:1;min-height:0;display:flex;justify-content:center;align-items:flex-start;
}
html.html-export .export-schedule-scale{display:inline-block;max-width:100%}
html.html-export .export-schedule-wrap .schedule-table{margin:0;border:none;box-shadow:none}
html.html-export .schedule-table{overflow:visible}
html.html-export .schedule-table tbody td{overflow:visible}
@media (max-width:768px),(hover:none) and (pointer:coarse){
  html.html-export{
    --artifact-table-min-width:0;
    --artifact-time-col-width:52px;
  }
  html.html-export .results-shell h3{display:none}
  html.html-export .hero{margin-bottom:6px;padding:10px 12px;font-size:clamp(.82rem,3.2vw,1rem)}
  html.html-export .schedule-table{
    min-width:0!important;width:100%;max-width:100%;table-layout:fixed;
  }
  html.html-export .schedule-table thead th{font-size:.72rem;padding:4px 2px}
  html.html-export .day-header-name{font-size:.78rem}
  html.html-export .date-text{font-size:.68rem}
  html.html-export .time-slot{font-size:.72rem;padding:6px 2px!important}
  html.html-export .schedule-table tbody td{min-height:44px;padding:4px 2px}
  html.html-export .schedule-table .person,html.html-export .schedule-table .person.person-multiline{
    white-space:normal;overflow:visible;text-overflow:unset;width:100%;max-width:100%;
    margin:4px auto;padding:7px 4px;font-size:clamp(.68rem,2.4vw + .55rem,.86rem);
    line-height:1.2;letter-spacing:0;border-radius:12px;
  }
  html.html-export .schedule-table .person.person-multiline{
    font-size:clamp(.66rem,7.5cqw,.8rem);padding:6px 3px;line-height:1.18;
  }
  html.html-export .schedule-table .person.highlight-name{transform:scale(1.05)}
}
`;

  const fitScript = `
    (function () {
      var wrap = document.querySelector('.export-schedule-wrap');
      var scaleEl = document.getElementById('exportScheduleScale');
      var table = document.getElementById('scheduleTable');
      if (!wrap || !scaleEl || !table) return;
      var mq = window.matchMedia('(max-width: 768px), (hover: none) and (pointer: coarse)');
      function resetFit() {
        scaleEl.style.zoom = '';
        scaleEl.style.transform = '';
        scaleEl.style.width = '';
        scaleEl.style.height = '';
        scaleEl.style.marginBottom = '';
        wrap.style.overflow = '';
      }
      function applyFit() {
        resetFit();
        if (!mq.matches) return;
        var tableW = table.offsetWidth || table.scrollWidth;
        var tableH = table.offsetHeight || table.scrollHeight;
        if (!tableW || !tableH) return;
        var top = wrap.getBoundingClientRect().top;
        var pad = 10;
        var availW = Math.max(200, window.innerWidth - pad);
        var availH = Math.max(200, window.innerHeight - top - pad);
        var scaleW = availW / tableW;
        var scaleH = availH / tableH;
        var scale = Math.min(1, scaleW, scaleH);
        if (!isFinite(scale) || scale <= 0) scale = 1;
        scale = Math.max(0.28, scale);
        document.documentElement.style.setProperty('--export-fit-scale', String(scale));
        if (typeof scaleEl.style.zoom !== 'undefined') {
          scaleEl.style.zoom = scale;
        } else {
          scaleEl.style.width = tableW + 'px';
          scaleEl.style.transform = 'scale(' + scale + ')';
          scaleEl.style.transformOrigin = 'top center';
          scaleEl.style.marginBottom = (-tableH * (1 - scale)) + 'px';
        }
        wrap.style.overflow = scale < 0.999 ? 'hidden' : 'auto';
      }
      var timer;
      function scheduleFit() {
        clearTimeout(timer);
        timer = setTimeout(applyFit, 80);
      }
      window.addEventListener('load', scheduleFit);
      window.addEventListener('resize', scheduleFit);
      window.addEventListener('orientationchange', function () { setTimeout(scheduleFit, 200); });
      if (mq.addEventListener) mq.addEventListener('change', scheduleFit);
      else if (mq.addListener) mq.addListener(scheduleFit);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleFit);
      scheduleFit();
      setTimeout(scheduleFit, 250);
      setTimeout(scheduleFit, 800);
    })();
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
  <script>${fitScript}<\/script>
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
