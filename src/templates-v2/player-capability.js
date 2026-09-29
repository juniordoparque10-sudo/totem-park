export const TEMPLATES_V2_MINIMUM_PLAYER_CODE = 17;

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
