import { safeSetStorageItem } from "./safe-storage.js";

export const TELEMETRY_HISTORY_SCHEMA_VERSION = 1;
export const TELEMETRY_HISTORY_STORAGE_KEY = "totempark-player-telemetry-history-v1";
export const TELEMETRY_EVENT_RETENTION_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;
const numeric = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : null;
const iso = (value) => new Date(value).toISOString();
const dateKey = (value) => iso(value).slice(0, 10);
const clone = (value) => JSON.parse(JSON.stringify(value));

function parse(storage) {
  try { return JSON.parse(storage?.getItem?.(TELEMETRY_HISTORY_STORAGE_KEY) || "null") || {}; }
  catch { return {}; }
}

function emptyDay(key, identity) {
  return {
    schemaVersion:TELEMETRY_HISTORY_SCHEMA_VERSION,
    dateKey:key,
    ...identity,
    internetRxBytes:0,
    internetTxBytes:0,
    networkMeasurementSupported:false,
    networkMeasurementSource:"",
    networkMeasuredAt:null,
    measurementCoverageStartedAt:null,
    measurementCoverageEndedAt:null,
    unattributedBoundaryRxBytes:0,
    unattributedBoundaryTxBytes:0,
    mediaDownloadedBytes:0,
    cacheReusedBytes:0,
    trafficAvoidedBytes:0,
    cachePlaybackHits:0,
    remotePlaybackCount:0,
    fallbackPlaybackCount:0,
    cacheablePlaybackCount:0,
    cacheHitRate:null,
    observedUptimeSeconds:0,
    provedPlaybackSeconds:0,
    provedOnlineSeconds:0,
    provedOfflineSeconds:0,
    sessionIds:[],
    sessionCount:0,
    restartCount:0,
    failureCount:0,
    unknownInterruptionCount:0,
    packageName:"",
    versionCode:null,
    versionName:"",
    lastCommunicationAt:null,
    sequence:0,
    _uptimeBySession:{},
  };
}

function publicDay(day) {
  const result = { ...day };
  delete result._uptimeBySession;
  return clone(result);
}

function normalizeIdentity(identity = {}) {
  return {
    clientId:String(identity.clientId || ""),
    screenId:String(identity.screenId || ""),
    deviceId:String(identity.deviceId || ""),
  };
}

