export const TRAFFIC_TELEMETRY_SCHEMA_VERSION = 4;
export const TRAFFIC_TELEMETRY_STORAGE_KEY = "totempark-player-traffic-v2";

const MAX_DEDUP_ENTRIES = 256;
const COUNTER_KEYS = [
  "mediaDownloadedBytes",
  "localMediaReusedBytes",
  "cachePlaybackHits",
  "remotePlaybackCount",
  "fallbackPlaybackCount",
];

const number = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const iso = (value) => new Date(value).toISOString();
const utcDateKey = (value) => iso(value).slice(0, 10);
const emptyCounters = () => Object.fromEntries(COUNTER_KEYS.map((key) => [key, 0]));
const runtimeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function isTrafficInstrumented(telemetry) {
  return Number(telemetry?.schemaVersion) >= TRAFFIC_TELEMETRY_SCHEMA_VERSION
    && Boolean(telemetry?.traffic && typeof telemetry.traffic === "object");
}

function readStored(storage) {
  try { return JSON.parse(storage?.getItem?.(TRAFFIC_TELEMETRY_STORAGE_KEY) || "null") || {}; }
  catch { return {}; }
}

function boundedUnique(values = []) {
  return [...new Set(values.filter(Boolean))].slice(-MAX_DEDUP_ENTRIES);
}

function createDaily(previous, dateKey, nowIso) {
  if (previous?.dateKey === dateKey) {
    return {
      dateKey,
      periodStartedAt: previous.periodStartedAt || `${dateKey}T00:00:00.000Z`,
      lastUpdatedAt: previous.lastUpdatedAt || nowIso,
      lastNativeRx: Number.isFinite(previous.lastNativeRx) ? previous.lastNativeRx : null,
      lastNativeTx: Number.isFinite(previous.lastNativeTx) ? previous.lastNativeTx : null,
      appInternetReceivedBytes: number(previous.appInternetReceivedBytes),
      appInternetSentBytes: number(previous.appInternetSentBytes),
      ...Object.fromEntries(COUNTER_KEYS.map((key) => [key, number(previous[key])])),
      dedup: boundedUnique(previous.dedup),
    };
  }
  return {
    dateKey,
    periodStartedAt: `${dateKey}T00:00:00.000Z`,
    lastUpdatedAt: nowIso,
    lastNativeRx: null,
    lastNativeTx: null,
    appInternetReceivedBytes: 0,
    appInternetSentBytes: 0,
    ...emptyCounters(),
    dedup: [],
  };
}

