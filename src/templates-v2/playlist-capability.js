export const DYNAMIC_TEMPLATES_V2_CAPABILITY = "templatesV2DynamicPhase1";
export const DYNAMIC_TEMPLATE_TYPES = new Set(["news-editorial-dynamic", "market-premium"]);

export function isDynamicTemplateV2Type(type = "") { return DYNAMIC_TEMPLATE_TYPES.has(String(type)); }

export function isDynamicTemplateV2Item(item = {}) {
  const type=item?.templateType || item?.type || item?.identity?.templateType;
  return isDynamicTemplateV2Type(type) || item?.dynamicTemplate === true || item?.published?.dynamicTemplate === true || item?.draft?.dynamicTemplate === true;
}

export function supportsDynamicTemplatesV2(player = {}) {
  return player?.runtime === "web" || player?.playerRuntime === "web" || player?.capabilities?.[DYNAMIC_TEMPLATES_V2_CAPABILITY] === true;
}

export function getDynamicPlaylistCapability(items = [], screens = []) {
  const requiresDynamic = items.some(isDynamicTemplateV2Item);
  const blockedScreens = requiresDynamic ? screens.filter((screen) => !supportsDynamicTemplatesV2(screen)) : [];
  return { required: requiresDynamic, allowed: blockedScreens.length === 0, blockedScreens };
}
