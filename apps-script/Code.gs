/**
 * Guard Roster cloud save/load Web App.
 *
 * Deploy: Deploy → New deployment → Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Then paste the /exec URL into core/constants.js → DEFAULT_WEB_APP_URL
 */

// Password lives in Project Settings -> Script Properties (key: CLOUD_PASSWORD), never in code.
function getCloudPassword_() {
  var pw = PropertiesService.getScriptProperties().getProperty("CLOUD_PASSWORD");
  if (!pw) {
    throw new Error("Server is not configured: CLOUD_PASSWORD script property is missing");
  }
  return pw;
}
var PROP_PREFIX = "roster_v1_";
var MAX_CHUNK_BYTES = 8500;

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseRequest_(e) {
  if (e && e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  if (e && e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }
  if (e && e.parameter) {
    return e.parameter;
  }
  return {};
}

function weekKey_(startDate) {
  var key = String(startDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    throw new Error("חסר תאריך שבוע תקין (startDate)");
  }
  return PROP_PREFIX + key;
}

function clearChunks_(props, baseKey) {
  var n = Number(props.getProperty(baseKey + "__n") || "0");
  var i;
  for (i = 0; i < n; i++) {
    props.deleteProperty(baseKey + "__" + i);
  }
  props.deleteProperty(baseKey + "__n");
  props.deleteProperty(baseKey + "__savedAt");
}

function splitIntoByteChunks_(text) {
  var chunks = [];
  var i = 0;
  while (i < text.length) {
    var lo = i + 1;
    var hi = text.length;
    var best = lo;
    while (lo <= hi) {
      var mid = Math.floor((lo + hi) / 2);
      var slice = text.substring(i, mid);
      if (Utilities.newBlob(slice).getBytes().length <= MAX_CHUNK_BYTES) {
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

var LEGACY_VERSION = "legacy";

function readPayloadFromKey_(baseKey) {
  var props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty(baseKey + "__n") || "0");
  if (!n) return null;
  var parts = [];
  var i;
  for (i = 0; i < n; i++) {
    parts.push(props.getProperty(baseKey + "__" + i) || "");
  }
  try {
    return {
      data: JSON.parse(parts.join("")),
      savedAt: props.getProperty(baseKey + "__savedAt") || "",
    };
  } catch (err) {
    return null;
  }
}

function writeChunks_(props, baseKey, text) {
  var chunks = splitIntoByteChunks_(text);
  var i;
  for (i = 0; i < chunks.length; i++) {
    props.setProperty(baseKey + "__" + i, chunks[i]);
  }
  props.setProperty(baseKey + "__n", String(chunks.length));
}

function readManifest_(props, baseKey) {
  var raw = props.getProperty(baseKey + "__manifest");
  if (!raw) return null;
  try {
    var manifest = JSON.parse(raw);
    if (!manifest || !manifest.activeVersion) return null;
    return manifest;
  } catch (err) {
    return null;
  }
}

function writeManifest_(props, baseKey, manifest) {
  props.setProperty(baseKey + "__manifest", JSON.stringify(manifest));
}

function versionStorageKey_(baseKey, versionId) {
  if (versionId === LEGACY_VERSION) return baseKey;
  return baseKey + "__ver_" + versionId;
}

function hasLegacyPayload_(props, baseKey) {
  return Number(props.getProperty(baseKey + "__n") || "0") > 0;
}

function payloadsEqual_(left, right) {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch (err) {
    return false;
  }
}

function readVersionPayload_(props, baseKey, versionId) {
  if (!versionId) return null;
  return readPayloadFromKey_(versionStorageKey_(baseKey, versionId));
}

function cleanupOldVersions_(props, baseKey, activeVersion, previousVersion) {
  var keep = {};
  keep[activeVersion] = true;
  if (previousVersion) keep[previousVersion] = true;
  keep[LEGACY_VERSION] = previousVersion === LEGACY_VERSION || activeVersion === LEGACY_VERSION;

  var all = props.getKeys();
  var prefix = baseKey + "__ver_";
  var i;
  for (i = 0; i < all.length; i++) {
    var key = all[i];
    if (key.indexOf(prefix) !== 0) continue;
    var versionId = key.slice(prefix.length).split("__")[0];
    if (keep[versionId]) continue;
    clearChunks_(props, prefix + versionId);
    props.deleteProperty(prefix + versionId + "__savedAt");
  }
}

function writePayload_(baseKey, payloadObj) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var props = PropertiesService.getScriptProperties();
    var text = JSON.stringify(payloadObj);
    var savedAt = new Date().toISOString();
    var manifest = readManifest_(props, baseKey);
    var newVersion = String(Date.now()) + "_" + Utilities.getUuid().slice(0, 8);
    var versionKey = versionStorageKey_(baseKey, newVersion);

    writeChunks_(props, versionKey, text);
    props.setProperty(versionKey + "__savedAt", savedAt);

    var staged = readPayloadFromKey_(versionKey);
    if (!staged || !payloadsEqual_(staged.data, payloadObj)) {
      clearChunks_(props, versionKey);
      props.deleteProperty(versionKey + "__savedAt");
      throw new Error("שמירה נכשלה: לא ניתן לאמת את הנתונים לפני פרסום");
    }

    var previousVersion = null;
    if (manifest && manifest.activeVersion) {
      previousVersion = manifest.activeVersion;
    } else if (hasLegacyPayload_(props, baseKey)) {
      previousVersion = LEGACY_VERSION;
    }

    writeManifest_(props, baseKey, {
      activeVersion: newVersion,
      previousVersion: previousVersion,
      savedAt: savedAt,
    });

    cleanupOldVersions_(props, baseKey, newVersion, previousVersion);
    return savedAt;
  } finally {
    lock.releaseLock();
  }
}

function readPayload_(baseKey) {
  var props = PropertiesService.getScriptProperties();
  var manifest = readManifest_(props, baseKey);
  if (manifest && manifest.activeVersion) {
    var active = readVersionPayload_(props, baseKey, manifest.activeVersion);
    if (active && active.data) return active;
    if (manifest.previousVersion) {
      var previous = readVersionPayload_(props, baseKey, manifest.previousVersion);
      if (previous && previous.data) return previous;
    }
  }
  return readPayloadFromKey_(baseKey);
}

function snapshotHasAssignments_(snapshot) {
  var matrix = snapshot && snapshot.excelMatrix;
  if (!matrix || !matrix.length) return false;
  var r, c, row, cell;
  for (r = 0; r < matrix.length; r++) {
    row = matrix[r];
    if (!row) continue;
    for (c = 0; c < row.length; c++) {
      cell = String(row[c] || "").replace(/\s+/g, " ").trim();
      if (cell) return true;
    }
  }
  return false;
}

function handle_(req) {
  if (String(req.password || "") !== getCloudPassword_()) {
    return { ok: false, errorCode: "BAD_PASSWORD", error: "סיסמה שגויה" };
  }

  var action = String(req.action || "").toLowerCase();
  if (action === "save") {
    if (!req.snapshot || typeof req.snapshot !== "object") {
      return { ok: false, error: "חסר snapshot לשמירה" };
    }
    if (!snapshotHasAssignments_(req.snapshot)) {
      return { ok: false, error: "אין שמות משובצים לשמירה — סידור ריק לא נשמר" };
    }
    var startDate = req.snapshot.startDate || req.startDate || "";
    var key = weekKey_(startDate);
    var savedAt = writePayload_(key, req.snapshot);
    return { ok: true, action: "save", weekKey: startDate, savedAt: savedAt };
  }

  if (action === "load") {
    var loadDate = req.startDate || (req.snapshot && req.snapshot.startDate) || "";
    var loadKey = weekKey_(loadDate);
    var loaded = readPayload_(loadKey);
    if (!loaded) {
      return { ok: false, error: "לא נמצא סידור שמור לשבוע זה (" + loadDate + ")" };
    }
    return {
      ok: true,
      action: "load",
      weekKey: loadDate,
      savedAt: loaded.savedAt,
      snapshot: loaded.data,
    };
  }

  return { ok: false, error: "action לא תקין (save|load)" };
}

function doPost(e) {
  try {
    return jsonOut_(handle_(parseRequest_(e)));
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet(e) {
  try {
    var req = parseRequest_(e);
    if (req.action) {
      return jsonOut_(handle_(req));
    }
    return jsonOut_({ ok: true, service: "guard_roster_cloud", version: 2 });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
