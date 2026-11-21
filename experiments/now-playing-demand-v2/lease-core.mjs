export const LEASE_MS = 75_000;
export const RENEW_MS = 30_000;
export const IDLE_MS = 5 * 60_000;
export const MAX_ACTIVE_WATCHERS = 20;
export function validId(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(value); }
export function makeLease(uid, tabId, now) {
  if (!validId(uid) || !validId(tabId)) throw Error('Identidade invalida');
  if (!Number.isFinite(now)) throw Error('Relogio invalido');
  return { ownerUid: uid, tabId, expiresAtMs: now + LEASE_MS };
}
export function activeLeases(records, now = Date.now()) {
  return records.filter(x => x && validId(x.ownerUid) && validId(x.tabId)
    && Number.isFinite(x.expiresAtMs) && x.expiresAtMs > now
    && x.expiresAtMs <= now + 2 * LEASE_MS);
}
export function shouldRenew(lease, now = Date.now()) {
  return !lease || !Number.isFinite(lease.expiresAtMs) || lease.expiresAtMs - now <= LEASE_MS - RENEW_MS;
}
export function isWatching({visible, lastActivityAt, now, masterKeepVisible = false}) {
  return visible === true && (masterKeepVisible || (Number.isFinite(lastActivityAt) && now - lastActivityAt < IDLE_MS));
}
