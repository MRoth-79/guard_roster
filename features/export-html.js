export function downloadHtmlTable() {
  const resultsHtml = this.el.resultsContainer.innerHTML;
  const fairnessHtml = this.el.fairnessContent.innerHTML;
  const fairnessVisible = this.el.fairnessPanel.style.display === "block";
  const startDate = this.el.startDate.value;
  if (!startDate || !resultsHtml || resultsHtml.includes("הדבק נתונים")) {
    alert("בחר תאריך ובצע ניתוח לפני ההורדה.");
    return;
  }
  const [y, m, d] = startDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const fmt = (dt) => `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
  const title = `טבלת משמרות ${fmt(start)} - ${fmt(end)}`;
  const style = document.querySelector("style").textContent;

  // --- CSS עצמאי להדגשת "מצא את עצמך" בקובץ המיוצא ---
  const highlightStyle = `
    .schedule-table.hl-on .person { opacity: .2; transition: opacity .12s ease; }
    .schedule-table.hl-on .person.hl-active { opacity: 1; box-shadow: 0 0 0 2px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.25); font-weight: 700; }
    .schedule-table .person { cursor: pointer; }
    @media print {
      .schedule-table.hl-on .person { opacity: 1 !important; }
      .schedule-table .person.hl-active { box-shadow: none !important; }
    }
  `;

  // --- סקריפט inline עצמאי: hover + נעילה בקליק, ללא תלות ב-App ---
  const highlightScript = `
    (function () {
      var table = document.getElementById('scheduleTable');
      if (!table) return;
      var locked = null;
      var norm = function (s) { return (s || '').replace(/\\u00A0/g, ' ').trim(); };
      function apply(name) {
        var bubbles = table.querySelectorAll('.person');
        if (!name) {
          table.classList.remove('hl-on');
          bubbles.forEach(function (b) { b.classList.remove('hl-active'); });
          return;
        }
        table.classList.add('hl-on');
        bubbles.forEach(function (b) {
          if (norm(b.textContent) === name) b.classList.add('hl-active');
          else b.classList.remove('hl-active');
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
      table.addEventListener('click', function (e) {
        var b = e.target.closest('.person');
        if (!b) return;
        var name = norm(b.textContent);
        locked = (locked === name) ? null : name;
        apply(locked);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { locked = null; apply(null); }
      });
    })();
  `;

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>${style}</style>
<style>${highlightStyle}</style>
</head>
<body>
  <div class="app-shell">
    <div class="hero">${title}</div>
    <div class="card results-shell">${resultsHtml.replace(/contenteditable="plaintext-only"/g, 'contenteditable="false"')}</div>
    <div class="card fairness-panel" style="display:${fairnessVisible ? "block" : "none"}">
      <div class="label-strong" style="text-align:center;margin-bottom:12px;">פאנל הוגנות וחריגות</div>
      ${fairnessHtml}
    </div>
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
