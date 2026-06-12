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

