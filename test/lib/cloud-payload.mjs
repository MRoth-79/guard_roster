/** Testable port of apps-script/Code.gs payload storage. Keep in sync with production Code.gs. */

export const LEGACY_VERSION = "legacy";
export const MAX_CHUNK_BYTES = 8500;

export function splitIntoByteChunks(text) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    let lo = i + 1;
    let hi = text.length;
    let best = lo;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const slice = text.substring(i, mid);
      if (Buffer.byteLength(slice, "utf8") <= MAX_CHUNK_BYTES) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (best <= i) best = i + 1;
    chunks.push(text.substring(i, best));
    i = best;
  }
  return chunks;
}

export function clearChunks(props, baseKey) {
  const n = Number(props.getProperty(baseKey + "__n") || "0");
  for (let i = 0; i < n; i += 1) {
    props.deleteProperty(baseKey + "__" + i);
  }
  props.deleteProperty(baseKey + "__n");
  props.deleteProperty(baseKey + "__savedAt");
}

export function readPayloadFromKey(props, baseKey) {
  const n = Number(props.getProperty(baseKey + "__n") || "0");
  if (!n) return null;
  const parts = [];
  for (let i = 0; i < n; i += 1) {
    parts.push(props.getProperty(baseKey + "__" + i) || "");
  }
  try {
    return {
      data: JSON.parse(parts.join("")),
      savedAt: props.getProperty(baseKey + "__savedAt") || "",
    };
  } catch {
    return null;
  }
}

export function writeChunks(props, baseKey, text) {
  const chunks = splitIntoByteChunks(text);
  for (let i = 0; i < chunks.length; i += 1) {
    props.setProperty(baseKey + "__" + i, chunks[i]);
  }
  props.setProperty(baseKey + "__n", String(chunks.length));
}

function readManifest(props, baseKey) {
  const raw = props.getProperty(baseKey + "__manifest");
  if (!raw) return null;
  try {
    const manifest = JSON.parse(raw);
    if (!manifest?.activeVersion) return null;
    return manifest;
  } catch {
    return null;
  }
}

function writeManifest(props, baseKey, manifest) {
  props.setProperty(baseKey + "__manifest", JSON.stringify(manifest));
}

function versionStorageKey(baseKey, versionId) {
  if (versionId === LEGACY_VERSION) return baseKey;
  return `${baseKey}__ver_${versionId}`;
}

function hasLegacyPayload(props, baseKey) {
  return Number(props.getProperty(baseKey + "__n") || "0") > 0;
}

function payloadsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function readVersionPayload(props, baseKey, versionId) {
  if (!versionId) return null;
  return readPayloadFromKey(props, versionStorageKey(baseKey, versionId));
}

function cleanupOldVersions(props, baseKey, activeVersion, previousVersion) {
  const keep = { [activeVersion]: true };
  if (previousVersion) keep[previousVersion] = true;
  keep[LEGACY_VERSION] = previousVersion === LEGACY_VERSION || activeVersion === LEGACY_VERSION;

  for (const key of props.getKeys()) {
    const prefix = `${baseKey}__ver_`;
    if (!key.startsWith(prefix)) continue;
    const versionId = key.slice(prefix.length).split("__")[0];
    if (keep[versionId]) continue;
    clearChunks(props, prefix + versionId);
    props.deleteProperty(`${prefix + versionId}__savedAt`);
  }
}

let versionCounter = 0;

export function resetVersionCounter() {
  versionCounter = 0;
}

function nextVersionId() {
  versionCounter += 1;
  return `${Date.now()}_${versionCounter}`;
}

export function writePayload(props, baseKey, payloadObj, options = {}) {
  const text = JSON.stringify(payloadObj);
  const savedAt = options.savedAt || new Date().toISOString();
  const manifest = readManifest(props, baseKey);
  const newVersion = options.versionId || nextVersionId();
  const versionKey = versionStorageKey(baseKey, newVersion);

  writeChunks(props, versionKey, text);
  props.setProperty(`${versionKey}__savedAt`, savedAt);

  const staged = readPayloadFromKey(props, versionKey);
  if (!staged || !payloadsEqual(staged.data, payloadObj)) {
    clearChunks(props, versionKey);
    props.deleteProperty(`${versionKey}__savedAt`);
    throw new Error("save validation failed");
  }

  let previousVersion = null;
  if (manifest?.activeVersion) {
    previousVersion = manifest.activeVersion;
  } else if (hasLegacyPayload(props, baseKey)) {
    previousVersion = LEGACY_VERSION;
  }

  if (options.failBeforeManifest) {
    throw new Error("Injected failure before manifest commit");
  }

  writeManifest(props, baseKey, {
    activeVersion: newVersion,
    previousVersion,
    savedAt,
  });

  cleanupOldVersions(props, baseKey, newVersion, previousVersion);
  return savedAt;
}

export function readPayload(props, baseKey) {
  const manifest = readManifest(props, baseKey);
  if (manifest?.activeVersion) {
    const active = readVersionPayload(props, baseKey, manifest.activeVersion);
    if (active?.data) return active;
    if (manifest.previousVersion) {
      const previous = readVersionPayload(props, baseKey, manifest.previousVersion);
      if (previous?.data) return previous;
    }
  }
  return readPayloadFromKey(props, baseKey);
}

export function writeLegacyPayload(props, baseKey, payloadObj, savedAt = new Date().toISOString()) {
  writeChunks(props, baseKey, JSON.stringify(payloadObj));
  props.setProperty(`${baseKey}__savedAt`, savedAt);
}
