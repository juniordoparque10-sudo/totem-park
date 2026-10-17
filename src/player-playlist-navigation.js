export function getAdjacentPlaylistIndex(currentIndex, itemCount, direction) {
  const count = Math.max(0, Number(itemCount) || 0);
  if (count === 0) return -1;
  const safeCurrent = Math.min(Math.max(0, Number(currentIndex) || 0), count - 1);
  if (count === 1) return safeCurrent;
  if (direction === "previous") return (safeCurrent - 1 + count) % count;
  if (direction === "next") return (safeCurrent + 1) % count;
  return safeCurrent;
}
