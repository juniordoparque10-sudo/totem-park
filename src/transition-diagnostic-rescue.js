export const V20_TRANSITION_DIAGNOSTIC_STORAGE_KEY = "totempark-transition-diagnostics-v20";
export const V21_TRANSITION_DIAGNOSTIC_RESCUE_KEY = "totempark-transition-diagnostics-rescue-v21";
export const V20_DIAGNOSTIC_VERSION = "1.0.0-v20-transition-diagnostic";

function parse(value) {
  try { return JSON.parse(value || "null"); } catch { return null; }
}

export function captureV20TransitionDiagnosticBuffer(storage = globalThis.localStorage, now = Date.now) {
  const existing = parse(storage?.getItem(V21_TRANSITION_DIAGNOSTIC_RESCUE_KEY));
  if (existing?.payload?.events?.length) return existing;

  const raw = storage?.getItem(V20_TRANSITION_DIAGNOSTIC_STORAGE_KEY);
  const source = parse(raw);
  if (!source || !Array.isArray(source.events) || source.events.length === 0) return null;

  const sourceAppVersion = source.events.find((event) => event?.appVersion)?.appVersion || "";
  const diagnosticSessionId = source.sessionId
    || source.events.find((event) => event?.diagnosticSessionId)?.diagnosticSessionId
    || "";
  if (sourceAppVersion !== V20_DIAGNOSTIC_VERSION || !diagnosticSessionId) return null;

  const rescue = {
    schemaVersion: 1,
    capturedAt: new Date(now()).toISOString(),
    rescueUploaded: false,
    payload: {
      schemaVersion: 1,
      sourceAppVersion,
      diagnosticSessionId,
      sequence: Number(source.sequence || 0),
      events: source.events,
    },
  };
  storage?.setItem(V21_TRANSITION_DIAGNOSTIC_RESCUE_KEY, JSON.stringify(rescue));
  return rescue;
}

export function readV20TransitionDiagnosticRescue(storage = globalThis.localStorage) {
  return parse(storage?.getItem(V21_TRANSITION_DIAGNOSTIC_RESCUE_KEY));
}

export function markV20TransitionDiagnosticRescueUploaded(storage = globalThis.localStorage, confirmation = {}, now = Date.now) {
  const rescue = readV20TransitionDiagnosticRescue(storage);
  if (!rescue?.payload?.events?.length) return null;
  const updated = {
    ...rescue,
    rescueUploaded: true,
    uploadedAt: new Date(now()).toISOString(),
    confirmation,
  };
  storage?.setItem(V21_TRANSITION_DIAGNOSTIC_RESCUE_KEY, JSON.stringify(updated));
  return updated;
}
