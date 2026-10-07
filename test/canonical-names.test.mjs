import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalName,
  uniqueCanonicalNames,
  validateNameAliases,
  splitCellNames,
} from "./lib/app-helpers.mjs";

const SYNTHETIC_ALIASES = {
  AlexNickname: "Alex",
};

test("unknown name remains unchanged", () => {
  assert.equal(canonicalName("Dana", {}), "Dana");
});

test("alias resolves to canonical identity", () => {
  assert.equal(canonicalName("AlexNickname", SYNTHETIC_ALIASES), "Alex");
});

test("duplicate spellings collapse to one person in a shift", () => {
  const names = uniqueCanonicalNames(splitCellNames("Alex, AlexNickname"), SYNTHETIC_ALIASES);
  assert.deepEqual(names, ["Alex"]);
});

test("two different people are not merged without explicit map entry", () => {
  const names = uniqueCanonicalNames(splitCellNames("Alex, Dana"), SYNTHETIC_ALIASES);
  assert.deepEqual(names, ["Alex", "Dana"]);
});

test("alias cycles are rejected", () => {
  assert.throws(
    () => validateNameAliases({ A: "B", B: "A" }),
    /Alias cycle detected/,
  );
});
