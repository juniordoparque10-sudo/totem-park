import { getMarketPreloadImageUrls } from "./market-premium/config.js";

export function shouldRevealTemplateImmediately(item, options = {}) {
  const isTemplate = Boolean(item && (item.playerItemType === "template" || item.published || item.templateType));
  if (!isTemplate) return false;
  const type = item?.identity?.templateType || item?.templateType || item?.type || "";
  const hasMarketImages = type === "market-premium" && getMarketPreloadImageUrls(item?.published?.market, { secondarySlots:item?.published?.display?.defaultOrientation === "Retrato" ? 4 : 6, frameCount:1 }).length > 0;
  if (options.native === true && !hasMarketImages) return true;
  if (item.templatePublishedResolved === false) return false;
  const primary = item?.published?.media?.primary;
  return (!primary || primary.type === "video") && !hasMarketImages;
}
