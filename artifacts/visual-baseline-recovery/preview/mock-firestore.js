const now = Date.now();
const screen = (id, name, seconds, version) => ({
  id, name, code: id, connectedAuthUid: `uid-${id}`, connectedDeviceId: `device-${id}`,
  currentPlaylistName: 'Playlist de teste', location: 'São Paulo, SP',
  telemetryUpdatedAt: now - seconds * 1000,
  telemetry: { schemaVersion: 3, session: { appVersion: version }, counters: { activeTimeMs: 2670000 }, current: { connectionStatus: 'ONLINE', lastSignalAt: now - seconds * 1000 } },
});
const screens = [
  screen('TV-TESTE', 'TV Teste', 8, '1.0-player-2a2-c-operational-v1'),
  screen('RECEPCAO', 'Recepção', 72, '1.0-player-2a2-c-operational-v1'),
  screen('LOJA', 'Loja', 420, '1.0-player-2a2-c-operational-v1'),
];
const snapshot = (docs) => ({ docs: docs.map((item) => ({ id: item.id, data: () => item })) });
export const collection = (_db, ...path) => ({ path: path.join('/') });
export const doc = (_db, ...path) => ({ path: path.join('/') });
export const serverTimestamp = () => now;
export const setDoc = async () => {};
export const onSnapshot = (reference, next) => {
  queueMicrotask(() => {
    if (reference.path === 'clients') next(snapshot([{ id: 'kimura', name: 'Kimura AG' }]));
    else if (reference.path === 'clients/kimura/screens') next(snapshot(screens));
    else if (reference.path === 'playerDeviceBindings') next(snapshot(screens.map((item) => ({ id: item.connectedAuthUid, status: 'ACTIVE', clientId: 'kimura', screenId: item.id, deviceId: item.connectedDeviceId, linkedAt: now - 86400000 }))));
    else if (reference.path === 'settings/telemetry2a2c') next({ exists: () => true, data: () => ({ enabled: true, screenIds: screens.map((item) => item.id), clientIds: [], deviceIds: [], syncIntervalMs: 300000 }) });
  });
  return () => {};
};
