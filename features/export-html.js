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

