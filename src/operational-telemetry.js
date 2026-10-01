export const OPERATIONAL_TELEMETRY_SCHEMA_VERSION = 3;
export const OPERATIONAL_HEARTBEAT_INTERVAL_MS = 15_000;
export const OPERATIONAL_ONLINE_THRESHOLD_MS = 45_000;

export function isOperationalHeartbeatFresh(telemetry, now = Date.now(), thresholdMs = OPERATIONAL_ONLINE_THRESHOLD_MS) {
  if (Number(telemetry?.schemaVersion || 0) < OPERATIONAL_TELEMETRY_SCHEMA_VERSION) return false;
  const heartbeatAt = Date.parse(telemetry?.session?.lastHeartbeatAt || "");
  return Number.isFinite(heartbeatAt) && now - heartbeatAt >= 0 && now - heartbeatAt < thresholdMs;
}

export function getPortalCurrentMediaSource(screen = {}, now = Date.now()) {
  const telemetry = screen.telemetry;
  if (Number(telemetry?.schemaVersion || 0) >= OPERATIONAL_TELEMETRY_SCHEMA_VERSION) {
    if (!isOperationalHeartbeatFresh(telemetry, now)) return "";
    return screen.currentMediaSource || telemetry?.current?.currentMediaSource || "";
  }
  return screen.currentMediaSource || telemetry?.current?.mediaSource || "";
}

export function normalizeOperationalMediaSource(source, { template = false } = {}) {
  if (template) return "TEMPLATE";
  const value = String(source || "").trim();
  const normalized = value.toLowerCase();
  if (["local", "cache", "cache_local"].includes(normalized)) return "LOCAL";
  if (["remote", "internet"].includes(normalized)) return "REMOTE";
  if (["fallback", "internet_fallback"].includes(normalized)) return "FALLBACK";
  if (normalized === "mixed") return "MIXED";
  return "UNKNOWN";
}

export function normalizeNativeAppInfo(value = {}, fallback = {}) {
  return {
    packageName: String(value.packageName || fallback.packageName || "").trim(),
    versionCode: Number.isFinite(Number(value.versionCode)) ? Number(value.versionCode) : null,
    versionName: String(value.versionName || fallback.versionName || "").trim(),
  };
}

export function getOperationalPlayerState({ error = false, loading = false, idle = false, ready = false } = {}) {
  if (error) return "error";
  if (idle) return "idle";
  if (loading || !ready) return "loading";
  return "playing";
}

export function buildOperationalSnapshot({
  screenId = "",
  deviceId = "",
  app = {},
  playerState = "idle",
  currentItem = null,
  cache = {},
  networkStatus = "ONLINE",
} = {}) {
  const template = currentItem?.playerItemType === "template" || Boolean(currentItem?.templateType);
  return {
    screenId,
    deviceId,
    app: normalizeNativeAppInfo(app),
    playerState: getOperationalPlayerState({
      error: playerState === "error",
      loading: playerState === "loading",
      idle: playerState === "idle",
      ready: playerState === "playing",
    }),
    networkStatus: networkStatus === "OFFLINE" ? "OFFLINE" : "ONLINE",
    currentItemId: String(currentItem?.mediaId || currentItem?.templateId || currentItem?.id || ""),
    currentItemType: template ? "TEMPLATE_V2" : String(currentItem?.type || currentItem?.playerItemType || "").toUpperCase(),
    currentMediaSource: normalizeOperationalMediaSource(currentItem?.currentMediaSource, { template }),
    cache: {
      cacheStatus: String(cache.cacheStatus || ""),
      cachedItems: Math.max(0, Number(cache.cachedItems || 0)),
      totalCacheableItems: Math.max(0, Number(cache.totalCacheableItems || 0)),
    },
  };
}
