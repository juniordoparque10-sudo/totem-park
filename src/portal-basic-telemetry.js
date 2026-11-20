// Telemetria BASIC não herda campos operacionais de versões anteriores.
export const isBasicTelemetry = telemetry => Number(telemetry?.schemaVersion) === 5 && telemetry?.profile === "BASIC";
export const isLegacyAdvancedTelemetry = telemetry => [3,4].includes(Number(telemetry?.schemaVersion)) && !isBasicTelemetry(telemetry);

export function isBasicIdentityValid(screen = {}) {
  const t = screen?.telemetry;
  if (!isBasicTelemetry(t)) return false;
  const i=t.identity || {}, a=t.installation || {}, s=t.session || {};
  const deviceId=screen?.connectedDeviceId || screen?.activeDeviceId;
  return Boolean(screen?.id && screen?.clientId && deviceId
    && i.clientId === screen.clientId && i.screenId === screen.id && i.deviceId === deviceId
    && a.installationId && Number.isInteger(Number(a.installationEpoch)) && Number(a.installationEpoch)>=1
    && a.packageName && a.versionName && Number.isInteger(Number(a.versionCode)) && Number(a.versionCode)>0
    && a.buildId && a.buildTimestamp && s.sessionId && s.startedAt && s.lastHeartbeatAt);
}

export function basicHeartbeatMs(screen={}) {
  if (!isBasicIdentityValid(screen)) return 0;
  const ms=Date.parse(screen.telemetry.session.lastHeartbeatAt);
  return Number.isFinite(ms) ? ms : 0;
}

export function isBasicFresh(screen={},now=Date.now(),thresholdMs=45_000) {
  const ms=basicHeartbeatMs(screen);
  return ms>0 && ms<=now && now-ms<thresholdMs && screen.telemetry.connection?.state==="ONLINE";
}