export function createTelemetryHistory({ storage = globalThis.localStorage, now = () => Date.now(), identity = {}, retentionDays = TELEMETRY_EVENT_RETENTION_DAYS } = {}) {
  const stored = parse(storage);
  const baseIdentity = normalizeIdentity({ ...(stored.identity || {}), ...identity });
  const state = {
    identity:baseIdentity,
    days:stored.days && typeof stored.days === "object" ? stored.days : {},
    sessions:stored.sessions && typeof stored.sessions === "object" ? stored.sessions : {},
    events:stored.events && typeof stored.events === "object" ? stored.events : {},
    pendingDays:stored.pendingDays && typeof stored.pendingDays === "object" ? stored.pendingDays : {},
    pendingSessions:stored.pendingSessions && typeof stored.pendingSessions === "object" ? stored.pendingSessions : {},
    pendingEvents:stored.pendingEvents && typeof stored.pendingEvents === "object" ? stored.pendingEvents : {},
    processedEventIds:Array.isArray(stored.processedEventIds) ? stored.processedEventIds.slice(-2000) : [],
    openByDomain:stored.openByDomain && typeof stored.openByDomain === "object" ? stored.openByDomain : {},
    currentSessionId:String(stored.currentSessionId || ""),
  };
  const processed = new Set(state.processedEventIds);
  const persist = () => safeSetStorageItem(storage, TELEMETRY_HISTORY_STORAGE_KEY, JSON.stringify(state));
  const ensureDay = (key) => {
    if (!state.days[key]) state.days[key] = emptyDay(key, state.identity);
    else Object.assign(state.days[key], state.identity);
    return state.days[key];
  };
  const queueDay = (day) => {
    day.sequence = Math.max(0, Number(day.sequence) || 0) + 1;
    state.pendingDays[day.dateKey] = publicDay(day);
  };
  const addDuration = (startMs, endMs, field) => {
    let cursor = Number(startMs);
    const end = Number(endMs);
    if (!Number.isFinite(cursor) || !Number.isFinite(end) || end <= cursor) return;
    while (cursor < end) {
      const key = dateKey(cursor);
      const boundary = Date.parse(`${key}T00:00:00.000Z`) + DAY_MS;
      const sliceEnd = Math.min(end, boundary);
      const day = ensureDay(key);
      day[field] += (sliceEnd - cursor) / 1000;
      queueDay(day);
      cursor = sliceEnd;
    }
  };
  const upsertSession = (session, status, observedAt, operational = {}) => {
    const sessionId = String(session?.sessionId || "");
    if (!sessionId) return;
    const previous = state.sessions[sessionId] || {};
    const sequence = Math.max(Number(previous.sequence) || 0, Number(session.sequence) || 0) + 1;
    const value = {
      schemaVersion:TELEMETRY_HISTORY_SCHEMA_VERSION,
      session:{
        sessionId,
        sessionStartedAt:session.sessionStartedAt || previous.session?.sessionStartedAt || null,
        ...state.identity,
      },
      status,
      endConfirmedAt:status === "CONFIRMED" ? iso(observedAt) : null,
      lastObservedAt:iso(observedAt),
      maxUptimeSeconds:Math.max(Number(previous.maxUptimeSeconds) || 0, numeric(session.uptimeSeconds) || 0),
      ...(operational.app ? { app:clone(operational.app) } : previous.app ? { app:previous.app } : {}),
      ...(operational.player ? { player:clone(operational.player) } : previous.player ? { player:previous.player } : {}),
      ...(operational.current ? { current:clone(operational.current) } : previous.current ? { current:previous.current } : {}),
      ...(operational.cache ? { cache:clone(operational.cache) } : previous.cache ? { cache:previous.cache } : {}),
      ...(operational.traffic ? { traffic:clone(operational.traffic) } : previous.traffic ? { traffic:previous.traffic } : {}),
      sequence,
    };
    state.sessions[sessionId] = value;
    state.pendingSessions[sessionId] = clone(value);
  };

  return {
    updateIdentity(next = {}) {
      state.identity = normalizeIdentity({ ...state.identity, ...next });
      persist();
    },
    checkpoint({ trafficDaily, operational } = {}) {
      const observedAt = Number(now());
      const key = String(trafficDaily?.dateKey || dateKey(observedAt));
      const day = ensureDay(key);
      const session = operational?.session || {};
      const sessionId = String(session.sessionId || "");

      if (state.currentSessionId && sessionId && state.currentSessionId !== sessionId) {
        const previous = state.sessions[state.currentSessionId];
        if (previous) {
          if (previous.status !== "CONFIRMED") {
            upsertSession(previous.session, "UNKNOWN_INTERRUPTION", observedAt);
            day.unknownInterruptionCount += 1;
          }
          day.restartCount += 1;
        }
        for (const domain of Object.keys(state.openByDomain)) {
          if (state.openByDomain[domain]?.sessionId !== sessionId) delete state.openByDomain[domain];
        }
      }
      if (sessionId) {
        state.currentSessionId = sessionId;
        if (!day.sessionIds.includes(sessionId)) day.sessionIds.push(sessionId);
        day.sessionCount = day.sessionIds.length;
        const uptime = numeric(session.uptimeSeconds) || 0;
        const startedKey = session.sessionStartedAt ? dateKey(session.sessionStartedAt) : key;
        const prior = day._uptimeBySession[sessionId];
        const baseline = prior?.baseline ?? (startedKey === key ? 0 : uptime);
        day._uptimeBySession[sessionId] = { baseline, maximum:Math.max(prior?.maximum || 0, uptime) };
        day.observedUptimeSeconds = Object.values(day._uptimeBySession).reduce((sum, item) => sum + Math.max(0, item.maximum - item.baseline), 0);
        upsertSession(session, "ACTIVE", observedAt, operational);
      }

      const maxima = {
        internetRxBytes:trafficDaily?.appInternetReceivedBytes,
        internetTxBytes:trafficDaily?.appInternetSentBytes,
        mediaDownloadedBytes:trafficDaily?.mediaDownloadedBytes,
        cacheReusedBytes:trafficDaily?.localMediaReusedBytes,
        trafficAvoidedBytes:trafficDaily?.localMediaReusedBytes,
        cachePlaybackHits:trafficDaily?.cachePlaybackHits,
        remotePlaybackCount:trafficDaily?.remotePlaybackCount,
        fallbackPlaybackCount:trafficDaily?.fallbackPlaybackCount,
      };
      for (const [field, raw] of Object.entries(maxima)) {
        const value = numeric(raw);
        if (value !== null) day[field] = Math.max(day[field], value);
      }
      day.cacheablePlaybackCount = day.cachePlaybackHits + day.remotePlaybackCount + day.fallbackPlaybackCount;
      if (trafficDaily?.networkMeasurementSupported === true) {
        day.networkMeasurementSupported = true;
        day.networkMeasurementSource = String(trafficDaily.networkMeasurementSource || "ANDROID_UID_TRAFFIC_STATS");
        day.networkMeasuredAt = trafficDaily.networkMeasuredAt || day.networkMeasuredAt;
        day.measurementCoverageStartedAt ||= trafficDaily.measurementCoverageStartedAt || null;
        day.measurementCoverageEndedAt = trafficDaily.measurementCoverageEndedAt || day.measurementCoverageEndedAt;
      }
      day.unattributedBoundaryRxBytes = Math.max(day.unattributedBoundaryRxBytes || 0, numeric(trafficDaily?.unattributedBoundaryRxBytes) || 0);
      day.unattributedBoundaryTxBytes = Math.max(day.unattributedBoundaryTxBytes || 0, numeric(trafficDaily?.unattributedBoundaryTxBytes) || 0);
      day.cacheHitRate = day.cacheablePlaybackCount > 0 ? day.cachePlaybackHits / day.cacheablePlaybackCount : null;
      day.packageName = String(operational?.app?.packageName || day.packageName || "");
      day.versionCode = numeric(operational?.app?.versionCode) ?? day.versionCode;
      day.versionName = String(operational?.app?.versionName || day.versionName || "");
      day.lastCommunicationAt = iso(observedAt);
      queueDay(day);
      persist();
      return publicDay(day);
    },

    confirmSessionEnd() {
      const current = state.sessions[state.currentSessionId];
      if (!current) return false;
      upsertSession(current.session, "CONFIRMED", Number(now()));
      state.openByDomain = {};
      persist();
      return true;
    },

    recordEvents(events = []) {
      for (const raw of events) {
        const id = String(raw?.id || "");
        const atMs = Number(raw?.atMs);
        if (!id || processed.has(id) || raw?.screenId !== state.identity.screenId || !Number.isFinite(atMs)) continue;
        const event = {
          schemaVersion:TELEMETRY_HISTORY_SCHEMA_VERSION,
          id,
          ...state.identity,
          sessionId:String(raw.sessionId || ""),
          type:String(raw.type || ""),
          state:String(raw.state || ""),
          domain:raw.domain === "connection" ? "connection" : "playback",
          atMs,
          mediaId:String(raw.mediaId || ""),
          mediaType:String(raw.mediaType || ""),
          reason:String(raw.reason || ""),
          expiresAtMs:atMs + Math.max(1, Number(retentionDays) || TELEMETRY_EVENT_RETENTION_DAYS) * DAY_MS,
        };
        processed.add(id);
        state.processedEventIds = [...state.processedEventIds, id].slice(-2000);
        state.events[id] = event;
        state.pendingEvents[id] = clone(event);

        const day = ensureDay(dateKey(atMs));
        if (event.type === "PLAYBACK_ERROR" || event.type === "ERROR") day.failureCount += 1;
        const previous = state.openByDomain[event.domain];
        if (previous && previous.sessionId && previous.sessionId === event.sessionId && atMs > previous.atMs) {
          if (event.domain === "playback" && ["ACTIVE", "RECOVERED"].includes(previous.state)) addDuration(previous.atMs, atMs, "provedPlaybackSeconds");
          if (event.domain === "connection" && previous.state === "ONLINE") addDuration(previous.atMs, atMs, "provedOnlineSeconds");
          if (event.domain === "connection" && previous.state === "OFFLINE") addDuration(previous.atMs, atMs, "provedOfflineSeconds");
        }
        if (event.domain === "connection" || ["ACTIVE", "RECOVERED"].includes(event.state)) state.openByDomain[event.domain] = event;
        else delete state.openByDomain[event.domain];
        queueDay(day);
      }
      persist();
    },

    pending() {
      const entries = (values) => Object.entries(values).map(([id, data]) => ({ id, data:clone(data) }));
      return { days:entries(state.pendingDays), sessions:entries(state.pendingSessions), events:entries(state.pendingEvents) };
    },

    acknowledge({ days = [], sessions = [], events = [] } = {}) {
      for (const id of days) delete state.pendingDays[String(id)];
      for (const id of sessions) delete state.pendingSessions[String(id)];
      for (const id of events) delete state.pendingEvents[String(id)];
      for (const id of events) delete state.events[String(id)];
      persist();
    },
  };
}
