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

export function validateNameAliases(aliases = {}) {
  for (const [alias, canonical] of Object.entries(aliases)) {
    const cleanAlias = String(alias || "").trim();
    const cleanCanonical = String(canonical || "").trim();
    if (!cleanAlias || !cleanCanonical) {
      throw new Error(`Invalid alias entry: "${alias}" -> "${canonical}"`);
    }
    const visited = new Set([cleanAlias]);
    let current = cleanCanonical;
    while (aliases[current]) {
      if (visited.has(current)) {
        throw new Error(`Alias cycle detected involving "${alias}"`);
      }
      visited.add(current);
      current = aliases[current];
    }
  }
}

export function canonicalName(name, aliases = {}) {
  const clean = normalizeKey(name);
  return aliases[clean] || clean;
}

export function uniqueCanonicalNames(names, aliases = {}) {
  const seen = new Set();
  const out = [];
  for (const name of names || []) {
    const key = canonicalName(name, aliases);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
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
