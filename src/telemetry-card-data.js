import { timestampMs } from "./portal-status.js";

export const reportedAppVersion = (screen = {}) => {
  if (!screen) return null;
  const nativeName = screen.playerVersionName || screen.versionName || screen.nativeAppVersion;
  const nativeCode = screen.playerVersionCode || screen.versionCode;
  if (nativeName) return nativeCode ? `${nativeName} (${nativeCode})` : String(nativeName);
  if (nativeCode) return `VersionCode ${nativeCode}`;
  return screen.appVersion || screen.playerAppVersion || screen?.telemetry?.session?.appVersion || null;
};

export function getTelemetryCardData(screens = []) {
  let activeTimeMs = 0;
  let activeScreens = 0;
  let cacheItems = 0;
  let cacheScreens = 0;
  let latestTransfer = null;
  let latestVersionScreen = null;

  for (const screen of screens) {
    const active = screen?.telemetry?.schemaVersion >= 3
      ? Number(screen?.telemetry?.counters?.activeTimeMs) : NaN;
    if (screen?.telemetry?.counters?.activeTimeMs != null && Number.isFinite(active)) {
      activeTimeMs += Math.max(0, active);
      activeScreens += 1;
    }

    const cacheStatus = String(screen?.cacheStatus || "").toLowerCase();
    const cached = Number(screen?.cachedItems);
    if (["pronto", "preparando", "parcial", "erro"].includes(cacheStatus)
      && screen?.cachedItems != null && Number.isFinite(cached)) {
      cacheItems += Math.max(0, cached);
      cacheScreens += 1;
    }

    const transferAt = timestampMs(screen?.lastMediaDownloadAt);
    const transferBytes = Number(screen?.lastMediaDownloadBytes);
    if (transferAt && Number.isFinite(transferBytes) && transferBytes > 0
      && (!latestTransfer || transferAt > timestampMs(latestTransfer.lastMediaDownloadAt))) {
      latestTransfer = screen;
    }

    if (reportedAppVersion(screen)) {
      const checkpointAt = timestampMs(screen?.telemetryUpdatedAt);
      const latestCheckpointAt = timestampMs(latestVersionScreen?.telemetryUpdatedAt);
      const key = `${screen?.clientId || ""}/${screen?.id || ""}`;
      const latestKey = `${latestVersionScreen?.clientId || ""}/${latestVersionScreen?.id || ""}`;
      if (!latestVersionScreen || checkpointAt > latestCheckpointAt
        || (checkpointAt === latestCheckpointAt && key < latestKey)) latestVersionScreen = screen;
    }
  }

  const version = reportedAppVersion(latestVersionScreen);
  return {
    activeTimeMs,
    activeScreens,
    cacheItems,
    cacheScreens,
    latestTransfer,
    latestVersionScreen,
    versionCount: version ? screens.filter((screen) => reportedAppVersion(screen) === version).length : 0,
  };
}
