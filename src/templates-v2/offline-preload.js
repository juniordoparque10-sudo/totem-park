export function getNextTemplateToPrepare(items = [], currentIndex = 0) {
  if (items.length < 2) return null;
  const safeIndex = currentIndex >= 0 && currentIndex < items.length ? currentIndex : 0;
  const next = items[(safeIndex + 1) % items.length];
  return next?.playerItemType === "template" ? next : null;
}
