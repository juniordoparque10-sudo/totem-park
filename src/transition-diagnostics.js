const STORAGE_KEY = "totempark-transition-diagnostics-v21";
const MAX_EVENTS = 160;
const REMOTE_EVENTS = 120;

function uid(now = Date.now) {
  return globalThis.crypto?.randomUUID?.() || `${now()}-${Math.random().toString(16).slice(2)}`;
}

function read(storage) {
  try {
    const value = JSON.parse(storage?.getItem(STORAGE_KEY) || "null");
    return Array.isArray(value?.events) ? value : null;
  } catch {
    return null;
  }
}

export function createTransitionDiagnostics({ identity = {}, storage = globalThis.localStorage, now = Date.now } = {}) {
  const stored = read(storage);
  const sessionId = `${identity.screenId || "unbound"}-${now()}-${uid(now)}`;
  let enabled = false;
  let sequence = Number(stored?.sequence || 0);
  let events = Array.isArray(stored?.events) ? stored.events.slice(-MAX_EVENTS) : [];
  let dirty = false;

  const persist = () => storage?.setItem(STORAGE_KEY, JSON.stringify({ sessionId, sequence, events }));
  return {
    configure(value) { enabled = value === true; return enabled; },
    isEnabled: () => enabled,
    updateIdentity(next = {}) { identity = { ...identity, ...next }; },
    record(eventName, snapshot = {}) {
      if (!enabled) return null;
      const event = {
        timestamp: new Date(now()).toISOString(),
        screenId: identity.screenId || "",
        appVersion: identity.appVersion || "",
        diagnosticSessionId: sessionId,
        eventName,
        ...snapshot,
      };
      events.push(event);
      events = events.slice(-MAX_EVENTS);
      dirty = true;
      persist();
      return event;
    },
    pending() {
      if (!enabled || !dirty) return null;
      sequence += 1;
      persist();
      return {
        schemaVersion: 1,
        sequence,
        session: { ...identity, sessionId, diagnosticSessionId: sessionId },
        transitionDiagnostics: events.slice(-REMOTE_EVENTS),
      };
    },
    acknowledge(ackedSequence) {
      if (Number(ackedSequence) === sequence) dirty = false;
      persist();
    },
    report: () => ({ sessionId, sequence, enabled, dirty, events: events.slice() }),
  };
}

export { MAX_EVENTS as TRANSITION_DIAGNOSTIC_MAX_EVENTS, STORAGE_KEY as TRANSITION_DIAGNOSTIC_STORAGE_KEY };
