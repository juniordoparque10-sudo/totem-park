export const TEMPLATES_V2_MINIMUM_PLAYER_CODE = 17;
const V56_DYNAMIC_TEMPLATE_TYPES = Object.freeze([
  "smart-lobby",
  "agenda-info",
  "promotion-campaign",
  "digital-menu",
  "kpi-indicators",
  "qr-interaction",
  "news-editorial-dynamic",
  "market-premium",
]);

export function getPlayerV2Capabilities() {
  return {
    templatesV2: true,
    dynamicTemplateTypes: [...V56_DYNAMIC_TEMPLATE_TYPES],
  };
}

export function getWebPlayerV2Capabilities(deviceId = "") {
  return {
    deviceId:String(deviceId),
    platform:"WEB",
    playlistItemNavigation:true,
    templatesV2:true,
    templatesV2DynamicPhase1:true,
  };
}

export const V58_EXPERIMENTAL_PACKAGE = "br.com.parksolutions.totempark.player.rcsecurelink";
const SUPPORTED_EXPERIMENTAL_VERSION_CODES = new Set([58, 59, 60, 61, 62, 63]);

export function getAndroidPlayerV2Capabilities(deviceId = "", appInfo = {}) {
  const versionCode = Number(appInfo.versionCode || 0);
  if (String(appInfo.packageName || "") !== V58_EXPERIMENTAL_PACKAGE || !SUPPORTED_EXPERIMENTAL_VERSION_CODES.has(versionCode)) return null;
  return {
    deviceId:String(deviceId),
    platform:"ANDROID",
    packageName:V58_EXPERIMENTAL_PACKAGE,
    versionCode,
    playlistItemNavigation:true,
    templatesV2:true,
    templatesV2DynamicPhase1:true,
  };
}

export function getPlayerVersionLabel(screen = {}) {
  return String(
    screen?.telemetry?.session?.appVersion
      || screen?.appVersion
      || screen?.playerAppVersion
      || ""
  ).trim();
}

export function supportsTemplatesV2(player = {}) {
  if (player?.capabilities?.templatesV2 === true || player?.supportsTemplatesV2 === true) return true;
  if (player?.templatesV2TestMode === true) return true;
  if (player?.capabilities?.templatesV2 === false || player?.supportsTemplatesV2 === false) return false;

  const versionCode = Number(player?.versionCode || player?.playerVersionCode || 0);
  if (versionCode > 0) return versionCode >= TEMPLATES_V2_MINIMUM_PLAYER_CODE;

  const label = getPlayerVersionLabel(player);
  const versionMatch = label.match(/(?:^|[-_])v(\d+)(?:[-_]|$)/i);
  return versionMatch ? Number(versionMatch[1]) >= TEMPLATES_V2_MINIMUM_PLAYER_CODE : false;
}

export function getTemplatesV2ScreenCapability(screens = []) {
  const blockedScreens = screens.filter((screen) => !supportsTemplatesV2(screen));
  return {
    allowed: blockedScreens.length === 0,
    blockedScreens,
  };
}
