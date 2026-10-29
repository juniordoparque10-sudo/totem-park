import { isOperationalHeartbeatFresh } from "./operational-telemetry.js";

const SOURCE_GROUPS = Object.freeze({
  LOCAL:{ key:"local", label:"Local (cache)", className:"local" },
  REMOTE:{ key:"remote", label:"Internet", className:"internet" },
  FALLBACK:{ key:"fallback", label:"Fallback", className:"fallback" },
  TEMPLATE:{ key:"template", label:"Template", className:"template" },
  MIXED:{ key:"mixed", label:"Misto", className:"mixed" },
  UNKNOWN:{ key:"unknown", label:"Sem informação", className:"unknown" },
});

const numeric = (value) => value !== null && value !== undefined && Number.isFinite(Number(value));

export function formatSessionStartedAt(value) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Não informado";
  return date.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" });
}

function nativeVersion(screen = {}, now = Date.now()) {
  screen = screen || {};
  const telemetryVersionName = screen?.telemetry?.app?.versionName || null;
  const telemetryVersionCode = screen?.telemetry?.app?.versionCode;
  const hasTelemetryVersion = Boolean(telemetryVersionName) || numeric(telemetryVersionCode);
  const useFreshTelemetry = hasTelemetryVersion && isOperationalHeartbeatFresh(screen.telemetry, now);
  const legacyVersionName = screen.playerVersionName || screen.versionName || screen.nativeAppVersion
    || screen.appVersion || screen.playerAppVersion || null;
  const legacyVersionCode = screen.playerVersionCode ?? screen.versionCode;
  const capabilityVersionCode = screen?.capabilities?.platform === "ANDROID"
    && screen?.capabilities?.packageName === "br.com.parksolutions.totempark.player.rcsecurelink"
    ? screen.capabilities.versionCode
    : null;
  const versionName = useFreshTelemetry
    ? telemetryVersionName
    : legacyVersionName || telemetryVersionName || screen?.telemetry?.session?.appVersion || null;
  const rawCode = useFreshTelemetry
    ? telemetryVersionCode
    : legacyVersionCode ?? capabilityVersionCode ?? telemetryVersionCode;
  const versionCode = numeric(rawCode) ? Number(rawCode) : null;
  return { versionName:versionName ? String(versionName) : null, versionCode };
}

function parsedVersionParts(versionName) {
  const text = String(versionName || "");
  const release = text.match(/(?:^|[-_.])v(\d+)(?:[-_.]|$)/i);
  if (release) return [Number(release[1])];
  const semantic = text.match(/\d+(?:\.\d+)+/);
  return semantic ? semantic[0].split(".").map(Number) : [];
}

function compareVersionInfo(left, right) {
  if (left.versionCode !== null || right.versionCode !== null) {
    if (left.versionCode === null) return -1;
    if (right.versionCode === null) return 1;
    if (left.versionCode !== right.versionCode) return left.versionCode - right.versionCode;
  }
  const leftParts = parsedVersionParts(left.versionName);
  const rightParts = parsedVersionParts(right.versionName);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference) return difference;
  }
  return String(left.versionName || "").localeCompare(String(right.versionName || ""), "pt-BR", { numeric:true });
}

export const reportedAppVersion = (screen = {}, now = Date.now()) => {
  screen = screen || {};
  const { versionName, versionCode } = nativeVersion(screen, now);
  if (versionName) return versionCode !== null ? `${versionName} (${versionCode})` : versionName;
  return versionCode !== null ? `VersionCode ${versionCode}` : null;
};

export function isSchema4Traffic(screen = {}) {
  return Number(screen?.telemetry?.schemaVersion) >= 4 && Boolean(screen?.telemetry?.traffic);
}

export function isCurrentTelemetryScreen(screen = {}) {
  return screen.portalStatus === "ONLINE";
}

export function getCurrentSourceGroup(screen = {}) {
  if (!isCurrentTelemetryScreen(screen)) return SOURCE_GROUPS.UNKNOWN;
  const value = String(screen?.currentMediaSource || screen?.telemetry?.current?.currentMediaSource || "UNKNOWN").toUpperCase();
  return SOURCE_GROUPS[value] || SOURCE_GROUPS.UNKNOWN;
}

export function aggregateCurrentPlaybackOrigins(screens = []) {
  const counts = { local:0, remote:0, fallback:0, template:0, mixed:0, unknown:0 };
  let total = 0;
  for (const screen of screens) {
    if (!isCurrentTelemetryScreen(screen)) continue;
    counts[getCurrentSourceGroup(screen).key] += 1;
    total += 1;
  }
  return { counts, total };
}

