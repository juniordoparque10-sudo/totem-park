const STORAGE_KEY = "totempark-player-activity-v2a";

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
  const emit = (type, activityState, item = {}, reason = "") => {
    sequence += 1;
    const media = normalizeItem(item);
    const atMs = Number(now());
    const event = {
      id: `${state.identity.screenId || "screen"}:${atMs}:${sequence}`,
      screenId: String(state.identity.screenId || ""),
      type,
      state: activityState,
      atMs,
      mediaId: media.mediaId,
      mediaType: media.mediaType,
      reason: String(reason || ""),
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
