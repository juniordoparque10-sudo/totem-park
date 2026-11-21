// O Portal habilita somente as telas realmente observadas. Nenhum listener adicional no Player.
import { useEffect } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { db, auth } from './firebase';
import { NOW_PLAYING_DEMAND_RENEW_MS, updateNowPlayingViewers } from './now-playing-demand';

async function changeLease(clientId, screenId, viewerId, enabled) {
  if (!clientId || !screenId) return;
  const ref = doc(db, 'clients', clientId, 'screens', screenId);
  await runTransaction(db, async transaction => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const prior = snap.data().nowPlayingDemandViewers || {};
    const next = updateNowPlayingViewers(prior, viewerId, Date.now(), enabled);
    // Evita escrever ao sair se o registro ja expirou.
    if (!enabled && !Object.prototype.hasOwnProperty.call(prior, viewerId)) return;
    transaction.update(ref, { nowPlayingDemandViewers: next });
  });
}

/** targets: lista estavel de 'clientId/screenId'. O Portal nunca deve ativar o laboratorio em producao. */
export function useNowPlayingDemandTargets(targets = [], enabled = false, keepWhileVisible = false) {
  const targetKey = [...new Set(targets)].sort().join('|');
  useEffect(() => {
    if (!enabled || !targetKey) return undefined;
    const keys = targetKey.split('|').filter(Boolean).map(key => {
      const slash = key.indexOf('/');
      return slash > 0 ? [key.slice(0,slash), key.slice(slash+1)] : null;
    }).filter(Boolean);
    if (!keys.length) return undefined;
    let stopped = false;
    let queue = Promise.resolve();
    let active = false;
    // A chave e o UID autenticado; outra chave seria rejeitada pelas regras.
    // O limite multiaba por mesmo UID sera tratado em etapa separada.
    const viewerId = auth.currentUser?.uid;
    if (!viewerId) return undefined;
    let lastActivityAt = Date.now();
    const enqueue = (enable) => {
      const currentViewerId = viewerId;
      queue = queue.catch(() => {}).then(async () => {
        if (enable && stopped) return;
        await Promise.all(keys.map(([clientId,screenId]) =>
          changeLease(clientId,screenId,currentViewerId,enable)
            .catch(error => console.warn('Now Playing LAB - solicitacao nao concluida', error))));
      });
    };
    const refresh = () => {
      const visible = document.visibilityState === 'visible'
        && (keepWhileVisible || Date.now() - lastActivityAt < 5 * 60_000);
      if (visible) {
        active = true; enqueue(true);
      }
      else if (active) { active = false; enqueue(false); }
    };
    const onActivity = () => { lastActivityAt = Date.now(); if (!active) refresh(); };
    refresh();
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    const timer = setInterval(refresh, NOW_PLAYING_DEMAND_RENEW_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      document.removeEventListener('visibilitychange', refresh);
      if (active) enqueue(false);
    };
  }, [targetKey, enabled, keepWhileVisible]);
}