export function createTrafficTelemetry({ storage = globalThis.localStorage, now = () => Date.now() } = {}) {
  const startedAtMs = now();
  const startedAt = iso(startedAtMs);
  const stored = readStored(storage);
  const sessionRuntimeId = runtimeId();
  let daily = createDaily(stored.daily, utcDateKey(startedAtMs), startedAt);
  const session = {
    measurementStartedAt: startedAt,
    lastUpdatedAt: startedAt,
    networkMeasurementSupported: null,
    sessionBaselineRx: null,
    sessionBaselineTx: null,
    lastNativeRx: null,
    lastNativeTx: null,
    appInternetReceivedBytes: null,
    appInternetSentBytes: null,
    ...emptyCounters(),
    dedup: [],
    occurrenceOrdinals: {},
    activeOccurrences: {},
  };

  function rotateDaily(nowMs = now()) {
    const nowIso = iso(nowMs);
    daily = createDaily(daily, utcDateKey(nowMs), nowIso);
    return nowIso;
  }

  function persist(nowMs = now()) {
    const nowIso = rotateDaily(nowMs);
    session.lastUpdatedAt = nowIso;
    daily.lastUpdatedAt = nowIso;
    storage?.setItem?.(TRAFFIC_TELEMETRY_STORAGE_KEY, JSON.stringify({ version: 1, daily }));
  }

  function markOnce(key) {
    if (!key || session.dedup.includes(key) || daily.dedup.includes(key)) return false;
    session.dedup = boundedUnique([...session.dedup, key]);
    daily.dedup = boundedUnique([...daily.dedup, key]);
    return true;
  }

  function increment(key, amount = 1) {
    if (!COUNTER_KEYS.includes(key)) return;
    const value = number(amount);
    session[key] += value;
    daily[key] += value;
  }

  function occurrenceBase({ playbackExecutionId, itemId, source }) {
    return `${sessionRuntimeId}|${playbackExecutionId ?? "execution"}|${itemId || "item"}|${source || "UNKNOWN"}`;
  }

  function observePlaybackStart({ playbackExecutionId, itemId, source, mediaType, cacheable = true, isCurrent = true } = {}) {
    if (!isCurrent || !cacheable || mediaType === "TEMPLATE_V2") return null;
    const base = occurrenceBase({ playbackExecutionId, itemId, source });
    let occurrenceId = session.activeOccurrences[base];
    if (!occurrenceId) {
      const ordinal = number(session.occurrenceOrdinals[base]) + 1;
      session.occurrenceOrdinals[base] = ordinal;
      occurrenceId = `${base}|${ordinal}`;
      session.activeOccurrences[base] = occurrenceId;
    }
    if (markOnce(`playback:${occurrenceId}`)) {
      if (source === "LOCAL") increment("cachePlaybackHits");
      else if (source === "FALLBACK") increment("fallbackPlaybackCount");
      else if (source === "REMOTE") increment("remotePlaybackCount");
      persist();
    }
    return occurrenceId;
  }

  function closeOccurrence({ playbackExecutionId, itemId, source, occurrenceId:expectedOccurrenceId } = {}) {
    const base = occurrenceBase({ playbackExecutionId, itemId, source });
    const occurrenceId = session.activeOccurrences[base] || null;
    if (expectedOccurrenceId && occurrenceId !== expectedOccurrenceId) return null;
    delete session.activeOccurrences[base];
    return occurrenceId;
  }

  return {
    recordNetworkStats(stats = {}) {
      const supported = stats.supported === true
        && Number.isFinite(Number(stats.uidRxBytes))
        && Number.isFinite(Number(stats.uidTxBytes));
      if (!supported) {
        session.networkMeasurementSupported = false;
        session.appInternetReceivedBytes = null;
        session.appInternetSentBytes = null;
        persist();
        return;
      }
      const rx = number(stats.uidRxBytes);
      const tx = number(stats.uidTxBytes);
      session.networkMeasurementSupported = true;
      if (session.sessionBaselineRx === null) {
        session.sessionBaselineRx = rx;
        session.sessionBaselineTx = tx;
        session.lastNativeRx = rx;
        session.lastNativeTx = tx;
        session.appInternetReceivedBytes = 0;
        session.appInternetSentBytes = 0;
      } else {
        session.appInternetReceivedBytes += rx >= session.lastNativeRx ? rx - session.lastNativeRx : 0;
        session.appInternetSentBytes += tx >= session.lastNativeTx ? tx - session.lastNativeTx : 0;
        session.lastNativeRx = rx;
        session.lastNativeTx = tx;
      }
      rotateDaily();
      if (daily.lastNativeRx !== null) daily.appInternetReceivedBytes += rx >= daily.lastNativeRx ? rx - daily.lastNativeRx : 0;
      if (daily.lastNativeTx !== null) daily.appInternetSentBytes += tx >= daily.lastNativeTx ? tx - daily.lastNativeTx : 0;
      daily.lastNativeRx = rx;
      daily.lastNativeTx = tx;
      persist();
    },
    recordDownloadComplete({ operationId, bytes } = {}) {
      const value = number(bytes);
      if (!operationId || value <= 0 || !markOnce(`download:${operationId}`)) return false;
      increment("mediaDownloadedBytes", value);
      persist();
      return true;
    },
    observePlaybackStart,
    recordLocalPlaybackComplete({ playbackExecutionId, itemId, source = "LOCAL", bytes, occurrenceId } = {}) {
      const value = number(bytes);
      if (!occurrenceId || source !== "LOCAL" || value <= 0) return false;
      const closedId = closeOccurrence({ playbackExecutionId, itemId, source, occurrenceId });
      if (closedId !== occurrenceId || !markOnce(`reuse:${occurrenceId}`)) return false;
      increment("localMediaReusedBytes", value);
      persist();
      return true;
    },
    closeOccurrence,
    snapshot() {
      const cacheablePlaybackCount = session.cachePlaybackHits + session.remotePlaybackCount + session.fallbackPlaybackCount;
      return {
        networkMeasurementSupported: session.networkMeasurementSupported === true,
        appInternetReceivedBytes: session.networkMeasurementSupported === true ? session.appInternetReceivedBytes : null,
        appInternetSentBytes: session.networkMeasurementSupported === true ? session.appInternetSentBytes : null,
        mediaDownloadedBytes: session.mediaDownloadedBytes,
        localMediaReusedBytes: session.localMediaReusedBytes,
        trafficAvoidedBytes: session.localMediaReusedBytes,
        cachePlaybackHits: session.cachePlaybackHits,
        remotePlaybackCount: session.remotePlaybackCount,
        fallbackPlaybackCount: session.fallbackPlaybackCount,
        cacheablePlaybackCount,
        cacheHitRate: cacheablePlaybackCount > 0 ? session.cachePlaybackHits / cacheablePlaybackCount : null,
        measurementStartedAt: session.measurementStartedAt,
        lastUpdatedAt: session.lastUpdatedAt,
      };
    },
    dailySnapshot() { return { ...daily, dedup: undefined }; },
  };
}
