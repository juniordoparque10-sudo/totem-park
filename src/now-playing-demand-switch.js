// BASIC V5 - PORTAL LAB ONLY. No production activation, no Android Player changes.
import { useEffect } from 'react';
import { useNowPlayingDemandTargets as useLegacyNowPlayingDemandTargets } from './now-playing-demand-firestore';
import { createPortalWatcher } from '../experiments/now-playing-demand-v2/watcher-bridge-firestore';

const isV2Lab = () => import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
  && import.meta.env.VITE_BASIC_V5_DIAG === 'true'
  && import.meta.env.VITE_NOW_PLAYING_DEMAND_LAB === 'true'
  && import.meta.env.VITE_NOW_PLAYING_WATCHERS_V2_LAB === 'true';

/** Fully backward-compatible hook facade. Existing Portal UI remains unchanged. */
export function useNowPlayingDemandTargets(targets = [], enabled = false, keepWhileVisible = false) {
  const v2 = isV2Lab();
  // React hook is always called; V1 is disabled whenever V2 is explicitly enabled.
  useLegacyNowPlayingDemandTargets(targets, enabled && !v2, keepWhileVisible);
  const targetKey = [...new Set((Array.isArray(targets) ? targets : []).filter(Boolean))]
    .sort().join('|');

  useEffect(() => {
    if (!v2 || !enabled || !targetKey) return undefined;
    const sessions = [];
    let closed = false;
    let latestActivity = Date.now();
    const visible = () => typeof document !== 'undefined' && document.visibilityState === 'visible';
    const report = error => console.warn('BASIC V5 LAB - acompanhamento isolado:', error);

    for (const target of targetKey.split('|')) {
      const divider = target.indexOf('/');
      if (divider <= 0 || divider === target.length - 1) continue;
      try {
        const session = createPortalWatcher(target.slice(0, divider), target.slice(divider + 1), {
          keepVisible: keepWhileVisible,
          report,
        });
        sessions.push(session);
      } catch (error) { report(error); }
    }

    const onVisibility = () => {
      if (closed) return;
      for (const session of sessions) void session.setVisible(visible());
    };
    const onActivity = () => {
      if (closed) return;
      // Throttle DOM activity; lease renewals stay on the bridge's 30s clock.
      if (Date.now() - latestActivity < 1000) return;
      latestActivity = Date.now();
      for (const session of sessions) void session.activity();
    };

    for (const session of sessions) {
      if (visible()) void session.start();
      else void session.setVisible(false);
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    return () => {
      closed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      for (const session of sessions) void session.stop().catch(report);
    };
  }, [targetKey, enabled, v2, keepWhileVisible]);
}
