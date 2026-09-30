export const STORAGE_KEY = "totempark-sealed-telemetry-2a2c";
export const VERSION_STORAGE_KEY = "totempark-sealed-telemetry-version";
export const HISTORY_AT_KEY = "totempark-sealed-telemetry-history-at";
export const CURRENT_KEY_STORAGE_KEY = "totempark-sealed-telemetry-current-key";
export const TELEMETRY_SCHEMA_VERSION = 3;
export const APP_VERSION = "1.0-player-2a2-c-operational-telemetry-v1";
export const CHECKPOINT_MS = 60_000;
export const HISTORY_MS = 15 * 60_000;
const MAX_OUTBOX = 12;

export function migrateTelemetryStorage(storage) {
  const version = `${TELEMETRY_SCHEMA_VERSION}:${APP_VERSION}`;
  try {
    if (storage.getItem(VERSION_STORAGE_KEY) === version) return false;
    for (const key of [STORAGE_KEY, HISTORY_AT_KEY, CURRENT_KEY_STORAGE_KEY]) storage.removeItem(key);
    storage.setItem(VERSION_STORAGE_KEY, version);
    return true;
  } catch { return false; }
}

export function currentSessionCheckpoint(pending, sessionId) {
  return pending.filter((item) => item.payload?.session?.sessionId === sessionId).at(-1) || null;
}

export function isAllowed(config, identity) {
  return Boolean(config?.enabled === true && (
    config.screenIds?.includes(identity.screenId)
    || config.clientIds?.includes(identity.clientId)
    || config.deviceIds?.includes(identity.deviceId)
  ));
}

function freshState(identity, now) {
  return {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    session: {
      ...identity,
      sessionId: globalThis.crypto?.randomUUID?.() || `${now}-${Math.random().toString(16).slice(2)}`,
      startedAt: new Date(now).toISOString(),
      sequence: 0,
      appVersion: APP_VERSION,
      platform: "ANDROID",
    },
    outbox: [],
    lastQueuedAtMs: 0,
  };
}

// Operational V1 never queries or subscribes to video, image, or playback events.
export function createObserver({ storage = localStorage, now = Date.now, onCheckpoint = () => {} } = {}) {
  let state = null;
  let enabled = false;
  let timer = null;

  function persist() {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Optional outbox. */ }
  }

  function checkpoint() {
    if (!enabled || !state) return;
    const tick = now();
    if (state.lastQueuedAtMs && tick - state.lastQueuedAtMs < CHECKPOINT_MS) return;
    state.session.sequence += 1;
    state.lastQueuedAtMs = tick;
    const payload = {
      schemaVersion: TELEMETRY_SCHEMA_VERSION,
      session: {
        clientId: state.session.clientId,
        screenId: state.session.screenId,
        deviceId: state.session.deviceId,
        sessionId: state.session.sessionId,
        startedAt: state.session.startedAt,
        sequence: state.session.sequence,
        appVersion: APP_VERSION,
      },
      current: {
        connectionStatus: navigator.onLine ? "ONLINE" : "OFFLINE",
        lastSignalAt: new Date(tick).toISOString(),
      },
      counters: { activeTimeMs: Math.max(0, tick - Date.parse(state.session.startedAt)) },
    };
    const item = { sessionId: state.session.sessionId, sequence: state.session.sequence, payload };
    state.outbox.push(item);
    state.outbox = state.outbox.slice(-MAX_OUTBOX);
    persist();
    onCheckpoint(item);
  }

  return {
    start(identity) {
      if (state) return;
      migrateTelemetryStorage(storage);
      state = freshState(identity, now());
      // A new process always has a new session; old snapshots cannot become current.
      timer = setInterval(checkpoint, CHECKPOINT_MS);
    },
    setEnabled(value) {
      const next = Boolean(value);
      if (next && !enabled) {
        enabled = true;
        checkpoint();
      } else enabled = next;
    },
    checkpoint,
    canSync: () => Boolean(enabled && state),
    pending: () => state?.outbox.slice() || [],
    currentSessionId: () => state?.session.sessionId || null,
    acknowledge(sessionId, sequence) {
      if (!state) return;
      state.outbox = state.outbox.filter((item) =>
        item.payload?.session?.sessionId !== sessionId || item.sequence > Number(sequence));
      persist();
    },
    report: () => state && JSON.parse(JSON.stringify(state)),
    stop() { enabled = false; clearInterval(timer); timer = null; state = null; },
  };
}
