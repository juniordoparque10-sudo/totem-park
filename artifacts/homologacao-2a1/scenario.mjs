import fs from 'node:fs';
const base = 'http://127.0.0.1:8288/v1/projects/demo-totem-homolog/databases/(default)/documents';
const fixtures = JSON.parse(fs.readFileSync(new URL('seed-data.json', import.meta.url)));
const output = new URL('scenarios.jsonl', import.meta.url);
const val = v => v === null ? { nullValue: null } : Array.isArray(v) ? { arrayValue: { values: v.map(val) } } : typeof v === 'object' ? { mapValue: { fields: fields(v) } } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? { doubleValue: v } : { stringValue: v };
const fields = data => Object.fromEntries(Object.entries(data).map(([k, v]) => [k, val(v)]));
async function patch(p, data) {
  const query = new URLSearchParams(); for (const key of Object.keys(data)) query.append('updateMask.fieldPaths', key);
  const r = await fetch(`${base}/${p}?${query}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: fields(data) }) });
  if (!r.ok) throw new Error(await r.text());
}
const action = process.argv[2];
const a = fixtures.TESTA1;
if (action === 'update') {
  const response = await fetch('http://127.0.0.1:5198/media/imagemNova.png');
  const item = { ...a.items[1], id: 'imagemNova.png', mediaId: 'imagemNova.png', title: 'NOVA IMAGEM REALTIME', preview: 'http://127.0.0.1:5199/media/imagemNova.png', sizeBytes: (await response.arrayBuffer()).byteLength };
  await patch('clients/A/playlists/' + a.playlistId, { items: [a.items[0], item], playlistRevision: 'homolog-update-' + Date.now() });
} else if (action === 'switch') {
  await patch('clients/A/screens/tela01', { playlistId: fixtures.TESTA2.playlistId });
} else if (action === 'restore') {
  await patch('clients/A/playlists/' + a.playlistId, { items: a.items, playlistRevision: 'homolog-restore-' + Date.now() });
  await patch('clients/A/screens/tela01', { playlistId: a.playlistId });
} else if (action === 'schedule') {
  await patch('clients/A/playlists/scheduled-test', { name: 'AGENDADA HOMOLOGACAO', scheduleEnabled: true, targetScreenIds: ['tela01'], startDate: '2026-01-01', endDate: '2099-12-31', startTime: '00:00', endTime: '00:00', items: fixtures.TESTA2.items, playlistRevision: 'scheduled-1' });
} else if (action === 'unschedule') {
  await patch('clients/A/playlists/scheduled-test', { scheduleEnabled: false });
} else if (action === 'template') {
  const template = { id: 'aviso-local', type: 'aviso', templateType: 'aviso', title: 'HOMOLOGAÇÃO TEMPLATE', mainText: 'Teste local sem produção', subtitle: 'Retenção de cache 2A.1', duration: 5, enabled: true, backgroundColor: '#173c65', textColor: '#ffffff' };
  await patch('clients/A/templates/aviso-local', template);
  await patch('clients/A/playlists/' + a.playlistId, { items: [a.items[0], a.items[1], { ...template, templateId: template.id, playerItemType: 'template' }], playlistRevision: 'template-' + Date.now() });
} else if (action === 'clear') {
  await patch('clients/A/screens/tela01', { remoteCommand: { id: 'clear-' + Date.now(), type: 'clearCache', createdAt: new Date().toISOString() }, commandStatus: 'pending' });
} else if (action !== 'status') throw new Error('Unknown local scenario');
const screens = {};
for (const [code, fixture] of Object.entries(fixtures)) {
  const doc = await fetch(`${base}/clients/${fixture.client}/screens/${fixture.screen}`, { headers: { Authorization: 'Bearer owner' } }).then(r => r.json());
  screens[code] = doc.fields;
}
const record = { at: new Date().toISOString(), action, screens };
fs.appendFileSync(output, JSON.stringify(record) + '\n');
console.log(JSON.stringify({ at: record.at, action, screens: Object.fromEntries(Object.entries(screens).map(([k,v])=>[k,{status:v.status,lastSeenAt:v.lastSeenAt,playlist:v.currentPlaylistName,mode:v.currentPlaylistMode,item:v.nowPlayingTitle,cache:v.cacheStatus,cached:v.cachedItems,command:v.commandStatus}])) },null,2));
