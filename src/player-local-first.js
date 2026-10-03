export async function readCachedPlayerDocument({
  getFromCache,
  reference,
  expectedId,
} = {}) {
  try {
    const snapshot = await getFromCache(reference);
    if (!snapshot?.exists?.() || snapshot.id !== expectedId) return null;
    return snapshot;
  } catch {
    return null;
  }
}
