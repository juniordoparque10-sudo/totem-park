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

export function attachActivePlayerBindings(screens = [], playerBindings = [], clientId = "") {
  return screens.map((screen) => ({
    ...screen,
    clientId,
    playerBinding:playerBindings.find((binding) => binding.id === screen.connectedAuthUid) || null,
  }));
}

export function supportsDynamicTemplatesV2(player = {}) {
  const capabilities = player?.capabilities;
  const binding = player?.playerBinding;
  const connectedDeviceId = String(player?.connectedDeviceId || "");
  const capabilityDeviceId = String(capabilities?.deviceId || "");
  const activeBindingMatches = binding?.status === "ACTIVE"
    && binding?.clientId === player?.clientId
    && binding?.screenId === player?.id
    && String(binding?.deviceId || "") === capabilityDeviceId;
  const matchingConnectedDevice = connectedDeviceId !== "" && capabilityDeviceId === connectedDeviceId;
  if (capabilities?.platform === "WEB") {
    return capabilities?.[DYNAMIC_TEMPLATES_V2_CAPABILITY] === true
      && (matchingConnectedDevice || activeBindingMatches);
  }

  return capabilities?.templatesV2 === true
    && capabilities?.[DYNAMIC_TEMPLATES_V2_CAPABILITY] === true
    && capabilities?.playlistItemNavigation === true
    && matchingConnectedDevice
    && capabilities?.platform === "ANDROID"
    && capabilities?.packageName === V58_EXPERIMENTAL_PACKAGE
    && [58, 59, 60, 61].includes(Number(capabilities?.versionCode))
    && player?.id === V58_CANARY_SCREEN_ID
    && player?.clientId === V58_CANARY_CLIENT_ID
    && player?.templatesV2TestMode === true
    && activeBindingMatches;
}

export function getDynamicPlaylistCapability(items = [], screens = []) {
  const requiresDynamic = items.some(isDynamicTemplateV2Item);
  const blockedScreens = requiresDynamic ? screens.filter((screen) => !supportsDynamicTemplatesV2(screen)) : [];
  return { required: requiresDynamic, allowed: blockedScreens.length === 0, blockedScreens };
}
