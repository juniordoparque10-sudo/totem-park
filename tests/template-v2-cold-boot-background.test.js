import test from "node:test";
import assert from "node:assert/strict";
import { clearTemplateAssetMemoryCacheForTests } from "../src/templates-v2/offline-asset-cache.js";
import { listTemplateV2Definitions } from "../src/templates-v2/registry.js";
import { createTemplateV2Draft } from "../src/templates-v2/schema.js";

let critical = {};
try { critical = await import("../src/templates-v2/offline-critical-asset.js"); } catch { /* RED */ }

class MemoryCache {
  values = new Map();
  async match(key) { return this.values.get(String(key))?.clone(); }
  async put(key, value) { this.values.set(String(key), value.clone()); }
}

const cacheStorage = (cache = new MemoryCache()) => ({ cache, open:async () => cache });

function loadedImageClass(sources) {
  return class LoadedImage {
    async decode() {}
    set src(value) {
      sources.push(value);
      queueMicrotask(() => this.onload?.());
    }
  };
}

function failedImageClass(sources) {
  return class FailedImage {
    set src(value) {
      sources.push(value);
      queueMicrotask(() => this.onerror?.(new Error("offline")));
    }
  };
}

function itemFor(type, remote) {
  const published = createTemplateV2Draft(type, { media:{ primary:{ type:"image", url:remote, fileHash:`${type}-v1` } } });
  return { id:`template-${type}`, templateId:`template-${type}`, templateType:type, identity:{ templateType:type }, playerItemType:"template", published };
}

test("Mercado Premium recria blob do Cache Storage antes do preload remoto no cold boot", async () => {
  assert.equal(typeof critical.prepareTemplateV2CriticalImageFromCache, "function");
  const remote = "https://cdn.example/market-background.jpg";
  const storage = cacheStorage();
  await storage.cache.put(remote, new Response(new Blob(["market-background"]), { status:200, headers:{ "Content-Type":"image/jpeg" } }));
  const created = [];

  clearTemplateAssetMemoryCacheForTests();
  const firstSources = [];
  const first = await critical.prepareTemplateV2CriticalImageFromCache(itemFor("market-premium", remote), loadedImageClass(firstSources), {
    assetOptions:{ cacheStorage:storage, createObjectURL:() => { const url="blob:first-session"; created.push(url); return url; } },
    maxAttempts:1,
  });
  clearTemplateAssetMemoryCacheForTests();
  const secondSources = [];
  const second = await critical.prepareTemplateV2CriticalImageFromCache(itemFor("market-premium", remote), loadedImageClass(secondSources), {
    assetOptions:{ cacheStorage:storage, createObjectURL:() => { const url="blob:second-session"; created.push(url); return url; } },
    maxAttempts:1,
  });

  assert.equal(first.status, "ready");
  assert.equal(second.status, "ready");
  assert.deepEqual(firstSources, ["blob:first-session"]);
  assert.deepEqual(secondSources, ["blob:second-session"]);
  assert.deepEqual(created, ["blob:first-session", "blob:second-session"]);
  assert.equal(second.template.published.media.primary.url, "blob:second-session");
});

test("os 13 tipos V2 usam background persistido sem download no cold boot offline", async () => {
  assert.equal(typeof critical.prepareTemplateV2CriticalImageFromCache, "function");
  const definitions = listTemplateV2Definitions();
  assert.equal(definitions.length, 13);
  for (const definition of definitions) {
    clearTemplateAssetMemoryCacheForTests();
    const remote = `https://cdn.example/${definition.type}.jpg`;
    const storage = cacheStorage();
    await storage.cache.put(remote, new Response(new Blob([definition.type]), { status:200, headers:{ "Content-Type":"image/jpeg" } }));
    const sources = [];
    const result = await critical.prepareTemplateV2CriticalImageFromCache(itemFor(definition.type, remote), loadedImageClass(sources), {
      assetOptions:{ cacheStorage:storage, createObjectURL:() => `blob:${definition.type}` },
      maxAttempts:1,
    });
    assert.equal(result.status, "ready", definition.type);
    assert.deepEqual(sources, [`blob:${definition.type}`], definition.type);
  }
});

test("sem asset local preserva falha remota e não inventa background", async () => {
  const remote = "https://cdn.example/missing-background.jpg";
  const sources = [];
  const result = await critical.prepareTemplateV2CriticalImageFromCache(itemFor("market-premium", remote), failedImageClass(sources), {
    assetOptions:{ cacheStorage:cacheStorage(), createObjectURL:() => { throw new Error("não deveria criar blob"); } },
    maxAttempts:1,
    failureCooldownMs:1,
  });
  assert.equal(result.status, "failed");
  assert.deepEqual(sources, [remote]);
  assert.equal(result.template.published.media.primary.url, remote);
});
