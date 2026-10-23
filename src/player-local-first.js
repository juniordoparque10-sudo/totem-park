export async function readCachedPlayerDocument({
  getFromCache,
  reference,
  expectedId,
  onError,
} = {}) {
  try {
    const snapshot = await getFromCache(reference);
    if (!snapshot?.exists?.() || snapshot.id !== expectedId) return null;
    return snapshot;
  } catch (error) {
    onError?.(error);
    return null;
  }
}
