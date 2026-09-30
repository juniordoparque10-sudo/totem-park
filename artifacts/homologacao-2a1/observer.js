// Read-only observations injected by the LOCAL test server only.
if (location.pathname.startsWith('/player/')) {
const emit = (type, data) => fetch('/api/events', { method: 'POST', body: JSON.stringify({ at: new Date().toISOString(), origin: location.origin, page: location.pathname, type, ...data }) }).catch(() => {});
const seen = new WeakSet();
function observeMedia() {
  for (const element of document.querySelectorAll('video.player-media, img.player-media')) {
    if (seen.has(element)) continue;
    seen.add(element);
    const report = event => emit('player-media-event', { event: event.type, tag: element.tagName, src: element.currentSrc || element.src, title: element.alt || '', error: element.error?.code || null });
    for (const event of ['play', 'ended', 'error', 'loadeddata', 'load']) element.addEventListener(event, report);
  }
}
new MutationObserver(observeMedia).observe(document.documentElement, { childList: true, subtree: true });
observeMedia();
async function inspect() {
  const names = await caches.keys();
  const cache = names.includes('totempark-player-media-v1') ? await caches.open('totempark-player-media-v1') : null;
  const entries = [];
  if (cache) for (const request of await cache.keys()) {
    const response = await cache.match(request);
    entries.push({ key: request.url, bytes: (await response.blob()).size });
  }
  const registration = await navigator.serviceWorker.getRegistration();
  emit('real-player-snapshot', { names, entries, count: entries.length, bytes: entries.reduce((s, e) => s + e.bytes, 0),
    sw: { active: registration?.active?.state, waiting: registration?.waiting?.state },
    media: [...document.querySelectorAll('.is-current .player-media')].map(e => ({ tag: e.tagName, src: e.currentSrc, readyState: e.readyState, time: e.currentTime, width: e.naturalWidth, error: e.error?.code || null })),
    resources: performance.getEntriesByType('resource').filter(e => e.name.includes('/media/')).map(e => ({ name: e.name, transferSize: e.transferSize, encodedBodySize: e.encodedBodySize })) });
}
await inspect();
setInterval(inspect, 5000);
}
