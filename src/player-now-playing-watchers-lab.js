// BASIC V5 — PLAYER LAB ONLY. Default: disabled. No APK or heartbeat modifications.
import { useEffect, useState } from 'react';
import { observePlayerWatchers } from '../experiments/now-playing-demand-v2/watcher-bridge-firestore';

export const isPlayerWatchersV2Lab = () => import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
  && import.meta.env.VITE_BASIC_V5_DIAG === 'true'
  && import.meta.env.VITE_NOW_PLAYING_DEMAND_LAB === 'true'
  && import.meta.env.VITE_NOW_PLAYING_WATCHERS_V2_LAB === 'true';

// Only the specific Player component calls this hook. The listener never starts when the flag is off.
export function usePlayerNowPlayingWatchersLab(clientId, screenId) {
  const [reading, setReading] = useState({ scope: '', ids: '' });
  const enabled = isPlayerWatchersV2Lab();
  const scope = clientId && screenId ? `${clientId}/${screenId}` : '';
  useEffect(() => {
    if (!enabled || !scope) return undefined;
    let live = true;
    const clear = () => { if (live) setReading(prev => prev.scope === scope && prev.ids === '' ? prev : { scope, ids: '' }); };
    clear();
    let stop;
    try {
      stop = observePlayerWatchers(clientId, screenId, watchers => {
        if (!live) return;
        const ids = watchers.map(w => `${w.ownerUid}__${w.tabId}`).sort().join('|');
        setReading(prev => prev.scope === scope && prev.ids === ids ? prev : { scope, ids });
      }, error => {
        console.warn('BASIC V5 Player LAB watcher read failed:', error);
        clear();
      });
    } catch (error) {
      console.warn('BASIC V5 Player LAB watcher initialization failed:', error);
      clear();
    }
    return () => { live = false; if (typeof stop === 'function') stop(); };
  }, [enabled, scope, clientId, screenId]);
  return enabled && reading.scope === scope ? reading.ids : '';
}
