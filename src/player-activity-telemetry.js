import { safeSetStorageItem } from "./safe-storage.js";

const STORAGE_KEY = "totempark-player-activity-v2a";
export const PLAYER_ACTIVITY_SYNC_ENABLED = true;
const PLAYER_ACTIVITY_MAX_EVENTS = 200;
const PLAYER_ACTIVITY_COMPACTED_EVENTS = 150;

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
  const persist = () => safeSetStorageItem(storage, STORAGE_KEY, JSON.stringify({ ...state, sequence }));
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

function activityBatchHash(value, seed) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildPlayerActivityBatch({ clientId = "", screenId = "", deviceId = "", events = [] } = {}) {
  const identity = {
    clientId:String(clientId || ""),
    screenId:String(screenId || ""),
    deviceId:String(deviceId || ""),
  };
  if (!identity.clientId || !identity.screenId || !identity.deviceId || !Array.isArray(events) || events.length === 0) return null;
  const sanitized = events.slice(0, 3).map(sanitizeActivityEvent);
  if (sanitized.some((event) => !event.id || event.screenId !== identity.screenId || event.atMs <= 0)) return null;
  const byId = new Map(sanitized.map((event) => [event.id, event]));
  const ordered = [...byId.values()].sort((left, right) => left.atMs - right.atMs || left.id.localeCompare(right.id));
  if (ordered.length === 0) return null;
  const fingerprint = ordered.map((event) => event.id).join("|");
  const batchId = `v1-${activityBatchHash(fingerprint, 2166136261)}${activityBatchHash(fingerprint, 2654435769)}`;
  return {
    id:batchId,
    acknowledgedIds:ordered.map((event) => event.id),
    data:{
      schemaVersion:1,
      batchId,
      ...identity,
      firstAtMs:ordered[0].atMs,
      lastAtMs:ordered.at(-1).atMs,
      eventCount:ordered.length,
      events:ordered,
    },
  };
}

export async function syncPlayerActivityBatchDocument({ clientId, screenId, deviceId, events = [], refForBatch, setDoc } = {}) {
  if (!Array.isArray(events) || events.length === 0) return { status:"synced", acknowledgedIds:[] };
  const batch = buildPlayerActivityBatch({ clientId, screenId, deviceId, events });
  if (!batch || typeof refForBatch !== "function" || typeof setDoc !== "function") return { status:"blocked", acknowledgedIds:[] };
  try {
    await setDoc(refForBatch(batch.id), batch.data);
    return { status:"synced", acknowledgedIds:batch.acknowledgedIds, batchId:batch.id };
  } catch (error) {
    const status = String(error?.code || "").includes("permission-denied") ? "blocked" : "retry";
    return { status, acknowledgedIds:[], batchId:batch.id };
  }
}

export async function syncPlayerActivityBatchDocuments({ clientId, screenId, deviceId, events = [], refForBatch, commitBatch } = {}) {
  if (!Array.isArray(events) || events.length === 0) return { status:"synced", acknowledgedIds:[] };
  if (typeof refForBatch !== "function" || typeof commitBatch !== "function") return { status:"blocked", acknowledgedIds:[] };
  const sanitized = events.slice(0, 20).map(sanitizeActivityEvent);
  if (sanitized.some((event) => !event.id || event.screenId !== String(screenId || "") || event.atMs <= 0)) {
    return { status:"blocked", acknowledgedIds:[] };
  }
  const ordered = [...new Map(sanitized.map((event) => [event.id, event])).values()]
    .sort((left, right) => left.atMs - right.atMs || left.id.localeCompare(right.id));
  const batches = [];
  for (let index = 0; index < ordered.length; index += 3) {
    const batch = buildPlayerActivityBatch({ clientId, screenId, deviceId, events:ordered.slice(index, index + 3) });
    if (!batch) return { status:"blocked", acknowledgedIds:[] };
    batches.push(batch);
  }
  try {
    await commitBatch(batches.map((batch) => ({ reference:refForBatch(batch.id), data:batch.data })));
    return { status:"synced", acknowledgedIds:batches.flatMap((batch) => batch.acknowledgedIds), batchIds:batches.map((batch) => batch.id) };
  } catch (error) {
    const status = String(error?.code || "").includes("permission-denied") ? "blocked" : "retry";
    return { status, acknowledgedIds:[], batchIds:batches.map((batch) => batch.id) };
  }
}

export async function syncPlayerActivityBatch({ screenRef, existingEvents = [], events = [], arrayUnion, updateDoc } = {}) {
  const batch = events.slice(0, 20).map(sanitizeActivityEvent).filter((event) => event.id && event.screenId && event.atMs > 0);
  if (batch.length === 0) return { status:"synced", acknowledgedIds:[] };
  const acknowledgedIds = batch.map((event) => event.id);
  const existingById = new Map();
  existingEvents.map(sanitizeActivityEvent).filter((event) => event.id && event.screenId).forEach((event) => existingById.set(event.id, event));
  const newById = new Map();
  batch.filter((event) => !existingById.has(event.id)).forEach((event) => newById.set(event.id, event));
  const newEvents = [...newById.values()].sort((left, right) => left.atMs - right.atMs || left.id.localeCompare(right.id));
  if (newEvents.length === 0) return { status:"synced", acknowledgedIds };
  if (typeof arrayUnion !== "function" || typeof updateDoc !== "function") return { status:"blocked", acknowledgedIds:[] };

  const combinedById = new Map(existingById);
  newEvents.forEach((event) => combinedById.set(event.id, event));
  const combined = [...combinedById.values()].sort((left, right) => left.atMs - right.atMs || left.id.localeCompare(right.id));
  const payload = combined.length > PLAYER_ACTIVITY_MAX_EVENTS
    ? { "telemetry.activity":{ schemaVersion:1, events:combined.slice(-PLAYER_ACTIVITY_COMPACTED_EVENTS) } }
    : {
        "telemetry.activity.schemaVersion":1,
        "telemetry.activity.events":arrayUnion(...newEvents),
      };
  try {
    await updateDoc(screenRef, payload);
    return { status:"synced", acknowledgedIds };
  } catch (error) {
    const status = String(error?.code || "").includes("permission-denied") ? "blocked" : "retry";
    return { status, acknowledgedIds:[] };
  }
}
