export function normalizeKey(str) {
  return String(str || "")
    .normalize("NFKC")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitCellNames(text, normalizeFn = normalizeKey) {
  return Array.from(new Set(
    String(text || "")
      .split(/[\n,]+/)
      .map((v) => normalizeFn(v))
      .filter(Boolean),
  ));
}

export function normalizeCellValue(value) {
  return String(value || "").replace(/\u00A0/g, " ").split(/[\n,]+/).map((x) => x.trim()).filter(Boolean).join(", ");
}

export function mapCaretOffsetToNormalized(rawText, normalizedText, offset, normalizeFn = normalizeCellValue) {
  const safeOffset = Math.max(0, Math.min(offset, String(rawText || "").length));
  if (rawText === normalizedText) return Math.min(safeOffset, normalizedText.length);
  const mapped = normalizeFn(String(rawText || "").slice(0, safeOffset));
  return Math.min(mapped.length, normalizedText.length);
}