export function aggregateSchema4Traffic(screens = []) {
  const totals = {
    currentSchema4Screens:0, networkScreens:0, downloadedScreens:0, reusedScreens:0, avoidedScreens:0, cacheRateScreens:0,
    appInternetReceivedBytes:0, appInternetSentBytes:0, appInternetTotalBytes:0, mediaDownloadedBytes:0, localMediaReusedBytes:0, trafficAvoidedBytes:0, cacheHits:0, cacheMisses:0,
  };
  for (const screen of screens) {
    if (!isCurrentTelemetryScreen(screen) || !isSchema4Traffic(screen)) continue;
    const traffic = screen.telemetry.traffic;
    totals.currentSchema4Screens += 1;
    if (traffic.networkMeasurementSupported === true && numeric(traffic.appInternetReceivedBytes) && numeric(traffic.appInternetSentBytes)) {
      totals.networkScreens += 1;
      totals.appInternetReceivedBytes += Number(traffic.appInternetReceivedBytes);
      totals.appInternetSentBytes += Number(traffic.appInternetSentBytes);
    }
    if (numeric(traffic.mediaDownloadedBytes)) {
      totals.downloadedScreens += 1; totals.mediaDownloadedBytes += Number(traffic.mediaDownloadedBytes);
    }
    if (numeric(traffic.localMediaReusedBytes)) {
      totals.reusedScreens += 1; totals.localMediaReusedBytes += Number(traffic.localMediaReusedBytes);
    }
    if (numeric(traffic.trafficAvoidedBytes)) {
      totals.avoidedScreens += 1; totals.trafficAvoidedBytes += Number(traffic.trafficAvoidedBytes);
    }
    if (numeric(traffic.cachePlaybackHits) && numeric(traffic.remotePlaybackCount) && numeric(traffic.fallbackPlaybackCount)) {
      totals.cacheRateScreens += 1;
      totals.cacheHits += Number(traffic.cachePlaybackHits);
      totals.cacheMisses += Number(traffic.remotePlaybackCount) + Number(traffic.fallbackPlaybackCount);
    }
  }
  totals.appInternetTotalBytes = totals.appInternetReceivedBytes + totals.appInternetSentBytes;
  return totals;
}

export function getTelemetryCardData(screens = [], now = Date.now()) {
  let activeTimeMs = 0;
  let activeScreens = 0;
  let cacheItems = 0;
  let cacheScreens = 0;
  let cacheOfflineScreens = 0;
  let latestVersionScreen = null;
  const versionCounts = new Map();

  for (const screen of screens) {
    const active = Number(screen?.telemetry?.session?.uptimeSeconds) * 1000;
    if (Number(screen?.telemetry?.schemaVersion) >= 3 && screen?.telemetry?.session?.uptimeSeconds != null && Number.isFinite(active)
      && isCurrentTelemetryScreen(screen) && isOperationalHeartbeatFresh(screen.telemetry, now)) {
      activeTimeMs += Math.max(0, active); activeScreens += 1;
    }
    const cacheStatus = String(screen?.cacheStatus || "").toLowerCase();
    const cached = Number(screen?.cachedItems);
    if (["pronto", "preparando", "parcial", "erro"].includes(cacheStatus) && screen?.cachedItems != null && Number.isFinite(cached)) {
      cacheItems += Math.max(0, cached); cacheScreens += 1;
      if (!isCurrentTelemetryScreen(screen)) cacheOfflineScreens += 1;
    }
    const version = reportedAppVersion(screen);
    if (version) {
      versionCounts.set(version, (versionCounts.get(version) || 0) + 1);
      if (!latestVersionScreen || compareVersionInfo(nativeVersion(screen), nativeVersion(latestVersionScreen)) > 0) latestVersionScreen = screen;
    }
  }

  const installed = [...versionCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "pt-BR", { numeric:true }))[0] || null;
  const latestVersion = reportedAppVersion(latestVersionScreen);
  return {
    activeTimeMs, activeScreens, cacheItems, cacheScreens, cacheOfflineScreens, latestVersionScreen,
    versionCount:latestVersion ? versionCounts.get(latestVersion) || 0 : 0,
    mostInstalledVersion:installed?.[0] || null,
    mostInstalledCount:installed?.[1] || 0,
  };
}
