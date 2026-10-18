export function shouldRevealTemplateImmediately(item, options = {}) {
  const isTemplate = Boolean(item && (item.playerItemType === "template" || item.published || item.templateType));
  if (!isTemplate) return false;
  if (options.native === true) return true;
  if (item.templatePublishedResolved === false) return false;
  const primary = item?.published?.media?.primary;
  return !primary || primary.type === "video";
}
