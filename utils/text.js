export function normalizeKey(str) {
  return String(str || "")
    .normalize("NFKC")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitCellNames(text) {
  return Array.from(new Set(
    String(text || "")
      .split(/[\n,]+/)
      .map((v) => this.normalizeKey(v))
      .filter(Boolean)
  ));
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

export function aggressiveClean(line) {
  return String(line || "").replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\uFEFF\u00A0]/g, "").trim();
}

