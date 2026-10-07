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

function readPayloadFromKey_(baseKey) {
  var props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty(baseKey + "__n") || "0");
  if (!n) return null;
  var parts = [];
  var i;
  for (i = 0; i < n; i++) {
    parts.push(props.getProperty(baseKey + "__" + i) || "");
  }
  return {
    data: JSON.parse(parts.join("")),
    savedAt: props.getProperty(baseKey + "__savedAt") || "",
  };
}

function writeChunks_(props, baseKey, text) {
  var chunks = splitIntoByteChunks_(text);
  var i;
  for (i = 0; i < chunks.length; i++) {
    props.setProperty(baseKey + "__" + i, chunks[i]);
  }
  props.setProperty(baseKey + "__n", String(chunks.length));
}

function writePayload_(baseKey, payloadObj) {
  var props = PropertiesService.getScriptProperties();
  var text = JSON.stringify(payloadObj);
  var stagingKey = baseKey + "__staging";
  var savedAt = new Date().toISOString();

  clearChunks_(props, stagingKey);
  writeChunks_(props, stagingKey, text);
  props.setProperty(stagingKey + "__savedAt", savedAt);

  var staged = readPayloadFromKey_(stagingKey);
  if (!staged) {
    clearChunks_(props, stagingKey);
    throw new Error("שמירה נכשלה: לא ניתן לאמת את הנתונים לפני החלפה");
  }

  clearChunks_(props, baseKey);
  var n = Number(props.getProperty(stagingKey + "__n") || "0");
  for (var i = 0; i < n; i++) {
    props.setProperty(baseKey + "__" + i, props.getProperty(stagingKey + "__" + i));
  }
  props.setProperty(baseKey + "__n", String(n));
  props.setProperty(baseKey + "__savedAt", savedAt);
  clearChunks_(props, stagingKey);
  return savedAt;
}

function readPayload_(baseKey) {
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
