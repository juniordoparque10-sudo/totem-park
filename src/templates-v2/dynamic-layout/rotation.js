const clamp = (value, min, max, fallback) => Math.max(min, Math.min(max, Number(value) || fallback));

export function normalizeDynamicRotation(rotation = {}) {
  return {
    featuredSeconds: clamp(rotation.featuredSeconds, 3, 60, 8),
    secondarySeconds: clamp(rotation.secondarySeconds, 3, 60, 5),
    transition: ["fade", "slide-soft"].includes(rotation.transition) ? rotation.transition : "fade",
  };
}

export function getDynamicRotationFrame({ itemIds = [], elapsedMs = 0, effectiveDurationMs = Infinity, featuredSeconds = 8, secondarySeconds = 5, secondarySlots = 3 } = {}) {
  const ids = [...new Set(itemIds.filter(Boolean))];
  const rotation = normalizeDynamicRotation({ featuredSeconds, secondarySeconds });
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  const duration = Number.isFinite(Number(effectiveDurationMs)) ? Math.max(0, Number(effectiveDurationMs)) : Infinity;
  if (!ids.length || elapsed >= duration) return { expired: elapsed >= duration, featuredId: null, secondaryIds: [], nextBoundaryMs: duration };
  const featuredIndex = Math.floor(elapsed / (rotation.featuredSeconds * 1000)) % ids.length;
  const featuredId = ids[featuredIndex];
  const candidates = ids.filter((id) => id !== featuredId);
  const offset = candidates.length ? Math.floor(elapsed / (rotation.secondarySeconds * 1000)) % candidates.length : 0;
  const secondaryIds = Array.from({ length: Math.min(Math.max(0, secondarySlots), candidates.length) }, (_, index) => candidates[(offset + index) % candidates.length]);
  const nextFeatured = (Math.floor(elapsed / (rotation.featuredSeconds * 1000)) + 1) * rotation.featuredSeconds * 1000;
  const nextSecondary = (Math.floor(elapsed / (rotation.secondarySeconds * 1000)) + 1) * rotation.secondarySeconds * 1000;
  return { expired: false, featuredId, secondaryIds, nextBoundaryMs: Math.min(nextFeatured, nextSecondary, duration) };
}
