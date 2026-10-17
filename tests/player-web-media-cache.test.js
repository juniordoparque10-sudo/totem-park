import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createServer } from "vite";

let cachePlaylistMedia;
let vite;

before(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  ({ cachePlaylistMedia } = await vite.ssrLoadModule("/src/offline-player-cache.js"));
});

after(async () => {
  await vite?.close();
});

const externalImage = {
  id: "external-image",
  mediaId: "external-image",
  type: "Imagem",
  preview: "https://firebasestorage.googleapis.com/v0/b/totem-park/o/image.png?alt=media",
};

function withBrowserGlobals(values, callback) {
  const previous = new Map();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  return Promise.resolve(callback()).finally(() => {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
}

test("cross-origin Web media uses remote-bypass without a CORS fetch", async () => {
  let fetchCount = 0;
  let cacheOpenCount = 0;

  const result = await withBrowserGlobals({
    location: { origin: "https://preview.example" },
    fetch: async () => { fetchCount += 1; throw new Error("CORS fetch must not run"); },
    caches: { open: async () => { cacheOpenCount += 1; throw new Error("cross-origin cache must not open"); } },
  }, () => cachePlaylistMedia({ clientId: "client-a", items: [externalImage] }));

  assert.equal(fetchCount, 0);
  assert.equal(cacheOpenCount, 0);
  assert.equal(result.failed, 0);
  assert.equal(result.cached, 0);
  assert.equal(result.bypassed, 1);
  assert.deepEqual(result.results, {});
});

test("same-origin Web media remains persistently cacheable", async () => {
  let fetchCount = 0;
  let cachePutCount = 0;
  const cache = {
    async match() { return null; },
    async put(_request, response) {
      cachePutCount += 1;
      assert.equal(response.ok, true);
    },
  };
  const sameOriginImage = {
    ...externalImage,
    id: "same-origin-image",
    mediaId: "same-origin-image",
    preview: "https://preview.example/media/image.png",
  };

  const result = await withBrowserGlobals({
    location: { origin: "https://preview.example" },
    fetch: async () => { fetchCount += 1; return new Response(new Blob(["image"]), { status: 200 }); },
    caches: { open: async () => cache },
    localStorage: { getItem: () => null, setItem: () => {} },
  }, () => cachePlaylistMedia({ clientId: "client-a", items: [sameOriginImage] }));

  assert.equal(fetchCount, 1);
  assert.equal(cachePutCount, 1);
  assert.equal(result.failed, 0);
  assert.equal(result.downloaded, 1);
  assert.equal(result.cached, 1);
  assert.equal(result.bypassed, 0);
});
