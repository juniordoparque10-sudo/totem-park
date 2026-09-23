const STORAGE_KEY = "totempark-player-telemetry-2a2c";
const MAX_EVENTS = 40;
const MAX_TRANSITIONS = 20;
const MAX_OUTBOX = 12;
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const TELEMETRY_DEFAULT_CONFIG = Object.freeze({
  enabled: false,
  clientIds: [],
  screenIds: [],
  deviceIds: [],
  syncIntervalMs: SYNC_INTERVAL_MS,
});

const zeroCounters = () => ({
  cacheHits: 0, cacheMisses: 0, localPlaybackCount: 0, remotePlaybackCount: 0,
  downloadStarts: 0, downloadCompleted: 0, downloadFailed: 0, downloadRetries: 0,
  downloadTimeouts: 0, downloadStalls: 0, bytesDownloaded: 0, partialBytesObserved: 0,
  estimatedTrafficSaved: 0, displayTimeMs: 0, waitingCount: 0, stalledCount: 0,
  waitingDurationMs: 0, stallDurationMs: 0, playbackErrors: 0,
});

function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
const RUNTIME_SESSION_ID = uid();

function blank(identity = {}) {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    session: { sessionId: RUNTIME_SESSION_ID, startedAt: now, lastActivityAt: now, lastHeartbeatAt: null, endedAt: null, sequence: 0, ...identity },
    current: { connectionStatus: globalThis.navigator?.onLine === false ? "OFFLINE" : "ONLINE", mediaSource: "UNKNOWN", dynamicDataSource: globalThis.navigator?.onLine === false ? "OFFLINE" : "INTERNET", operatingMode: "ONLINE", mediaId: "", mediaName: "", mediaType: "", playlistId: "", playbackActive: false, lastPlayerEvent: "SESSION_START", lastError: "", lastErrorAt: null },
    counters: zeroCounters(),
    active: { startedAtMs: Date.now(), waitingStartedAtMs: 0, stalledStartedAtMs: 0 },
    lastPlayerEvents: [], transitions: [], outbox: [], lastQueuedAtMs: 0, lastSyncedSequence: 0,
  };
}

