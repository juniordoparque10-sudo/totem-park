export const DYNAMIC_TEMPLATES_V2_CAPABILITY = "templatesV2DynamicPhase1";
export const DYNAMIC_TEMPLATE_TYPES = new Set(["news-editorial-dynamic", "market-premium"]);

export function isDynamicTemplateV2Type(type = "") { return DYNAMIC_TEMPLATE_TYPES.has(String(type)); }

export function supportsDynamicTemplatesV2(player = {}) {
  return player?.runtime === "web" || player?.playerRuntime === "web" || player?.capabilities?.[DYNAMIC_TEMPLATES_V2_CAPABILITY] === true;
}

export function getDynamicPlaylistCapability(items = [], screens = []) {
  const requiresDynamic = items.some((item) => isDynamicTemplateV2Type(item?.templateType || item?.type || item?.identity?.templateType));
  const blockedScreens = requiresDynamic ? screens.filter((screen) => !supportsDynamicTemplatesV2(screen)) : [];
  return { required: requiresDynamic, allowed: blockedScreens.length === 0, blockedScreens };
}
