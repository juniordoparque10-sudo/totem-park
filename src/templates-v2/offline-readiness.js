export function shouldRevealTemplateImmediately(item) {
  return Boolean(item && (item.playerItemType === "template" || item.published || item.templateType));
}