function getStorage(storage) { return storage || globalThis.localStorage; }
function load(storage, identity) {
  try {
    const parsed = JSON.parse(getStorage(storage).getItem(STORAGE_KEY) || "null");
    if (parsed?.schemaVersion === 1) {
      if (parsed.session?.sessionId !== RUNTIME_SESSION_ID) {
        const fresh = blank(identity);
        fresh.outbox = Array.isArray(parsed.outbox) ? parsed.outbox.slice(-MAX_OUTBOX) : [];
        fresh.lastSyncedSequence = numeric(parsed.lastSyncedSequence);
        return fresh;
      }
      parsed.session = { ...parsed.session, ...identity };
      parsed.counters = { ...zeroCounters(), ...parsed.counters };
      return parsed;
    }
  } catch { /* use a fresh local report */ }
  return blank(identity);
}
function save(state, storage) {
  const target = getStorage(storage);
  let json = JSON.stringify(state);
  while (json.length > 512 * 1024 && state.lastPlayerEvents.length > 5) {
    state.lastPlayerEvents.shift();
    json = JSON.stringify(state);
  }
  target.setItem(STORAGE_KEY, json);
}
function numeric(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function eventSnapshot(type, data = {}) {
  return {
    timestamp: new Date().toISOString(), event: type, mediaId: data.mediaId || "",
    mediaSource: data.mediaSource || "UNKNOWN", currentTime: numeric(data.currentTime),
    duration: numeric(data.duration), readyState: numeric(data.readyState), networkState: numeric(data.networkState),
    paused: Boolean(data.paused), ended: Boolean(data.ended), errorCode: data.errorCode || null,
  };
}
function matches(list, value) { return Array.isArray(list) && value && list.includes(value); }

export function isTelemetryAllowed(config = {}, identity = {}) {
  if (config.enabled !== true) return false;
  return matches(config.clientIds, identity.clientId)
    || matches(config.screenIds, identity.screenId)
    || matches(config.deviceIds, identity.deviceId);
}

export function createPlayerTelemetry({ identity = {}, storage } = {}) {
  let state = load(storage, identity);
  let enabled = false;
  let syncIntervalMs = SYNC_INTERVAL_MS;
  const persist = () => save(state, storage);
  const touch = () => { state.session.lastActivityAt = new Date().toISOString(); };
  const pushEvent = (type, data = {}) => {
    if (!enabled) return;
    touch();
    state.current.lastPlayerEvent = type;
    state.lastPlayerEvents.push(eventSnapshot(type, data));
    state.lastPlayerEvents = state.lastPlayerEvents.slice(-MAX_EVENTS);
    persist();
  };
  const closeDuration = (field, counter) => {
    const started = state.active[field];
    if (!started) return;
    state.counters[counter] += Math.max(0, Date.now() - started);
    state.active[field] = 0;
  };
  const snapshot = ({ remote = false } = {}) => ({
    schemaVersion: state.schemaVersion,
    session: { ...state.session }, current: { ...state.current }, counters: { ...state.counters },
    lastPlayerEvents: state.lastPlayerEvents.slice(-(remote ? 8 : MAX_EVENTS)), transitions: state.transitions.slice(-(remote ? 5 : MAX_TRANSITIONS)),
  });
  return {
    configure(config = {}) {
      enabled = isTelemetryAllowed(config, state.session);
      syncIntervalMs = Math.max(60_000, numeric(config.syncIntervalMs) || SYNC_INTERVAL_MS);
      return enabled;
    },
    isEnabled: () => enabled,
    updateIdentity(next = {}) { state.session = { ...state.session, ...next }; persist(); },
    record(type, data = {}) {
      if (!enabled) return;
      const source = data.mediaSource || state.current.mediaSource;
      state.current = { ...state.current, mediaId: data.mediaId ?? state.current.mediaId, mediaName: data.mediaName ?? state.current.mediaName, mediaType: data.mediaType ?? state.current.mediaType, playlistId: data.playlistId ?? state.current.playlistId, mediaSource: source || "UNKNOWN" };
      if (type === "PLAYBACK_START") {
        if (!state.current.playbackActive) {
          state.counters[source === "CACHE_LOCAL" ? "localPlaybackCount" : "remotePlaybackCount"] += 1;
          if (source === "CACHE_LOCAL") state.counters.estimatedTrafficSaved += numeric(data.sizeBytes);
        }
        state.current.playbackActive = true;
        state.current.operatingMode = source === "CACHE_LOCAL" ? "LOCAL" : source === "INTERNET_FALLBACK" ? "ONLINE" : state.current.operatingMode;
      }
      if (["PLAYBACK_END", "PLAYBACK_ERROR", "ended", "error", "abort", "emptied"].includes(type)) state.current.playbackActive = false;
      if (type === "PLAYBACK_ERROR" || type === "error") {
        state.counters.playbackErrors += 1; state.current.lastError = data.message || "Playback error"; state.current.lastErrorAt = new Date().toISOString();
      }
      if (type === "waiting") { state.counters.waitingCount += 1; state.active.waitingStartedAtMs ||= Date.now(); }
      if (type === "stalled") { state.counters.stalledCount += 1; state.active.stalledStartedAtMs ||= Date.now(); }
      if (["playing", "canplay", "ended", "error", "abort", "emptied"].includes(type)) { closeDuration("waitingStartedAtMs", "waitingDurationMs"); closeDuration("stalledStartedAtMs", "stallDurationMs"); }
      pushEvent(type, { ...data, mediaSource: source });
    },
    increment(name, amount = 1) { if (!enabled || !(name in state.counters)) return; state.counters[name] += numeric(amount); touch(); persist(); },
    setConnection(connectionStatus) { if (!enabled) return; state.current.connectionStatus = connectionStatus; state.current.dynamicDataSource = connectionStatus === "OFFLINE" ? "OFFLINE" : "INTERNET"; pushEvent(`NETWORK_${connectionStatus}`); },
    setOperatingMode(mode) { if (!enabled) return; state.current.operatingMode = mode; persist(); },
    startTransition(data = {}) {
      if (!enabled) return "";
      state.current.playbackActive = false;
      const transitionId = uid();
      state.transitions.push({ transitionId, fromMediaId: data.fromMediaId || "", toMediaId: data.toMediaId || "", transitionStartedAt: new Date().toISOString(), transitionCompletedAt: null, transitionDurationMs: 0, reason: data.reason || "UNKNOWN", result: "UNKNOWN" });
      state.transitions = state.transitions.slice(-MAX_TRANSITIONS); pushEvent("MEDIA_CHANGE", data); return transitionId;
    },
    completeTransition(transitionId, result = "SUCCESS") {
      if (!enabled || !transitionId) return;
      const item = state.transitions.find((entry) => entry.transitionId === transitionId); if (!item) return;
      item.transitionCompletedAt = new Date().toISOString(); item.transitionDurationMs = Math.max(0, Date.now() - Date.parse(item.transitionStartedAt)); item.result = result; pushEvent("TRANSITION_COMPLETE", { mediaId: item.toMediaId });
    },
    heartbeat() {
      if (!enabled) return null;
      state.session.lastHeartbeatAt = new Date().toISOString();
      state.counters.displayTimeMs = Math.max(state.counters.displayTimeMs, Date.now() - Date.parse(state.session.startedAt));
      const due = Date.now() - state.lastQueuedAtMs >= syncIntervalMs;
      if (due) {
        state.session.sequence += 1; state.lastQueuedAtMs = Date.now();
        state.outbox.push({ id: `${state.session.sessionId}:${state.session.sequence}`, sequence: state.session.sequence, createdAt: new Date().toISOString(), payload: snapshot({ remote: true }) });
        state.outbox = state.outbox.slice(-MAX_OUTBOX);
      }
      persist();
      return { due, snapshot: snapshot({ remote: true }), outbox: state.outbox.map((item) => ({ ...item })) };
    },
    acknowledge(sequence) { state.lastSyncedSequence = Math.max(state.lastSyncedSequence, numeric(sequence)); state.outbox = state.outbox.filter((item) => item.sequence > state.lastSyncedSequence); persist(); },
    getReport: () => ({ ...snapshot(), outbox: state.outbox.map((item) => ({ ...item })), enabled }),
  };
}

export function readPlayerTelemetryReport(storage) {
  try { return JSON.parse(getStorage(storage).getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

export { STORAGE_KEY as PLAYER_TELEMETRY_STORAGE_KEY, SYNC_INTERVAL_MS as PLAYER_TELEMETRY_SYNC_INTERVAL_MS };
