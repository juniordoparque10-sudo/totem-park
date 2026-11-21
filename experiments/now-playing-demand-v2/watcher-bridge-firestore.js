// BASIC V5 — LAB ONLY. Adapter is NOT imported by the current App/Player.
// Import this module only from the emulator-gated experiment in a future phase.
import { collectionGroup, doc, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../../src/firebase';
import { activeWatchers, createWatcherSession } from './watcher-bridge-core.mjs';

const path = (clientId, screenId) => {
  if (![clientId, screenId].every(s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(s))) {
    throw new Error('Invalid screen');
  }
  return ['clients', clientId, 'screens', screenId, 'nowPlayingWatchers'];
};
const enforceLab = () => {
  if (import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'true'
    || import.meta.env.VITE_BASIC_V5_DIAG !== 'true'
    || import.meta.env.VITE_NOW_PLAYING_DEMAND_LAB !== 'true') {
    throw new Error('BASIC V5 watcher bridge is emulator-only');
  }
};
function tabId() {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error('Secure random generator unavailable');
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
/** Portal-only. Caller must handle document visibility + pointer activity and dispose. */
export function createPortalWatcher(clientId, screenId, options = {}) {
  enforceLab();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authenticated Portal user required');
  const parts = path(clientId, screenId);
  const ownTab = tabId();
  const session = createWatcherSession({
    uid, tabId: ownTab,
    ...options,
    // Never allow overriding the authenticated identity or persistence path.
    uid, tabId: ownTab,
    write: (_id, data) => setDoc(doc(db, ...parts, uid, 'tabs', ownTab), {
      ...data, clientId, screenId
    }),
    remove: () => deleteDoc(doc(db, ...parts, uid, 'tabs', ownTab))
  });
  return session;
}
/** Player-only, read-only. Existing rules enforce ACTIVE binding for client/screen. */
export function observePlayerWatchers(clientId, screenId, callback, onError = () => {}) {
  enforceLab();
  if (typeof callback !== 'function') throw new Error('Callback required');
  const ref = query(
    collectionGroup(db, 'tabs'),
    where('clientId', '==', clientId),
    where('screenId', '==', screenId)
  );
  let latest = [];
  let stopped = false;
  // Expired leases do not trigger Firestore writes; reevaluate on a local timer.
  const publish = () => { if (!stopped) callback(activeWatchers(latest, Date.now())); };
  const unsubscribe = onSnapshot(ref, snapshot => {
    latest = snapshot.docs.map(entry => entry.data());
    publish();
  }, onError);
  const timer = setInterval(publish, 5_000);
  return () => { stopped = true; clearInterval(timer); unsubscribe(); };
}
