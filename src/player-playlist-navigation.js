export function getAdjacentPlaylistIndex(currentIndex, itemCount, direction) {
  const count = Math.max(0, Number(itemCount) || 0);
  if (count === 0) return -1;
  const safeCurrent = Math.min(Math.max(0, Number(currentIndex) || 0), count - 1);
  if (count === 1) return safeCurrent;
  if (direction === "previous") return (safeCurrent - 1 + count) % count;
  if (direction === "next") return (safeCurrent + 1) % count;
  return safeCurrent;
}

export function getStablePlayerItemIdentity(item = {}) {
  const itemType = item.playerItemType || "";
  const stableId = item.mediaId || item.sourceMediaId || item.templateId || item.id || "";
  if (stableId) return `${itemType}|${stableId}`;

  return [
    itemType,
    item.storagePath || "",
    item.remotePreview || item.preview || item.imageUrl || "",
    item.title || item.name || "",
    item.templateType || item.type || "",
  ].join("|");
}

export function reconcilePlaylistPlaybackIdentity({
  items = [],
  currentIndex = 0,
  currentIdentity = "",
} = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return { index: -1, identity: "", preserved: false };
  }

  if (currentIdentity) {
    const preservedIndex = items.findIndex(
      (item) => getStablePlayerItemIdentity(item) === currentIdentity
    );
    if (preservedIndex >= 0) {
      return { index: preservedIndex, identity: currentIdentity, preserved: true };
    }
  }

  const numericIndex = Number.isInteger(currentIndex) ? currentIndex : 0;
  const safeIndex = numericIndex >= 0 && numericIndex < items.length ? numericIndex : 0;
  return {
    index: safeIndex,
    identity: getStablePlayerItemIdentity(items[safeIndex]),
    preserved: false,
  };
}
