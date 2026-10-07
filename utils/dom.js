export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function insertPlainTextAtCursor(text) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  sel.deleteFromDocument();
  const range = sel.getRangeAt(0);
  range.insertNode(document.createTextNode(text));
  sel.collapseToEnd();
}

export function placeCaretAtEnd(el) {
  try {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  } catch {}
}

/** Character offset from the start of el's text content. */
export function getCaretTextOffsets(el) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return null;

  const startRange = document.createRange();
  startRange.selectNodeContents(el);
  startRange.setEnd(range.startContainer, range.startOffset);
  const start = startRange.toString().length;

  const endRange = document.createRange();
  endRange.selectNodeContents(el);
  endRange.setEnd(range.endContainer, range.endOffset);
  const end = endRange.toString().length;

  return { start, end: Math.max(start, end) };
}

/** Restore focus and a collapsed or ranged selection by text offsets. */
export function setCaretTextOffsets(el, start, end = start) {
  try {
    el.focus();
    const textLength = (el.textContent || "").length;
    const safeStart = Math.max(0, Math.min(start, textLength));
    const safeEnd = Math.max(safeStart, Math.min(end, textLength));
    const range = document.createRange();
    const selection = window.getSelection();
    let rangeStartNode = null;
    let rangeStartOffset = 0;
    let rangeEndNode = null;
    let rangeEndOffset = 0;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    let pos = 0;
    while ((node = walker.nextNode())) {
      const len = node.textContent.length;
      if (!rangeStartNode && safeStart <= pos + len) {
        rangeStartNode = node;
        rangeStartOffset = safeStart - pos;
      }
      if (safeEnd <= pos + len) {
        rangeEndNode = node;
        rangeEndOffset = safeEnd - pos;
        break;
      }
      pos += len;
    }

    if (!rangeStartNode || !rangeEndNode) {
      placeCaretAtEnd(el);
      return;
    }

    range.setStart(rangeStartNode, rangeStartOffset);
    range.setEnd(rangeEndNode, rangeEndOffset);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch {
    placeCaretAtEnd(el);
  }
}

/** Map a caret offset from raw cell text into normalized text. */
export function mapCaretOffsetToNormalized(rawText, normalizedText, offset, normalizeFn) {
  const safeOffset = Math.max(0, Math.min(offset, String(rawText || "").length));
  if (rawText === normalizedText) return Math.min(safeOffset, normalizedText.length);
  const mapped = normalizeFn(String(rawText || "").slice(0, safeOffset));
  return Math.min(mapped.length, normalizedText.length);
}

