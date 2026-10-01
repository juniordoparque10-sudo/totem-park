const SOURCE_GROUPS = Object.freeze({
  LOCAL:{ key:"local", label:"Local (cache)", className:"local" },
  REMOTE:{ key:"remote", label:"Internet", className:"internet" },
  FALLBACK:{ key:"fallback", label:"Fallback", className:"fallback" },
  TEMPLATE:{ key:"template", label:"Template", className:"template" },
  MIXED:{ key:"mixed", label:"Misto", className:"mixed" },
  UNKNOWN:{ key:"unknown", label:"Sem informação", className:"unknown" },
});

const numeric = (value) => value !== null && value !== undefined && Number.isFinite(Number(value));

function nativeVersion(screen = {}) {
  screen = screen || {};
  const versionName = screen.playerVersionName || screen.versionName || screen.nativeAppVersion
    || screen?.telemetry?.app?.versionName || screen.appVersion || screen.playerAppVersion
    || screen?.telemetry?.session?.appVersion || null;
  const rawCode = screen.playerVersionCode ?? screen.versionCode ?? screen?.telemetry?.app?.versionCode;
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

export const reportedAppVersion = (screen = {}) => {
  screen = screen || {};
  const { versionName, versionCode } = nativeVersion(screen);
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

export function aggregateSchema4Traffic(screens = []) {
  const totals = {
    currentSchema4Screens:0, networkScreens:0, downloadedScreens:0, reusedScreens:0, avoidedScreens:0, cacheRateScreens:0,
    appInternetReceivedBytes:0, mediaDownloadedBytes:0, localMediaReusedBytes:0, trafficAvoidedBytes:0, cacheHits:0, cacheMisses:0,
  };
  for (const screen of screens) {
    if (!isCurrentTelemetryScreen(screen) || !isSchema4Traffic(screen)) continue;
    const traffic = screen.telemetry.traffic;
    totals.currentSchema4Screens += 1;
    if (traffic.networkMeasurementSupported === true && numeric(traffic.appInternetReceivedBytes)) {
      totals.networkScreens += 1; totals.appInternetReceivedBytes += Number(traffic.appInternetReceivedBytes);
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
  return totals;
}

export function getTelemetryCardData(screens = []) {
  let activeTimeMs = 0;
  let activeScreens = 0;
  let cacheItems = 0;
  let cacheScreens = 0;
  let cacheOfflineScreens = 0;
  let latestVersionScreen = null;
  const versionCounts = new Map();

  for (const screen of screens) {
    const active = Number(screen?.telemetry?.session?.uptimeSeconds) * 1000;
    if (Number(screen?.telemetry?.schemaVersion) >= 3 && screen?.telemetry?.session?.uptimeSeconds != null && Number.isFinite(active)) {
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
