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
export const V70_OFFICIAL_PACKAGE = "br.com.parksolutions.totempark";
const SUPPORTED_EXPERIMENTAL_VERSION_CODES = new Set([58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70]);

export const BASIC_V5_HOM_PACKAGE = "br.com.parksolutions.totempark.player.basichom";
export const BASIC_V5_HOM_VERSION_CODE = 1;
export const BASIC_V5_UNIVERSAL_PACKAGE = "br.com.parksolutions.totempark.player.basicv5";
export const BASIC_V5_UNIVERSAL_VERSION_CODE = 6;

export function isApprovedAndroidNavigationPlayer(packageName, versionCode) {
  const code = Number(versionCode);
  return (packageName === V58_EXPERIMENTAL_PACKAGE && SUPPORTED_EXPERIMENTAL_VERSION_CODES.has(code))
    || (packageName === V70_OFFICIAL_PACKAGE && code === 70)
    || (packageName === BASIC_V5_HOM_PACKAGE && code === BASIC_V5_HOM_VERSION_CODE)
    || (packageName === BASIC_V5_UNIVERSAL_PACKAGE && code === BASIC_V5_UNIVERSAL_VERSION_CODE);
}

export function getAndroidPlayerV2Capabilities(deviceId = "", appInfo = {}) {
  const versionCode = Number(appInfo.versionCode || 0);
  const packageName = String(appInfo.packageName || "");
  const isApprovedPlayer = isApprovedAndroidNavigationPlayer(packageName, versionCode);
  if (!isApprovedPlayer) return null;
  return {
    deviceId:String(deviceId),
    platform:"ANDROID",
    packageName,
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
