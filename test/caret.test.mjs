import test from "node:test";
import assert from "node:assert/strict";
import { mapCaretOffsetToNormalized, normalizeCellValue } from "./lib/app-helpers.mjs";

test("mid-cell typing keeps caret after prefix when text is unchanged", () => {
  const raw = "abcd";
  const normalized = normalizeCellValue(raw);
  assert.equal(mapCaretOffsetToNormalized(raw, normalized, 2, normalizeCellValue), 2);
});

test("caret maps through comma normalization", () => {
  const raw = "ab\ncd";
  const normalized = normalizeCellValue(raw);
  assert.equal(normalized, "ab, cd");
  assert.equal(mapCaretOffsetToNormalized(raw, normalized, 3, normalizeCellValue), normalizeCellValue("ab\n").length);
});
