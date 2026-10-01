import { OPERATIONAL_TELEMETRY_SCHEMA_VERSION, normalizeOperationalMediaSource } from "./operational-telemetry.js";

const STORAGE_KEY = "totempark-player-telemetry-operational-v1";
const MAX_OUTBOX = 12;
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const TELEMETRY_DEFAULT_CONFIG = Object.freeze({ enabled:false, clientIds:[], screenIds:[], deviceIds:[], syncIntervalMs:SYNC_INTERVAL_MS });

function uid() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
const RUNTIME_SESSION_ID = uid();
const RUNTIME_SESSION_STARTED_AT = new Date().toISOString();
function numeric(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function getStorage(storage) { return storage || globalThis.localStorage; }
function matches(list, value) { return Array.isArray(list) && value && list.includes(value); }

export function isTelemetryAllowed(config = {}, identity = {}) {
  if (config.enabled !== true) return false;
  return matches(config.clientIds, identity.clientId) || matches(config.screenIds, identity.screenId) || matches(config.deviceIds, identity.deviceId);
}

function blank(identity, nowMs, monotonicMs) {
  return {
    schemaVersion:OPERATIONAL_TELEMETRY_SCHEMA_VERSION,
    session:{ sessionId:RUNTIME_SESSION_ID, sessionStartedAt:RUNTIME_SESSION_STARTED_AT, lastHeartbeatAt:null, uptimeSeconds:0, sequence:0, ...identity },
    app:{ packageName:"", versionCode:null, versionName:"" },
    player:{ state:"idle" },
    current:{ playerState:"idle", networkStatus:globalThis.navigator?.onLine === false ? "OFFLINE" : "ONLINE", currentItemId:"", currentItemType:"", currentMediaSource:"UNKNOWN" },
    cache:{ cacheStatus:"", cachedItems:0, totalCacheableItems:0 },
    runtime:{ startedAtMs:nowMs, startedAtMonotonicMs:monotonicMs },
    outbox:[], lastQueuedAtMs:0, lastSyncedSequence:0,
  };
}

function load(storage, identity, nowMs, monotonicMs) {
  let previousOutbox = [];
  let lastSyncedSequence = 0;
  try {
    const parsed = JSON.parse(getStorage(storage).getItem(STORAGE_KEY) || "null");
    previousOutbox = Array.isArray(parsed?.outbox) ? parsed.outbox.slice(-MAX_OUTBOX) : [];
    lastSyncedSequence = numeric(parsed?.lastSyncedSequence);
  } catch { /* a new app execution always starts a new operational session */ }
  const state = blank(identity, nowMs, monotonicMs);
  state.outbox = previousOutbox;
  state.lastSyncedSequence = lastSyncedSequence;
  return state;
}

function save(state, storage) { getStorage(storage).setItem(STORAGE_KEY, JSON.stringify(state)); }

export function createPlayerTelemetry({ identity = {}, storage, now = () => Date.now(), monotonicNow = () => globalThis.performance?.now?.() ?? Date.now() } = {}) {
  let state = load(storage, identity, now(), monotonicNow());
  let enabled = false;
  let syncIntervalMs = SYNC_INTERVAL_MS;
  const persist = () => save(state, storage);
  const snapshot = () => ({ schemaVersion:state.schemaVersion, session:{...state.session}, app:{...state.app}, player:{...state.player}, current:{...state.current}, cache:{...state.cache} });
  return {
    configure(config = {}) { enabled = isTelemetryAllowed(config, state.session); syncIntervalMs = Math.max(60_000, numeric(config.syncIntervalMs) || SYNC_INTERVAL_MS); return enabled; },
    isEnabled: () => enabled,
    updateIdentity(next = {}) { state.session = { ...state.session, ...next }; persist(); },
    updateOperational(next = {}) {
      if (!enabled) return;
      if (next.app) state.app = { ...state.app, ...next.app };
      if (next.playerState) state.player = { state:next.playerState };
      state.current = {
        ...state.current,
        playerState:next.playerState || state.current.playerState,
        networkStatus:next.networkStatus || state.current.networkStatus,
        currentItemId:next.currentItemId ?? state.current.currentItemId,
        currentItemType:next.currentItemType ?? state.current.currentItemType,
        currentMediaSource:next.currentMediaSource || state.current.currentMediaSource,
      };
      if (next.cache) state.cache = { ...state.cache, ...next.cache };
      persist();
    },
    record(type, data = {}) {
      if (!enabled) return;
      if (type === "PLAYBACK_START") state.player.state = state.current.playerState = "playing";
      if (type === "PLAYBACK_ERROR" || type === "error") state.player.state = state.current.playerState = "error";
      if (data.mediaId != null) state.current.currentItemId = data.mediaId;
      if (data.mediaType != null) state.current.currentItemType = data.mediaType;
      if (data.mediaSource) state.current.currentMediaSource = normalizeOperationalMediaSource(data.mediaSource);
      persist();
    },
    increment: () => {}, setOperatingMode: () => {},
    setConnection(networkStatus) { if (!enabled) return; state.current.networkStatus = networkStatus === "OFFLINE" ? "OFFLINE" : "ONLINE"; persist(); },
    startTransition() { if (!enabled) return ""; state.player.state = state.current.playerState = "loading"; persist(); return uid(); },
    completeTransition(transitionId) { if (!enabled || !transitionId) return; state.player.state = state.current.playerState = "playing"; persist(); },
    heartbeat() {
      if (!enabled) return null;
      const nowMs = now();
      state.session.lastHeartbeatAt = new Date(nowMs).toISOString();
      state.session.uptimeSeconds = Math.max(0, Math.floor((monotonicNow() - state.runtime.startedAtMonotonicMs) / 1000));
      const due = nowMs - state.lastQueuedAtMs >= syncIntervalMs;
      if (due) {
        state.session.sequence += 1; state.lastQueuedAtMs = nowMs;
        state.outbox.push({ id:`${state.session.sessionId}:${state.session.sequence}`, sequence:state.session.sequence, createdAt:state.session.lastHeartbeatAt, payload:snapshot() });
        state.outbox = state.outbox.slice(-MAX_OUTBOX);
      }
      persist();
      return { due, snapshot:snapshot(), outbox:state.outbox.map((item) => ({...item})) };
    },
    acknowledge(sequence) { state.lastSyncedSequence = Math.max(state.lastSyncedSequence, numeric(sequence)); state.outbox = state.outbox.filter((item) => item.sequence > state.lastSyncedSequence); persist(); },
    getReport: () => ({ ...snapshot(), outbox:state.outbox.map((item) => ({...item})), enabled }),
  };
}

export function readPlayerTelemetryReport(storage) { try { return JSON.parse(getStorage(storage).getItem(STORAGE_KEY) || "null"); } catch { return null; } }
export { STORAGE_KEY as PLAYER_TELEMETRY_STORAGE_KEY, SYNC_INTERVAL_MS as PLAYER_TELEMETRY_SYNC_INTERVAL_MS };
