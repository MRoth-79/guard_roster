import test from "node:test";
import assert from "node:assert/strict";
import { MockScriptProperties } from "./lib/mock-props.mjs";
import {
  readPayload,
  writePayload,
  writeLegacyPayload,
  resetVersionCounter,
  splitIntoByteChunks,
  readManifestForTest,
} from "./lib/cloud-payload.mjs";

const BASE = "roster_v1_2026-10-05";

function snapshot(label) {
  return {
    startDate: "2026-10-05",
    excelMatrix: [[["Alex", "", "", "", "", "", ""]]],
    label,
  };
}

test("legacy payload loads before first versioned save", () => {
  const props = new MockScriptProperties();
  writeLegacyPayload(props, BASE, snapshot("legacy-A"), "2026-10-05T10:00:00.000Z");
  const loaded = readPayload(props, BASE);
  assert.equal(loaded.savedAt, "2026-10-05T10:00:00.000Z");
  assert.equal(loaded.data.label, "legacy-A");
});

test("failed save before manifest keeps previous active payload", () => {
  resetVersionCounter();
  const props = new MockScriptProperties();
  writeLegacyPayload(props, BASE, snapshot("A"), "2026-10-05T10:00:00.000Z");

  assert.throws(
    () => writePayload(props, BASE, snapshot("B"), { failBeforeManifest: true, versionId: "v2" }),
    /Injected failure before manifest commit/,
  );

  const loaded = readPayload(props, BASE);
  assert.equal(loaded.data.label, "A");
});

test("successful save of B loads B with savedAt", () => {
  resetVersionCounter();
  const props = new MockScriptProperties();
  writeLegacyPayload(props, BASE, snapshot("A"), "2026-10-05T10:00:00.000Z");
  const savedAt = writePayload(props, BASE, snapshot("B"), { versionId: "v2", savedAt: "2026-10-05T11:00:00.000Z" });
  const loaded = readPayload(props, BASE);
  assert.equal(savedAt, "2026-10-05T11:00:00.000Z");
  assert.equal(loaded.data.label, "B");
  assert.equal(loaded.savedAt, "2026-10-05T11:00:00.000Z");
});

test("corrupt active version falls back to previous good snapshot", () => {
  resetVersionCounter();
  const props = new MockScriptProperties();
  writePayload(props, BASE, snapshot("A"), { versionId: "v1", savedAt: "2026-10-05T10:00:00.000Z" });
  writePayload(props, BASE, snapshot("B"), { versionId: "v2", savedAt: "2026-10-05T11:00:00.000Z" });

  props.setProperty(`${BASE}__ver_v2__0`, "{not-json");

  const loaded = readPayload(props, BASE);
  assert.equal(loaded.data.label, "A");
});

test("multi-chunk non-ASCII payload round-trips unchanged", () => {
  resetVersionCounter();
  const props = new MockScriptProperties();
  const hebrew = "שומר".repeat(1500);
  const payload = {
    startDate: "2026-10-05",
    excelMatrix: [[[hebrew, "", "", "", "", "", ""]]],
    label: "unicode",
  };
  const chunks = splitIntoByteChunks(JSON.stringify(payload));
  assert.ok(chunks.length > 1);
  writePayload(props, BASE, payload, { versionId: "unicode-v1" });
  const loaded = readPayload(props, BASE);
  assert.equal(loaded.data.excelMatrix[0][0][0], hebrew);
});

test("save with corrupt active keeps older good version as recoverable backup", () => {
  resetVersionCounter();
  const props = new MockScriptProperties();
  writePayload(props, BASE, snapshot("A"), { versionId: "v1", savedAt: "2026-10-05T10:00:00.000Z" });
  writePayload(props, BASE, snapshot("B"), { versionId: "v2", savedAt: "2026-10-05T11:00:00.000Z" });

  props.setProperty(`${BASE}__ver_v2__0`, "{not-json");

  writePayload(props, BASE, snapshot("C"), { versionId: "v3", savedAt: "2026-10-05T12:00:00.000Z" });

  const manifest = readManifestForTest(props, BASE);
  assert.equal(manifest.activeVersion, "v3");
  assert.equal(manifest.previousVersion, "v1");

  assert.ok(props.getProperty(`${BASE}__ver_v1__0`), "good version A must survive cleanup");

  props.setProperty(`${BASE}__ver_v3__0`, "{not-json");

  const fallback = readPayload(props, BASE);
  assert.equal(fallback.data.label, "A");
});
