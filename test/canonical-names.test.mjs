import test from "node:test";
import assert from "node:assert/strict";
import { normalizeKey, splitCellNames } from "../utils/text.js";
import {
  canonicalName as canonicalNameFn,
  uniqueCanonicalNames as uniqueCanonicalNamesFn,
  validateNameAliases,
} from "../utils/names.js";

const SYNTHETIC_ALIASES = {
  AlexNickname: "Alex",
};

function makeCtx(aliases = SYNTHETIC_ALIASES) {
  return {
    normalizeKey,
    C: { NAME_ALIASES: aliases },
  };
}

test("unknown name remains unchanged", () => {
  assert.equal(canonicalNameFn.call(makeCtx({}), "Dana"), "Dana");
});

test("alias resolves to canonical identity", () => {
  assert.equal(canonicalNameFn.call(makeCtx(), "AlexNickname"), "Alex");
});

test("duplicate spellings collapse to one person in a shift", () => {
  const ctx = makeCtx();
  const names = uniqueCanonicalNamesFn.call(ctx, splitCellNames.call(ctx, "Alex, AlexNickname"));
  assert.deepEqual(names, ["Alex"]);
});

test("two different people are not merged without explicit map entry", () => {
  const ctx = makeCtx();
  const names = uniqueCanonicalNamesFn.call(ctx, splitCellNames.call(ctx, "Alex, Dana"));
  assert.deepEqual(names, ["Alex", "Dana"]);
});

test("alias cycles are rejected", () => {
  assert.throws(
    () => validateNameAliases({ A: "B", B: "A" }),
    /Alias cycle detected/,
  );
});
