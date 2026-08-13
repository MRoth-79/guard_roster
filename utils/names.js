const PERSON_STYLE_ID = "person-name-styles";
const WHITE = "#ffffff";
const BLACK = "#000000";

function resolveCanonicalName(name) {
  const clean = this.normalizeKey(name);
  const aliases = this.C.NAME_ALIASES || {};
  return aliases[clean] || clean;
}

export function allEmployeeNames() {
  return Object.keys(this.C.COLOR_MAP)
    .map((name) => name.replace(/_/g, " "))
    .sort((a, b) => a.localeCompare(b, "he"));
}

export function getScheduledEmployeeNames(allShifts) {
  return Object.keys(allShifts)
    .filter((name) => (allShifts[name] || 0) > 0)
    .sort((a, b) => {
      const aCount = allShifts[a] || 0;
      const bCount = allShifts[b] || 0;
      if (bCount !== aCount) return bCount - aCount;
      return a.localeCompare(b, "he");
    });
}

export function nameToColorClass(name) {
  const canonical = resolveCanonicalName.call(this, name);
  if (this.C.COLOR_MAP[canonical]) return this.C.COLOR_MAP[canonical];
  const underscored = canonical.replace(/\s+/g, "_");
  return this.C.COLOR_MAP[underscored] || null;
}

function expandHex(hex) {
  const raw = String(hex || "").replace("#", "").trim();
  if (raw.length === 3) {
    return raw.split("").map((ch) => ch + ch).join("");
  }
  if (raw.length === 8) return raw.slice(0, 6);
  return raw.length === 6 ? raw : "";
}

function hexToRgb(hex) {
  const full = expandHex(hex);
  if (!full) return null;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channelLuminance(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb;
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function contrastRatio(l1, l2) {
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function parseBgHexes(bg) {
  return (String(bg).match(/#([0-9a-fA-F]{3,8})\b/g) || [])
    .map((hex) => hexToRgb(hex))
    .filter(Boolean);
}

/** Pick black or white text using the worse-case contrast across gradient stops. */
export function contrastTextColor(bg) {
  const rgbs = parseBgHexes(bg);
  if (!rgbs.length) return BLACK;
  const whiteL = 1;
  const blackL = 0;
  const whiteMin = Math.min(...rgbs.map((rgb) => contrastRatio(relativeLuminance(rgb), whiteL)));
  const blackMin = Math.min(...rgbs.map((rgb) => contrastRatio(relativeLuminance(rgb), blackL)));
  return whiteMin >= blackMin ? WHITE : BLACK;
}

function borderDeclaration(style, color) {
  const width = style === "double" ? "3px" : "2px";
  return `${width} ${style} ${color}`;
}

export function generatePersonNameCss(nameStyles = {}) {
  return Object.entries(nameStyles).map(([name, cfg]) => {
    const bg = cfg.bg || "#e2e8f0";
    const text = contrastTextColor(bg);
    const shadow = text === WHITE
      ? "0 1px 2px rgba(0,0,0,.35)"
      : "none";
    const border = borderDeclaration(cfg.borderStyle || "solid", cfg.borderColor || "#334155");
    return `.person.color-${name}{background:${bg};color:${text};border:${border};text-shadow:${shadow};}`;
  }).join("\n");
}

export function injectPersonNameStyles() {
  const css = generatePersonNameCss(this.C.NAME_STYLES || {});
  let el = document.getElementById(PERSON_STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = PERSON_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}
