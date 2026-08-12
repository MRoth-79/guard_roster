/**
 * Guard Roster cloud save/load Web App.
 *
 * Deploy: Deploy → New deployment → Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Then paste the /exec URL into core/constants.js → DEFAULT_WEB_APP_URL
 */

var CLOUD_PASSWORD = "2244";
var PROP_PREFIX = "roster_v1_";
var CHUNK_SIZE = 8000;

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

function writePayload_(baseKey, payloadObj) {
  var props = PropertiesService.getScriptProperties();
  var text = JSON.stringify(payloadObj);
  clearChunks_(props, baseKey);
  var n = Math.ceil(text.length / CHUNK_SIZE) || 1;
  var i;
  for (i = 0; i < n; i++) {
    props.setProperty(baseKey + "__" + i, text.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
  }
  props.setProperty(baseKey + "__n", String(n));
  var savedAt = new Date().toISOString();
  props.setProperty(baseKey + "__savedAt", savedAt);
  return savedAt;
}

function readPayload_(baseKey) {
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

function handle_(req) {
  if (String(req.password || "") !== CLOUD_PASSWORD) {
    return { ok: false, error: "סיסמה שגויה" };
  }

  var action = String(req.action || "").toLowerCase();
  if (action === "save") {
    if (!req.snapshot || typeof req.snapshot !== "object") {
      return { ok: false, error: "חסר snapshot לשמירה" };
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
    return jsonOut_({ ok: true, service: "guard_roster_cloud", version: 1 });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
