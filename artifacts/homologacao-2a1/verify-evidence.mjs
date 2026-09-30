import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('./', import.meta.url);
const evidence = JSON.parse(fs.readFileSync(new URL('evidence.json', root)));
const events = evidence.events;
const before = events.find(e => e.type === 'snapshot' && e.label === 'antes-ativacao');
const after = events.find(e => e.type === 'snapshot' && e.label === 'abertura-pagina' && e.at > before.at && !e.names.includes('totem-park-pwa-v2'));
assert.ok(before.names.includes('totem-park-pwa-v2'));
assert.ok(after.names.includes('totempark-player-media-v1'));
assert.ok(after.names.includes('cache-de-teste-nao-relacionado'));
assert.deepEqual(after.entries, before.entries);
const full = events.filter(e => e.type === 'real-player-snapshot' && e.page === '/player/A/TESTA1');
const six = full.find(e => e.count === 6);
const seven = full.find(e => e.count === 7);
assert.ok(six && seven);
assert.ok(six.entries.every(a => seven.entries.some(b => a.key === b.key && a.bytes === b.bytes)));
const clear = full.find(e => e.at > '2026-09-16T01:41:45.570Z' && e.count === 2);
assert.ok(clear);
assert.equal(clear.bytes, 40910);
const reprepare = full.find(e => e.at > clear.at && e.count === 4);
assert.ok(reprepare);
const outageStart = events.find(e => e.type === 'real-media-outage-start');
const outageEnd = events.find(e => e.type === 'real-media-outage-end');
const outage = events.filter(e => e.at >= outageStart.at && e.at <= outageEnd.at && e.page === '/player/A/TESTA1');
assert.ok(outage.some(e => e.type === 'player-media-event' && e.event === 'play' && e.src.startsWith('blob:')));
assert.ok(outage.some(e => e.type === 'player-media-event' && e.event === 'ended'));
assert.ok(!outage.some(e => e.type === 'player-media-event' && e.event === 'error'));
const summary = {
  sw: { before, after, states: events.filter(e => e.type === 'worker-state') },
  realPlayerGrowth: { before: { at: six.at, count: six.count, bytes: six.bytes }, after: { at: seven.at, count: seven.count, bytes: seven.bytes } },
  clearCache: { after: { at: clear.at, count: clear.count, bytes: clear.bytes }, afterReload: { at: reprepare.at, count: reprepare.count, bytes: reprepare.bytes } },
  mediaOutage: { from: outageStart.at, to: outageEnd.at, seconds: (Date.parse(outageEnd.at) - Date.parse(outageStart.at)) / 1000,
    playEvents: outage.filter(e => e.event === 'play').length, endedEvents: outage.filter(e => e.event === 'ended').length,
    cacheSnapshots: outage.filter(e => e.type === 'real-player-snapshot').map(e=>({at:e.at,count:e.count,bytes:e.bytes})), fullOfflineTest: false },
  network: { firstReload: evidence.requests.filter(r => Date.parse(r.at) >= Date.parse('2026-09-15T21:18:15Z') && Date.parse(r.at) <= Date.parse('2026-09-15T21:18:16Z')),
    diagnostic: events.find(e => e.type === 'http-diagnostic-not-playback'),
    samples: [200,206,304].map(status => evidence.requests.find(r => r.status === status)) },
  pending: ['Full browser process restart', 'DevTools Offline / complete network disconnection'],
};
fs.writeFileSync(new URL('verification.json', root), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({swPreserved:true,growth:summary.realPlayerGrowth,clear:summary.clearCache,outage:summary.mediaOutage,network:summary.network},null,2));
