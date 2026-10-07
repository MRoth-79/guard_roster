import test from "node:test";
import assert from "node:assert/strict";

test("clear handler shape includes availabilityMatrix in store update", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../ui/layout.js", import.meta.url), "utf8"));
  assert.match(source, /availabilityMatrix:\s*app\.state\.availabilityMatrix/);
  assert.match(source, /parsedData:\s*null/);
});
