import fs from 'node:fs';
const base = 'http://127.0.0.1:8288/v1/projects/demo-totem-homolog/databases/(default)/documents';
function value(v) {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  if (typeof v === 'object') return { mapValue: { fields: fields(v) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return { doubleValue: v };
  return { stringValue: v };
}
const fields = data => Object.fromEntries(Object.entries(data).map(([k, v]) => [k, value(v)]));
async function put(p, data) {
  const response = await fetch(base + '/' + p, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: fields(data) }) });
  if (!response.ok) throw new Error(await response.text());
}
const account = await fetch('http://127.0.0.1:9288/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-local-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'homologacao@example.test', password: 'Homologacao-local-2026!', returnSecureToken: true }) }).then(r => r.json());
if (account.error && account.error.message !== 'EMAIL_EXISTS') throw new Error(JSON.stringify(account.error));
await put('settings/masterAccess', { emails: ['homologacao@example.test'] });
const all = {};
for (const [client, code, screen, ids] of [['A', 'TESTA1', 'tela01', ['video01.webm', 'imagem01.png']], ['A', 'TESTA2', 'tela02', ['video02.webm', 'imagem02.png']], ['B', 'TESTB1', 'tela01', ['videoB.webm', 'imagemB.png']]]) {
  await put('clients/' + client, { name: 'HOMOLOGAÇÃO Cliente ' + client, email: client.toLowerCase() + '@example.test', plan: 'Enterprise', status: 'Ativo', accountStatus: 'active', dueDate: '2099-12-31', screensLimit: '10', premiumTemplatesEnabled: true });
  const items = [];
  for (const name of ids) {
    const response = await fetch('http://127.0.0.1:5198/media/' + name);
    if (!response.ok) throw new Error('Prepare local fixtures first');
    const sizeBytes = (await response.arrayBuffer()).byteLength;
    items.push({ id: name, mediaId: name, title: name, type: name.endsWith('.webm') ? 'Vídeo' : 'Imagem', preview: 'http://127.0.0.1:5199/media/' + name, sizeBytes, duration: 3, soundEnabled: false });
  }
  const playlistId = 'playlist-' + screen;
  await put(`clients/${client}/playlists/${playlistId}`, { name: 'Playlist ' + client + '/' + screen, items, playlistRevision: 'homolog-1', scheduleEnabled: false, transition: 'none' });
  for (const item of items) await put(`clients/${client}/media/${item.id}`, item);
  await put(`clients/${client}/screens/${screen}`, { name: 'HOMOLOGAÇÃO ' + code, code, clientId: client, playlistId, orientation: 'Paisagem', status: 'offline', location: 'Laboratório local', remoteCommand: null });
  await put(`tv_codes/${code}`, { clientId: client, screenId: screen, screenName: code, clientName: 'HOMOLOGAÇÃO ' + client });
  all[code] = { client, screen, playlistId, items };
}
fs.writeFileSync(new URL('seed-data.json', import.meta.url), JSON.stringify(all, null, 2));
console.log('Seed local concluído: A/TESTA1, A/TESTA2, B/TESTB1. Conta: homologacao@example.test');
