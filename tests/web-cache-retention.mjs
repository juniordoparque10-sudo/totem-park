import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Isolated browser doubles: no network, Firebase, device or real browser cache.
const source = fs.readFileSync(new URL('../src/offline-player-cache.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const names = new Set(['totem-park-pwa-v1', 'totem-park-pwa-v2',
  'totem-park-pwa-v3', 'totempark-player-media-v1', 'other-cache',
  'totem-park-pwa-v99', 'totem-park-pwa-v2-other']);
const handlers = {};
vm.runInNewContext(sw, {
  self: { addEventListener: (name, handler) => { handlers[name] = handler; }, clients: { claim() {} } },
  caches: { keys: async () => [...names], delete: async name => names.delete(name) },
});
let activation;
handlers.activate({ waitUntil: promise => { activation = promise; } });
await activation;
assert.deepEqual([...names], ['totem-park-pwa-v3', 'totempark-player-media-v1',
  'other-cache', 'totem-park-pwa-v99', 'totem-park-pwa-v2-other']);
console.log('A: SW removes only explicitly retired shell caches; current, media and unknown caches survive.');

const entries = new Map();
const metadata = new Map();
let native = false;
let downloads = 0;
const cache = {
  match: async request => entries.get(request.url)?.clone(),
  keys: async () => [...entries.keys()].map(url => new Request(url)),
  delete: async request => entries.delete(request.url),
};
const context = vm.createContext({
  Capacitor: { isNativePlatform: () => native }, Request, URL,
  localStorage: { getItem: key => metadata.get(key), setItem: (key, value) => metadata.set(key, value) },
  caches: { open: async name => { assert.equal(name, 'totempark-player-media-v1'); return cache; } },
  fetch: async () => { downloads++; throw new Error('Unexpected download'); },
});
vm.runInContext(source.replace(/^import .*;\r?\n/gm, '').replace(/export /g, ''), context);
const item = id => ({ id, type: 'video', preview: `https://example.test/${id}.mp4`, sizeBytes: 5 });
const key = (client, id) => context.getMediaCacheKey(client, item(id));
const a1 = key('A', 'video01');
const a2 = key('A', 'video02');
const b1 = key('B', 'video03');
const b2 = key('B', 'video04');
const prefix = 'https://totempark.local/cache/';
for (const id of [a1, a2, b1, b2, 'legacy-without-metadata']) entries.set(prefix + id, new Response('media'));
metadata.set('totempark-player-media-cache-meta', JSON.stringify({
  [a1]: { clientId: 'A' }, [a2]: { clientId: 'A' },
  [b1]: { clientId: 'B' }, [b2]: { clientId: 'B' },
}));
const before = [...entries.keys()];
const metaBefore = [...metadata.entries()];
const result = await context.removeUnusedCachedMedia([a1]);
assert.equal(result.removed, 0);
assert.deepEqual([...entries.keys()], before);
assert.deepEqual([...metadata.entries()], metaBefore);
console.log('B: cleanup for A preserves both B media and legacy entries, without changing metadata.');
// A1 belongs to screen 01; A2 to screen 02. No ownership index is assumed.
await Promise.all([context.removeUnusedCachedMedia([a1]), context.removeUnusedCachedMedia([a2])]);
await context.removeUnusedCachedMedia();
assert.deepEqual([...entries.keys()], before);
console.log('C: same-client screens, concurrent calls and empty keep lists preserve all entries.');
const cached = await context.getCachedMediaUrl('A', item('video01'));
assert.equal(cached.source, 'cache');
assert.equal(cached.key, a1);
assert.equal(downloads, 0);
URL.revokeObjectURL(cached.url);
console.log('D: existing media is found in v1 with no download.');
// Native branch retains the previous Cache Storage helper behavior; the real
// native Filesystem preparation path does not call this helper.
native = true;
assert.equal((await context.removeUnusedCachedMedia([a1], [a2])).removed, 3);
assert.deepEqual([...entries.keys()], [prefix + a1, prefix + a2]);
console.log('E: native guard bypass preserves the previous helper behavior.');
console.log('PASS: isolated defensive Web cache retention tests.');
