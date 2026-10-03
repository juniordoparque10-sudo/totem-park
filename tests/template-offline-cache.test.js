import test from "node:test";
import assert from "node:assert/strict";
import { buildTemplateDataCacheKey, clearTemplateDataMemoryCacheForTests, readTemplateDataCache, writeTemplateDataCache } from "../src/templates-v2/offline-data-cache.js";
import { clearTemplateAssetMemoryCacheForTests, collectTemplateAssetUrls, createOfflineSafeTemplate, prepareTemplateAssets, refreshTemplateAsset } from "../src/templates-v2/offline-asset-cache.js";
import { shouldRevealTemplateImmediately } from "../src/templates-v2/offline-readiness.js";
import { getNextTemplateToPrepare } from "../src/templates-v2/offline-preload.js";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

class MemoryCache {
  values = new Map();
  async match(key) { return this.values.get(String(key)); }
  async put(key, value) { this.values.set(String(key), value); }
}

const cacheStorage = (cache = new MemoryCache()) => ({ cache, open:async () => cache });

test("cache de dados separa cliente, tela, template, módulo e configuração", () => {
  const storage = new MemoryStorage();
  const context = { clientId:"c1", screenId:"s1", templateId:"t1", module:"weather", config:{ city:"Recife" } };
  const otherScreen = { ...context, screenId:"s2" };
  assert.notEqual(buildTemplateDataCacheKey(context), buildTemplateDataCacheKey(otherScreen));
  writeTemplateDataCache(context, { temperature:28 }, { storage, now:123, source:"open-meteo" });
  clearTemplateDataMemoryCacheForTests();
  const record = readTemplateDataCache(context, storage);
  assert.equal(record.timestamp, 123);
  assert.equal(record.source, "open-meteo");
  assert.deepEqual(record.payload, { temperature:28 });
  assert.equal(readTemplateDataCache(otherScreen, storage), null);
});

test("cold boot usa logo e background persistidos sem fetch remoto", async () => {
  clearTemplateAssetMemoryCacheForTests();
  const storage = cacheStorage();
  const logo = "https://cdn.example/logo.png";
  const background = "https://cdn.example/background.jpg";
  await storage.cache.put(logo, new Response(new Blob(["logo"]), { status:200 }));
  await storage.cache.put(background, new Response(new Blob(["background"]), { status:200 }));
  const template = { published:{ content:{ logo:{ type:"image", url:logo } }, media:{ primary:{ type:"image", url:background } } } };
  const result = await prepareTemplateAssets(template, { cacheStorage:storage, createObjectURL:(blob) => `blob:local-${blob.size}` });
  assert.equal(result.hits, 2);
  assert.match(result.template.published.content.logo.url, /^blob:local-/);
  assert.match(result.template.published.media.primary.url, /^blob:local-/);
});

test("template sem asset local nasce com fallback e não mantém URL remota", () => {
  const remote = "https://cdn.example/missing.jpg";
  const template = { schemaVersion:2, playerItemType:"template", published:{ media:{ primary:{ type:"image", url:remote } } } };
  assert.equal(createOfflineSafeTemplate(template).published.media.primary.url, "");
  assert.equal(shouldRevealTemplateImmediately(template), true);
});

test("falha de atualização preserva asset antigo válido", async () => {
  const remote = "https://cdn.example/stable.png";
  const storage = cacheStorage();
  await storage.cache.put(remote, new Response(new Blob(["old-valid"]), { status:200 }));
  const result = await refreshTemplateAsset(remote, { cacheStorage:storage, fetchImpl:async () => { throw new Error("offline"); } });
  assert.equal(result.status, "preserved");
  assert.equal(await (await storage.cache.match(remote)).text(), "old-valid");
});

test("URLs de logo, background e logos esportivos são deduplicadas", () => {
  const shared = "https://cdn.example/shared.png";
  const urls = collectTemplateAssetUrls({ published:{ content:{ logo:{ url:shared } }, media:{ primary:{ url:shared } }, sports:{ teams:[{ logo:"https://cdn.example/team.png" }] } } });
  assert.deepEqual([...urls].sort(), [shared, "https://cdn.example/team.png"].sort());
});

test("URL funcional de QR ou feed não é tratada como imagem", () => {
  const qrTarget = "https://example.com/landing";
  const feed = "https://example.com/feed.xml";
  const template = { published:{ modules:{ qrCode:{ url:qrTarget }, news:{ url:feed } } } };
  assert.deepEqual([...collectTemplateAssetUrls(template)], []);
  const safe = createOfflineSafeTemplate(template);
  assert.equal(safe.published.modules.qrCode.url, qrTarget);
  assert.equal(safe.published.modules.news.url, feed);
});

test("vídeo atual prepara a próxima template antes da transição", () => {
  const video = { playerItemType:"media", type:"Vídeo" };
  const template = { playerItemType:"template", id:"template-next" };
  assert.equal(getNextTemplateToPrepare([video, template], 0), template);
});

test("refresh concorrente é deduplicado e disponibiliza o asset novo", async () => {
  clearTemplateAssetMemoryCacheForTests();
  const remote = "https://cdn.example/new.png";
  const storage = cacheStorage();
  let fetches = 0;
  const fetchImpl = async () => { fetches += 1; return new Response(new Blob(["new"]), { status:200 }); };
  const [first, second] = await Promise.all([
    refreshTemplateAsset(remote, { cacheStorage:storage, fetchImpl }),
    refreshTemplateAsset(remote, { cacheStorage:storage, fetchImpl }),
  ]);
  assert.equal(fetches, 1);
  assert.equal(first.status, "stored");
  assert.equal(second.status, "stored");
  assert.equal(await (await storage.cache.match(remote)).text(), "new");
});
