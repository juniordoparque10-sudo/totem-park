// BASIC V5 — LAB. Pure logic: no Firebase, no DOM, no production side effects.
export const LEASE_MS = 75_000;
export const RENEW_MS = 30_000;
export const IDLE_MS = 300_000;
const IDENTIFIER = /^[A-Za-z0-9_-]{8,64}$/;
const UID = /^[A-Za-z0-9_-]{3,128}$/;
export function watcherId(uid, tabId) {
  if (!UID.test(uid) || !IDENTIFIER.test(tabId)) throw new Error('Invalid watcher identity');
  return `${uid}__${tabId}`;
}
export function leaseData(uid, tabId, now) {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('Invalid time');
  watcherId(uid, tabId);
  return { ownerUid: uid, tabId, expiresAtMs: now + LEASE_MS };
}
export function activeWatchers(documents, now) {
  if (!Array.isArray(documents)) return [];
  return documents.filter(entry => entry && typeof entry.ownerUid === 'string'
      && typeof entry.tabId === 'string' && Number.isSafeInteger(entry.expiresAtMs)
      && entry.expiresAtMs > now && entry.expiresAtMs <= now + 2 * LEASE_MS
      && (() => { try { watcherId(entry.ownerUid, entry.tabId); return true; } catch { return false; } })());
}
export function createWatcherSession({ uid, tabId, write, remove, clock = Date.now,
  schedule = (fn, ms) => setInterval(fn, ms), cancel = clearInterval,
  renewMs = RENEW_MS, idleMs = IDLE_MS, keepVisible = false, report = () => {} }) {
  const id = watcherId(uid, tabId);
  if (typeof write !== 'function' || typeof remove !== 'function') throw new Error('Missing storage');
  let stopped = false, visible = true, lastActivity = clock(), active = false;
  let work = Promise.resolve();
  const enqueue = fn => { work = work.catch(() => {}).then(fn).catch(report); return work; };
  const reconcile = () => {
    if (stopped) return work;
    const shouldRun = visible && (keepVisible || clock() - lastActivity < idleMs);
    if (shouldRun) {
      active = true;
      // When queued after stop, do not recreate a lease.
      return enqueue(async () => {
        if (stopped) return;
        try { await write(id, leaseData(uid, tabId, clock())); }
        catch (error) { active = false; throw error; }
      });
    }
    if (active) { active = false; return enqueue(() => remove(id)); }
    return work;
  };
  const tick = () => reconcile();
  const timer = schedule(tick, renewMs);
  const start = () => reconcile();
  const setVisible = value => { visible = Boolean(value); return reconcile(); };
  const activity = () => { lastActivity = clock(); return !active ? reconcile() : work; };
  const stop = async () => {
    if (stopped) return work;
    stopped = true; cancel(timer);
    // Do not perform network writes if this session was never activated.
    if (!active) return work;
    active = false;
    // Cleanup after any in-flight renewals, including failed ones.
    return enqueue(() => remove(id));
  };
  return { id, start, setVisible, activity, tick, stop, isActive: () => active };
}
