const STORAGE_KEY = "totempark-player-activity-v2a";
export const PLAYER_ACTIVITY_SYNC_ENABLED = true;

function safeParse(value) {
  try { return JSON.parse(value || "null"); } catch { return null; }
}

function normalizeItem(item = {}) {
  return {
    mediaId: String(item.mediaId || item.id || item.templateId || ""),
    mediaType: String(item.mediaType || item.playerItemType || item.type || "unknown").toLowerCase(),
  };
}

export function createPlayerActivityTelemetry({ storage = globalThis.localStorage, now = () => Date.now(), maxEvents = 200, identity = {} } = {}) {
  const stored = safeParse(storage?.getItem?.(STORAGE_KEY));
  let sequence = Number(stored?.sequence || 0);
  let state = {
    identity: { ...(stored?.identity || {}), ...identity },
    connectionStatus: stored?.connectionStatus === "OFFLINE" ? "OFFLINE" : "ONLINE",
    playback: stored?.playback?.status === "ACTIVE" ? stored.playback : { status: "IDLE", mediaId: "", mediaType: "" },
    events: Array.isArray(stored?.events) ? stored.events.slice(-maxEvents) : [],
  };
  const persist = () => storage?.setItem?.(STORAGE_KEY, JSON.stringify({ ...state, sequence }));
  const emit = (type, activityState, item = {}, reason = "", domain = "playback") => {
    sequence += 1;
    const media = normalizeItem(item);
    const atMs = Number(now());
    const event = {
      id: `${state.identity.screenId || "screen"}:${atMs}:${sequence}`,
      screenId: String(state.identity.screenId || ""),
      sessionId: String(state.identity.sessionId || ""),
      type,
      state: activityState,
      atMs,
      mediaId: media.mediaId,
      mediaType: media.mediaType,
      reason: String(reason || ""),
      domain: domain === "connection" ? "connection" : "playback",
    };
    state.events = [...state.events, event].slice(-maxEvents);
    persist();
    return event;
  };
  return {
    updateIdentity(next = {}) { state.identity = { ...state.identity, ...next }; persist(); },
    setConnection(status) {
      const next = status === "OFFLINE" ? "OFFLINE" : "ONLINE";
      if (next === state.connectionStatus) return false;
      state.connectionStatus = next;
      emit("CONNECTION_CHANGE", next, {}, "", "connection");
      persist();
      return true;
    },
    startPlayback(item = {}) {
      const media = normalizeItem(item);
      if (state.playback.status === "ACTIVE" && state.playback.mediaId === media.mediaId && state.playback.mediaType === media.mediaType) return false;
      if (state.playback.status === "INTERRUPTED" && state.playback.mediaId === media.mediaId && state.playback.mediaType === media.mediaType) {
        return this.recover(media);
      }
      if (state.playback.status === "ACTIVE") emit("PLAYBACK_END", "IDLE", state.playback, "ITEM_CHANGED");
      state.playback = { status: "ACTIVE", ...media };
      emit("PLAYBACK_START", "ACTIVE", media);
      persist();
      return true;
    },
    finishPlayback(reason = "ENDED") {
      if (state.playback.status !== "ACTIVE") return false;
      const current = state.playback;
      state.playback = { status: "IDLE", mediaId: "", mediaType: "" };
      emit(reason === "ERROR" ? "PLAYBACK_ERROR" : "PLAYBACK_END", reason === "ERROR" ? "ATTENTION" : "IDLE", current, reason);
      persist();
      return true;
    },
    interrupt(reason = "INTERRUPTED") {
      if (state.playback.status !== "ACTIVE") return false;
      const current = state.playback;
      state.playback = { ...current, status: "INTERRUPTED" };
      emit("INTERRUPTED", "INTERRUPTED", current, reason);
      persist();
      return true;
    },
    recover(item = state.playback) {
      const media = normalizeItem(item);
      if (state.playback.status !== "INTERRUPTED" || !media.mediaId) return false;
      state.playback = { status: "ACTIVE", ...media };
      emit("RECOVERED", "RECOVERED", media);
      persist();
      return true;
    },
    drainBatch(limit = 20) { return state.events.slice(0, Math.max(0, Number(limit) || 0)).map((event) => ({ ...event })); },
    acknowledge(ids = []) {
      const confirmed = new Set(ids.map(String));
      state.events = state.events.filter((event) => !confirmed.has(event.id));
      persist();
    },
    getState() { return { ...state, identity: { ...state.identity }, playback: { ...state.playback }, events: state.events.map((event) => ({ ...event })) }; },
  };
}

export { STORAGE_KEY as PLAYER_ACTIVITY_STORAGE_KEY };

function sanitizeActivityEvent(event = {}) {
  return {
    id: String(event.id || ""),
    screenId: String(event.screenId || ""),
    sessionId: String(event.sessionId || ""),
    type: String(event.type || ""),
    state: String(event.state || ""),
    atMs: Number(event.atMs || 0),
    mediaId: String(event.mediaId || ""),
    mediaType: String(event.mediaType || ""),
    reason: String(event.reason || ""),
    domain: event.domain === "connection" ? "connection" : "playback",
  };
}

export async function syncPlayerActivityBatch({ screenRef, existingEvents = [], events = [], updateDoc } = {}) {
  const batch = events.slice(0, 20).map(sanitizeActivityEvent).filter((event) => event.id && event.screenId && event.atMs > 0);
  if (batch.length === 0) return { status:"synced", acknowledgedIds:[] };
  const byId = new Map();
  [...existingEvents, ...batch].map(sanitizeActivityEvent).filter((event) => event.id && event.screenId).forEach((event) => byId.set(event.id, event));
  const history = [...byId.values()].sort((left, right) => left.atMs - right.atMs || left.id.localeCompare(right.id)).slice(-200);
  try {
    await updateDoc(screenRef, { "telemetry.activity":{ schemaVersion:1, events:history } });
    return { status:"synced", acknowledgedIds:batch.map((event) => event.id) };
  } catch (error) {
    const status = String(error?.code || "").includes("permission-denied") ? "blocked" : "retry";
    return { status, acknowledgedIds:[] };
  }
}
