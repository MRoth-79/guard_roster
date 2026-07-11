export function downloadHtmlTable() {
  const rawResultsHtml = this.el.resultsContainer.innerHTML;
  const fairnessHtml = this.el.fairnessContent.innerHTML;
  const fairnessVisible = this.el.fairnessPanel.style.display === "block";
  const startDate = this.el.startDate.value;
  if (!startDate || !rawResultsHtml || rawResultsHtml.includes("הדבק נתונים")) {
    alert("בחר תאריך ובצע ניתוח לפני ההורדה.");
    return;
  }

  // --- הסרת פס הסיכום (summary-bar) מהקובץ המיוצא ---
  const tmp = document.createElement("div");
  tmp.innerHTML = rawResultsHtml;
  tmp.querySelector(".summary-bar")?.remove();
  const resultsHtml = tmp.innerHTML;

  const [y, m, d] = startDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const fmt = (dt) => `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
  const title = `טבלת משמרות ${fmt(start)} - ${fmt(end)}`;
  const style = document.querySelector("style").textContent;

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
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>${style}</style>
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
