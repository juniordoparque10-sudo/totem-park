export const DYNAMIC_TEMPLATES_V2_CAPABILITY = "templatesV2DynamicPhase1";
export const DYNAMIC_TEMPLATE_TYPES = new Set(["news-editorial-dynamic", "market-premium"]);
export const V58_CANARY_CLIENT_ID = "eCd1q9Dq1SMr9D5FlKN8";
export const V58_CANARY_SCREEN_ID = "wKJY9pGe2U4p2QtehHTW";
const V58_EXPERIMENTAL_PACKAGE = "br.com.parksolutions.totempark.player.rcsecurelink";

export function isDynamicTemplateV2Type(type = "") { return DYNAMIC_TEMPLATE_TYPES.has(String(type)); }

export function isDynamicTemplateV2Item(item = {}) {
  const type=item?.templateType || item?.type || item?.identity?.templateType;
  return isDynamicTemplateV2Type(type) || item?.dynamicTemplate === true || item?.published?.dynamicTemplate === true || item?.draft?.dynamicTemplate === true;
}

export function supportsDynamicTemplatesV2(player = {}) {
  const capabilities = player?.capabilities;
  const connectedDeviceId = String(player?.connectedDeviceId || "");
  const matchingDevice = connectedDeviceId !== ""
    && String(capabilities?.deviceId || "") === connectedDeviceId;
  if (capabilities?.platform === "WEB") {
    return capabilities?.[DYNAMIC_TEMPLATES_V2_CAPABILITY] === true && matchingDevice;
  }

  const binding = player?.playerBinding;
  return capabilities?.templatesV2 === true
    && capabilities?.[DYNAMIC_TEMPLATES_V2_CAPABILITY] === true
    && capabilities?.playlistItemNavigation === true
    && matchingDevice
    && capabilities?.platform === "ANDROID"
    && capabilities?.packageName === V58_EXPERIMENTAL_PACKAGE
    && Number(capabilities?.versionCode) === 58
    && player?.id === V58_CANARY_SCREEN_ID
    && player?.clientId === V58_CANARY_CLIENT_ID
    && player?.templatesV2TestMode === true
    && binding?.status === "ACTIVE"
    && binding?.clientId === player.clientId
    && binding?.screenId === player.id
    && String(binding?.deviceId || "") === connectedDeviceId;
}

export function getDynamicPlaylistCapability(items = [], screens = []) {
  const requiresDynamic = items.some(isDynamicTemplateV2Item);
  const blockedScreens = requiresDynamic ? screens.filter((screen) => !supportsDynamicTemplatesV2(screen)) : [];
  return { required: requiresDynamic, allowed: blockedScreens.length === 0, blockedScreens };
}
