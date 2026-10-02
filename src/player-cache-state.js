export function deriveMediaCacheState({ completed = 0, total = 0, failed = 0, downloadActive = false, downloadStarted = false } = {}) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeCompleted = Math.max(0, Math.min(safeTotal, Number(completed) || 0));
  const safeFailed = Math.max(0, Math.min(safeCompleted, Number(failed) || 0));
  const cachedItems = Math.max(0, safeCompleted - safeFailed);
  const complete = safeCompleted >= safeTotal;
  const hasPendingMedia = safeCompleted < safeTotal;
  const hasRealDownloadWork = Boolean(downloadActive || (downloadStarted && hasPendingMedia));

  return {
    cacheStatus:complete ? (safeFailed > 0 ? "parcial" : "pronto") : hasRealDownloadWork ? "preparando" : "",
    cachedItems,
    totalCacheableItems:safeTotal,
    failedCacheItems:safeFailed,
    hasPendingMedia,
    showDownloading:hasRealDownloadWork,
    showReady:complete && safeFailed === 0,
  };
}

export function finalizeCompletedMediaCache(cache = {}) {
  const total = Math.max(0, Number(cache.totalCacheableItems) || 0);
  const cached = Math.max(0, Number(cache.cachedItems) || 0);
  const failed = Math.max(0, Number(cache.failedCacheItems) || 0);
  if (total > 0 && cached + failed >= total) {
    return { ...cache, cacheStatus:failed > 0 ? "parcial" : "pronto" };
  }
  return cache;
}
