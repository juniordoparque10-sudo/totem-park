// BASIC V5 LAB - Now Playing sob demanda, sem dependencia do Firebase.
export const NOW_PLAYING_DEMAND_LEASE_MS = 75_000;
export const NOW_PLAYING_DEMAND_RENEW_MS = 30_000;

export function activeNowPlayingViewers(viewers, now = Date.now()) {
  if (!viewers || typeof viewers !== 'object' || Array.isArray(viewers)) return [];
  return Object.entries(viewers)
    .filter(([id, expiry]) => /^[a-zA-Z0-9_:-]{1,128}$/.test(id)
      && typeof expiry === 'number'
      && Number.isFinite(expiry)
      && expiry > now
      && expiry <= now + 2 * NOW_PLAYING_DEMAND_LEASE_MS)
    .map(([id]) => id).sort();
}

export function hasNowPlayingDemand(viewers, now = Date.now()) {
  return activeNowPlayingViewers(viewers, now).length > 0;
}

export function updateNowPlayingViewers(existing, viewerId, now, enabled) {
  // Nunca remover leases de outros usuarios: regras Firestore permitem modificar apenas a propria chave.
  const valid = existing && typeof existing === 'object' && !Array.isArray(existing)
    ? { ...existing } : {};
  delete valid[viewerId];
  if (enabled) {
    if (!/^[a-zA-Z0-9_:-]{1,128}$/.test(viewerId)) throw new Error('Identificador de observador invalido');
    valid[viewerId] = now + NOW_PLAYING_DEMAND_LEASE_MS;
  }
  return valid;
}
