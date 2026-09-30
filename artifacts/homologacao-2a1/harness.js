import { cachePlaylistMedia, removeUnusedCachedMedia, clearScreenMediaCache, getMediaCacheKey } from '/@fs/C:/Users/centr/Desktop/totem-park/src/offline-player-cache.js';
const $ = id => document.getElementById(id);
const mediaName = 'totempark-player-media-v1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = async (type, data = {}) => {
  const event = { at: new Date().toISOString(), type, ...data };
  $('output').textContent = JSON.stringify(event, null, 2) + '\n' + $('output').textContent;
  await fetch('/api/events', { method: 'POST', body: JSON.stringify(event) });
};
window.addEventListener('error', e => log('error', { message: e.message }));
window.addEventListener('unhandledrejection', e => log('error', { message: String(e.reason) }));
async function snapshot(label) {
  const names = await caches.keys();
  const cache = await caches.open(mediaName);
  const entries = [];
  for (const request of await cache.keys()) {
    const response = await cache.match(request);
    entries.push({ key: request.url, bytes: (await response.blob()).size });
  }
  await log('snapshot', { label, names, entries, count: entries.length, bytes: entries.reduce((s, e) => s + e.bytes, 0) });
}
async function fixture(id, type, color) {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
  const ctx = canvas.getContext('2d');
  const draw = t => { ctx.fillStyle = color; ctx.fillRect(0, 0, 640, 360); ctx.fillStyle = '#fff'; ctx.font = '36px sans-serif'; ctx.fillText(id, 36, 90); ctx.fillText('Totem Park | TESTE', 36, 150); ctx.fillRect(30 + t % 450, 250, 80, 30); };
  draw(0);
  let blob;
  if (type === 'video') {
    const stream = canvas.captureStream(20);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    const chunks = []; recorder.ondataavailable = e => chunks.push(e.data);
    const done = new Promise(resolve => recorder.onstop = resolve);
    recorder.start();
    const timer = setInterval(() => draw(Date.now()), 50);
    await sleep(1600); recorder.stop(); await done; clearInterval(timer); stream.getTracks().forEach(t => t.stop());
    blob = new Blob(chunks, { type: 'video/webm' });
  } else blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const preview = location.origin + '/media/' + id + (type === 'video' ? '.webm' : '.png');
  await fetch(preview, { method: 'POST', body: blob });
  return { id, type: type === 'video' ? 'video' : 'imagem', preview, sizeBytes: blob.size };
}
let lists = JSON.parse(localStorage.getItem('homolog-lists') || '{}');
let active = null;
async function play(client, name) {
  const items = lists[name]; if (!items) throw new Error('Execute preparação primeiro');
  active = { client, name };
  localStorage.setItem('homolog-active', JSON.stringify(active));
  $('playing').textContent = `${client} — ${name}`;
  $('video').src = items[0].preview; $('image').src = items[1].preview;
  await $('video').play().catch(e => log('play-warning', { message: e.message }));
  const result = await cachePlaylistMedia({ clientId: client, items, concurrency: 2 });
  const cleanup = await removeUnusedCachedMedia(items.map(item => getMediaCacheKey(client, item)));
  $('video').src = result.results[getMediaCacheKey(client, items[0])]?.url || items[0].preview;
  $('image').src = result.results[getMediaCacheKey(client, items[1])]?.url || items[1].preview;
  await $('video').play();
  await log('prepared', { client, name, cached: result.cached, downloaded: result.downloaded, downloadedBytes: result.downloadedBytes, failed: result.failed, removed: cleanup.removed });
  await snapshot(name);
}
const actions = {
  async init() {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    await log('old-worker-active', { state: registration.active?.state });
    for (const name of ['totem-park-pwa-v2', 'totem-park-pwa-v3', mediaName, 'cache-de-teste-nao-relacionado']) {
      const cache = await caches.open(name);
      if (name !== mediaName) await cache.put('/sentinel-' + name, new Response('preservar'));
    }
    lists = {};
    for (const [name, ids, color] of [['A-Tela01', ['video01', 'imagem01'], '#174d79'], ['A-Tela02', ['video02', 'imagem02'], '#633678'], ['B-Tela01', ['videoB', 'imagemB'], '#236550']]) {
      lists[name] = [await fixture(ids[0], 'video', color), await fixture(ids[1], 'image', color)];
    }
    lists['A-Atualizada'] = [lists['A-Tela01'][0], await fixture('imagemNova', 'image', '#7b4620')];
    localStorage.setItem('homolog-lists', JSON.stringify(lists));
    await snapshot('antes-preparar');
  },
  a1: () => play('A', 'A-Tela01'), a2: () => play('A', 'A-Tela02'), b: () => play('B', 'B-Tela01'),
  change: () => play('A', 'A-Atualizada'), back: () => play('A', 'A-Tela01'),
  async update() {
    await snapshot('antes-ativacao');
    const registration = await navigator.serviceWorker.getRegistration();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      log('worker-state', { state: worker.state });
      worker.addEventListener('statechange', () => log('worker-state', { state: worker.state, waiting: !!registration.waiting }));
    });
    await fetch('/api/new-sw', { method: 'POST' });
    const changed = new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    await registration.update(); await changed;
    await snapshot('depois-ativacao');
  },
  async inspect() {
    await snapshot('inspecao');
    await log('browser', { userAgent: navigator.userAgent, online: navigator.onLine,
      video: { src: $('video').currentSrc, time: $('video').currentTime, readyState: $('video').readyState, error: $('video').error?.code || null },
      image: { src: $('image').currentSrc, complete: $('image').complete, width: $('image').naturalWidth },
      resources: performance.getEntriesByType('resource').filter(e => e.name.includes('/media/')).map(e => ({ name: e.name, transferSize: e.transferSize, encodedBodySize: e.encodedBodySize, decodedBodySize: e.decodedBodySize })) });
  },
  async off() {
    await fetch('/api/media-off', { method: 'POST' });
    const start = $('video').currentTime;
    await sleep(2700);
    await log('media-server-unavailable', { start, end: $('video').currentTime, videoReady: $('video').readyState, videoError: $('video').error?.code || null, imageWidth: $('image').naturalWidth });
    await snapshot('servidor-media-indisponivel');
    await fetch('/api/media-on', { method: 'POST' });
  },
  async clear() {
    await snapshot('antes-clearCache-A');
    const result = await clearScreenMediaCache('A');
    if (active?.client === 'A') { $('video').src = lists[active.name][0].preview; $('image').src = lists[active.name][1].preview; await $('video').play(); }
    await log('clearCache', result); await snapshot('depois-clearCache-A');
  },
  async net() {
    const url = lists['A-Tela01'][0].preview;
    const response = await fetch(url, { cache: 'no-store' }); await response.arrayBuffer();
    const etag = response.headers.get('etag');
    const conditional = await fetch(url, { cache: 'no-store', headers: { 'If-None-Match': etag } });
    const range = await fetch(url, { cache: 'no-store', headers: { Range: 'bytes=0-99' } });
    await log('http-diagnostic-not-playback', { full: response.status, conditional: conditional.status, range: range.status, rangeBytes: (await range.arrayBuffer()).byteLength });
  },
};
for (const [id, action] of Object.entries(actions)) $(id).onclick = async () => {
  $('status').textContent = 'Executando ' + id;
  try { await action(); $('status').textContent = 'Concluído: ' + id; }
  catch (error) { $('status').textContent = 'Falha: ' + error.message; await log('action-error', { id, message: error.stack }); }
};
$('status').textContent = 'Pronto. Origem local isolada.';
await snapshot('abertura-pagina');
const previous = JSON.parse(localStorage.getItem('homolog-active') || 'null');
if (previous && lists[previous.name]) await play(previous.client, previous.name);
