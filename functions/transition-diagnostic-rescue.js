const ALLOWED_SOURCE_VERSIONS = new Set([
  "1.0.0-v20-transition-diagnostic",
  "1.0.0-v21-transition-diagnostic-rescue",
]);
const MAX_EVENTS = 160;
const MAX_PAYLOAD_BYTES = 400000;

function text(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function validateRescueRequest({ authUid, data = {}, screen = null }) {
  if (!authUid) return { error: ["unauthenticated", "Player authentication is required."] };
  if (!screen) return { error: ["not-found", "Screen was not found."] };
  if (screen.templatesV2TestMode !== true) return { error: ["permission-denied", "Templates V2 test mode is not active."] };

  const deviceId = text(data.deviceId);
  const registeredDeviceId = text(screen.connectedDeviceId || screen.activeDeviceId);
  if (!deviceId || !registeredDeviceId || deviceId !== registeredDeviceId) {
    return { error: ["permission-denied", "Device does not match the registered screen."] };
  }
  const sourceAppVersion = text(data.sourceAppVersion, 80);
  if (!ALLOWED_SOURCE_VERSIONS.has(sourceAppVersion)) return { error: ["invalid-argument", "Unsupported diagnostic source version."] };
  const diagnosticSessionId = text(data.diagnosticSessionId, 180);
  if (!diagnosticSessionId || !Array.isArray(data.events) || data.events.length < 1 || data.events.length > MAX_EVENTS) {
    return { error: ["invalid-argument", "Diagnostic payload is invalid."] };
  }
  const payloadBytes = Buffer.byteLength(JSON.stringify(data), "utf8");
  if (payloadBytes > MAX_PAYLOAD_BYTES) return { error: ["invalid-argument", "Diagnostic payload is too large."] };

  const events = data.events.map((event) => ({ ...event }));
  for (const event of events) {
    if (!event || typeof event !== "object" || Array.isArray(event)) return { error: ["invalid-argument", "Diagnostic event is invalid."] };
    if (!text(event.timestamp, 40) || !text(event.eventName, 100)) return { error: ["invalid-argument", "Diagnostic event metadata is incomplete."] };
    if (event.appVersion && text(event.appVersion, 80) !== sourceAppVersion) return { error: ["invalid-argument", "Diagnostic event version mismatch."] };
  }
  return { value: { deviceId, sourceAppVersion, diagnosticSessionId, events, sequence: Number(data.sequence || 0), payloadBytes } };
}

module.exports = { ALLOWED_SOURCE_VERSIONS, MAX_EVENTS, MAX_PAYLOAD_BYTES, validateRescueRequest };
