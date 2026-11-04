import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { buildSportsDataCacheContext, buildTemplateDataCacheKey, clearTemplateDataMemoryCacheForTests, createNewsDataFingerprintConfig, createSportsDataFingerprintConfig, mergeSportsLastKnown, readNewsEditorialDynamicCache, readSportsTemplateDataCache, readTemplateDataCache, refreshTemplateDataIfNeeded, writeNewsEditorialDynamicCache, writeSportsTemplateDataCache, writeTemplateDataCache } from "../src/templates-v2/offline-data-cache.js";
import { TEMPLATE_ASSET_URL_ONLY_TTL_MS, clearTemplateAssetMemoryCacheForTests, collectTemplateAssetUrls, createOfflineSafeTemplate, fetchTemplateAssetResponse, prepareTemplateAssets, refreshTemplateAsset, refreshTemplateAssets, selectTemplateAssetRenderSource, shouldUsePersistentTemplateAssetCache } from "../src/templates-v2/offline-asset-cache.js";

test("cache RSS Editorial usa geração do parser para não ressuscitar texto corrompido antigo", () => {
  const config = createNewsDataFingerprintConfig({ newsFeedUrl:"https://example.com/feed.xml" });
  assert.equal(config.parserGeneration, 2);
});

test("invalidação RSS geração 2 é seletiva e não remove outros registros Local First", () => {
  const values=new Map();const storage={getItem:(key)=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  const scope={clientId:"client",screenId:"screen",templateId:"news"};
  writeTemplateDataCache({...scope,module:"news-editorial-editorial",config:{newsSource:"",newsFeedUrl:"https://example.com/feed.xml",selectedNewsSources:[]}},[{title:"Not�cia antiga"}],{storage});
  storage.setItem("totempark.media-cache.guard","video-cache-preserved");
  assert.equal(readNewsEditorialDynamicCache(scope,{editorial:{enabled:true,newsFeedUrl:"https://example.com/feed.xml"},feed:{enabled:false}},storage),null);
  assert.equal(storage.getItem("totempark.media-cache.guard"),"video-cache-preserved");
});
import { shouldRevealTemplateImmediately } from "../src/templates-v2/offline-readiness.js";
import { prepareTemplateV2CriticalImage } from "../src/templates-v2/player-preload.js";
import { getNextTemplateToPrepare } from "../src/templates-v2/offline-preload.js";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

class MemoryCache {
  values = new Map();
  async match(key) { return this.values.get(String(key))?.clone(); }
  async put(key, value) { this.values.set(String(key), value.clone()); }
}

const cacheStorage = (cache = new MemoryCache()) => ({ cache, open:async () => cache });
const nativeCapacitor = { isNativePlatform:() => true };
const webCapacitor = { isNativePlatform:() => false };
const base64 = (value) => Buffer.from(value).toString("base64");

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

test("cold boot restaura cards e ticker Editorial V2 do cache persistente", () => {
  const storage = new MemoryStorage();
  const scope = { clientId:"c1", screenId:"s1", templateId:"news-1" };
  const dynamicNews = {
    editorial:{ enabled:true, newsFeedUrl:"https://news.example/editorial.xml" },
    feed:{ enabled:true, news:{ enabled:true, newsFeedUrl:"https://news.example/ticker.xml" } },
  };
  const payload = {
    editorialNews:[{ title:"Manchete real", image:"https://cdn.example/hero.jpg" }],
    feedNews:[{ title:"Ticker real" }],
  };
  writeNewsEditorialDynamicCache(scope, dynamicNews, payload, { storage, now:123 });
  clearTemplateDataMemoryCacheForTests();
  assert.deepEqual(readNewsEditorialDynamicCache(scope, dynamicNews, storage), payload);
});

test("cache Editorial V2 não mistura mudança de fonte nem grava respostas vazias", () => {
  const storage = new MemoryStorage();
  const scope = { clientId:"c1", screenId:"s1", templateId:"news-1" };
  const first = { editorial:{ enabled:true, newsFeedUrl:"https://news.example/a.xml" }, feed:{ enabled:false } };
  const changed = { editorial:{ enabled:true, newsFeedUrl:"https://news.example/b.xml" }, feed:{ enabled:false } };
  writeNewsEditorialDynamicCache(scope, first, { editorialNews:[{ title:"Fonte A" }] }, { storage });
  writeNewsEditorialDynamicCache(scope, first, { editorialNews:[] }, { storage });
  clearTemplateDataMemoryCacheForTests();
  assert.deepEqual(readNewsEditorialDynamicCache(scope, first, storage)?.editorialNews, [{ title:"Fonte A" }]);
  assert.equal(readNewsEditorialDynamicCache(scope, changed, storage), null);
});

test("reconexão da Hora Certa V2 ignora a janela de retry e recupera o RSS imediatamente", async () => {
  const storage = new MemoryStorage();
  const context = { clientId:"c1", screenId:"s1", templateId:"clock-1", module:"news", config:createNewsDataFingerprintConfig({ newsFeedUrl:"feed.xml" }) };
  const ttlMs = 10 * 60 * 1000;
  const first = await refreshTemplateDataIfNeeded(context, {
    ttlMs,
    now:1_000,
    storage,
    fetcher:async () => [{ title:"Antes da queda" }],
    isUsable:(items) => items.length > 0,
  });
  assert.equal(first.payload[0].title, "Antes da queda");

  const failed = await refreshTemplateDataIfNeeded(context, {
    ttlMs,
    now:1_000 + ttlMs + 1,
    storage,
    fetcher:async () => { throw new Error("offline"); },
    isUsable:(items) => items.length > 0,
  });
  assert.equal(failed.payload[0].title, "Antes da queda");

  let reconnectCalls = 0;
  const recovered = await refreshTemplateDataIfNeeded(context, {
    ttlMs,
    now:1_000 + ttlMs + 2,
    storage,
    force:true,
    fetcher:async () => { reconnectCalls += 1; return [{ title:"Após reconectar" }]; },
    isUsable:(items) => items.length > 0,
  });
  assert.equal(reconnectCalls, 1);
  assert.equal(recovered.payload[0].title, "Após reconectar");
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

test("rotação Android reutiliza asset com identidade forte sem download redundante", async () => {
  clearTemplateAssetMemoryCacheForTests();
  const remote = "https://cdn.example/rotation-background.jpg";
  const storage = cacheStorage();
  await storage.cache.put(remote, new Response(new Blob(["cached-background"]), {
    status:200,
    headers:{
      "Content-Type":"image/jpeg",
      "x-totempark-asset-identity":"hash:background-v1",
      "x-totempark-asset-validated-at":"1000",
    },
  }));
  const template = { published:{ media:{ primary:{ type:"image", url:remote, fileHash:"background-v1" } } } };
  let nativeDownloads = 0;
  const options = {
    cachePolicyEnabled:true,
    cacheStorage:storage,
    capacitor:nativeCapacitor,
    capacitorHttp:{ get:async () => { nativeDownloads += 1; throw new Error("download redundante"); } },
    createObjectURL:() => "blob:cached-background",
    now:10_000,
  };

  const prepared = await prepareTemplateAssets(template, options);
  const refreshed = await refreshTemplateAssets(template, options);

  assert.equal(prepared.hits, 1);
  assert.deepEqual(refreshed.map(({ status }) => status), ["fresh"]);
  assert.equal(nativeDownloads, 0);
});

test("asset identificado somente pela URL respeita TTL e atualiza uma vez após expirar", async () => {
  clearTemplateAssetMemoryCacheForTests();
  const remote = "https://cdn.example/url-only.png";
  const storage = cacheStorage();
  await storage.cache.put(remote, new Response(new Blob(["cached-url-only"]), {
    status:200,
    headers:{
      "Content-Type":"image/png",
      "x-totempark-asset-identity":`url:${remote}`,
      "x-totempark-asset-validated-at":"1000",
    },
  }));
  let nativeDownloads = 0;
  const options = {
    cachePolicyEnabled:true,
    cacheStorage:storage,
    capacitor:nativeCapacitor,
    capacitorHttp:{ get:async () => {
      nativeDownloads += 1;
      return { status:200, data:base64("updated-url-only"), headers:{ "Content-Type":"image/png" } };
    } },
  };

  assert.equal((await refreshTemplateAsset(remote, { ...options, now:1_000 + TEMPLATE_ASSET_URL_ONLY_TTL_MS - 1 })).status, "fresh");
  assert.equal(nativeDownloads, 0);
  assert.equal((await refreshTemplateAsset(remote, { ...options, now:1_000 + TEMPLATE_ASSET_URL_ONLY_TTL_MS })).status, "updated");
  assert.equal(nativeDownloads, 1);
});

test("reinicialização offline restaura asset persistido e falha remota não apaga last-known", async () => {
  clearTemplateAssetMemoryCacheForTests();
  const remote = "https://cdn.example/offline-restart.jpg";
  const storage = cacheStorage();
  await storage.cache.put(remote, new Response(new Blob(["last-known-image"]), { status:200, headers:{ "Content-Type":"image/jpeg" } }));
  const template = { published:{ media:{ primary:{ type:"image", url:remote } } } };

  const restored = await prepareTemplateAssets(template, { cacheStorage:storage, createObjectURL:() => "blob:last-known" });
  const failedRefresh = await refreshTemplateAssets(template, {
    cachePolicyEnabled:true,
    cacheStorage:storage,
    capacitor:nativeCapacitor,
    capacitorHttp:{ get:async () => { throw new Error("offline"); } },
    now:TEMPLATE_ASSET_URL_ONLY_TTL_MS + 1,
  });
  clearTemplateAssetMemoryCacheForTests();
  const restarted = await prepareTemplateAssets(template, { cacheStorage:storage, createObjectURL:() => "blob:after-restart" });

  assert.equal(restored.hits, 1);
  assert.deepEqual(failedRefresh.map(({ status }) => status), ["preserved"]);
  assert.equal(restarted.hits, 1);
  assert.equal(await (await storage.cache.match(remote)).text(), "last-known-image");
});

test("template sem asset local nasce com fallback e não mantém URL remota", () => {
  const remote = "https://cdn.example/missing.jpg";
  const template = { schemaVersion:2, playerItemType:"template", published:{ media:{ primary:{ type:"image", url:remote } } } };
  assert.equal(createOfflineSafeTemplate(template).published.media.primary.url, "");
  assert.equal(shouldRevealTemplateImmediately(template, { native:true }), true);
  assert.equal(shouldRevealTemplateImmediately(template, { native:false }), false);
});

test("Player Web aguarda decode do background crítico antes de revelar", async () => {
  let decodeResolved = false;
  class DecodedImage {
    set src(value) {
      this.currentSrc = value;
      queueMicrotask(() => this.onload?.());
    }
    async decode() { decodeResolved = true; }
  }
  const template = { playerItemType:"template", published:{ media:{ primary:{ type:"image", url:"https://cdn.example/critical-ready.jpg" } } } };
  const result = await prepareTemplateV2CriticalImage(template, DecodedImage, { maxAttempts:1, timeoutMs:100 });
  assert.equal(result.status, "ready");
  assert.equal(decodeResolved, true);
});

test("background crítico lento usa timeout limitado sem fetch", async () => {
  class HangingImage { set src(value) { this.currentSrc = value; } }
  const template = { playerItemType:"template", published:{ media:{ primary:{ type:"image", url:"https://cdn.example/critical-timeout.jpg" } } } };
  const startedAt = Date.now();
  const result = await prepareTemplateV2CriticalImage(template, HangingImage, { maxAttempts:1, timeoutMs:15 });
  assert.equal(result.status, "failed");
  assert.match(result.error.message, /tempo limite/i);
  assert.ok(Date.now() - startedAt < 250);
});

test("Player Web preserva a URL remota quando o cache visual ainda não existe", async () => {
  const remote = "https://cdn.example/market-logo.png";
  const template = { published:{ content:{ logo:{ type:"image", mediaId:"logo-1", url:remote } } } };
  const result = await prepareTemplateAssets(template, {
    cacheStorage:{ open:async () => ({ match:async () => null }) },
    preserveRemoteOnMiss:true,
  });
  assert.equal(result.hits, 0);
  assert.equal(result.template.published.content.logo.url, remote);
});

test("Player Web renderiza a mesma URL remota validada pelo preloader sem trocar para blob tardio", () => {
  const source = { published:{ media:{ primary:{ type:"image", url:"https://cdn.example/news-background.jpg" } } } };
  const prepared = { published:{ media:{ primary:{ type:"image", url:"blob:late-cache-copy" } } } };
  assert.equal(shouldUsePersistentTemplateAssetCache(webCapacitor), false);
  assert.equal(selectTemplateAssetRenderSource(source, prepared, webCapacitor), source);
});

test("Android mantém o template preparado pelo cache Local First", () => {
  const source = { published:{ media:{ primary:{ type:"image", url:"https://cdn.example/clock-background.jpg" } } } };
  const prepared = { published:{ media:{ primary:{ type:"image", url:"file:///local-first/clock-background.jpg" } } } };
  assert.equal(shouldUsePersistentTemplateAssetCache(nativeCapacitor), true);
  assert.equal(selectTemplateAssetRenderSource(source, prepared, nativeCapacitor), prepared);
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

test("Android nativo usa CapacitorHttp, converte Base64 e não chama fetch Web", async () => {
  clearTemplateAssetMemoryCacheForTests();
  const remote = "https://firebasestorage.example/background.png?token=secret";
  const storage = cacheStorage();
  let nativeCalls = 0;
  let webCalls = 0;
  const logs = [];
  const result = await refreshTemplateAsset(remote, {
    cacheStorage:storage,
    capacitor:nativeCapacitor,
    capacitorHttp:{ get:async (options) => {
      nativeCalls += 1;
      assert.deepEqual(options, { url:remote, responseType:"blob" });
      return { status:200, data:base64("native-image"), headers:{ "Content-Type":"image/png; charset=binary" } };
    } },
    fetchImpl:async () => { webCalls += 1; throw new Error("fetch Web não deveria ser chamado"); },
    logImpl:(event, details) => logs.push({ event, details }),
  });
  const cached = await storage.cache.match(remote);
  assert.equal(result.status, "stored");
  assert.equal(nativeCalls, 1);
  assert.equal(webCalls, 0);
  assert.equal(await cached.text(), "native-image");
  assert.equal(cached.headers.get("content-type"), "image/png");
  assert.deepEqual(logs.map(({ event }) => event), ["TEMPLATE_NATIVE_FETCH_STARTED", "TEMPLATE_NATIVE_FETCH_COMPLETED"]);
  assert.equal(logs[1].details.bytes, 12);
  assert.equal(logs[1].details.contentType, "image/png");
  assert.match(logs[1].details.url, /\?masked$/);
  assert.doesNotMatch(logs[1].details.url, /secret/);
});

test("Web mantém fetch no-store e não chama CapacitorHttp", async () => {
  let webCalls = 0;
  let nativeCalls = 0;
  const response = await fetchTemplateAssetResponse("https://cdn.example/logo.png", {
    capacitor:webCapacitor,
    capacitorHttp:{ get:async () => { nativeCalls += 1; } },
    fetchImpl:async (url, options) => {
      webCalls += 1;
      assert.equal(url, "https://cdn.example/logo.png");
      assert.deepEqual(options, { cache:"no-store" });
      return new Response("web-image", { status:200, headers:{ "Content-Type":"image/png" } });
    },
  });
  assert.equal(await response.text(), "web-image");
  assert.equal(webCalls, 1);
  assert.equal(nativeCalls, 0);
});

test("resposta nativa vazia é rejeitada e não substitui cache anterior", async () => {
  clearTemplateAssetMemoryCacheForTests();
  const remote = "https://cdn.example/stable.png";
  const storage = cacheStorage();
  await storage.cache.put(remote, new Response("old-image", { status:200, headers:{ "Content-Type":"image/png" } }));
  const result = await refreshTemplateAsset(remote, {
    cacheStorage:storage,
    capacitor:nativeCapacitor,
    capacitorHttp:{ get:async () => ({ status:200, data:"", headers:{ "Content-Type":"image/png" } }) },
    logImpl:() => {},
  });
  assert.equal(result.status, "preserved");
  assert.equal(await (await storage.cache.match(remote)).text(), "old-image");
});

test("falha do CapacitorHttp preserva asset anterior", async () => {
  clearTemplateAssetMemoryCacheForTests();
  const remote = "https://cdn.example/native-failure.jpg";
  const storage = cacheStorage();
  await storage.cache.put(remote, new Response("old-native-image", { status:200, headers:{ "Content-Type":"image/jpeg" } }));
  const result = await refreshTemplateAsset(remote, {
    cacheStorage:storage,
    capacitor:nativeCapacitor,
    capacitorHttp:{ get:async () => { throw new Error("native offline"); } },
    logImpl:() => {},
  });
  assert.equal(result.status, "preserved");
  assert.equal(await (await storage.cache.match(remote)).text(), "old-native-image");
});

test("resposta textual de erro não entra no cache de imagem", async () => {
  clearTemplateAssetMemoryCacheForTests();
  const remote = "https://cdn.example/error.png";
  const storage = cacheStorage();
  const result = await refreshTemplateAsset(remote, {
    cacheStorage:storage,
    capacitor:nativeCapacitor,
    capacitorHttp:{ get:async () => ({ status:200, data:base64("<html>Access denied</html>"), headers:{ "content-type":"text/html" } }) },
    logImpl:() => {},
  });
  assert.equal(result.status, "failed");
  assert.equal(await storage.cache.match(remote), undefined);
});

test("refresh nativo concorrente gera um único download", async () => {
  clearTemplateAssetMemoryCacheForTests();
  const remote = "https://cdn.example/deduplicated.webp";
  const storage = cacheStorage();
  let nativeCalls = 0;
  const options = {
    cacheStorage:storage,
    capacitor:nativeCapacitor,
    capacitorHttp:{ get:async () => {
      nativeCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { status:200, data:base64("webp-image"), headers:{ "Content-Type":"image/webp" } };
    } },
    logImpl:() => {},
  };
  const [first, second] = await Promise.all([
    refreshTemplateAsset(remote, options),
    refreshTemplateAsset(remote, options),
  ]);
  assert.equal(nativeCalls, 1);
  assert.equal(first.status, "stored");
  assert.equal(second.status, "stored");
});

test("módulo de assets permanece isolado dos módulos V40", () => {
  const source = readFileSync(new URL("../src/templates-v2/offline-asset-cache.js", import.meta.url), "utf8");
  [
    "offline-player-cache",
    "media-download-readiness",
    "native-cache-transaction",
    "native-cache-journal",
    "android-media-source",
  ].forEach((moduleName) => assert.doesNotMatch(source, new RegExp(`from [\\"'].*${moduleName}`)));
  assert.doesNotMatch(source, /@capacitor\/file-transfer/);
});

const sportsScope = { clientId:"client-1", screenId:"screen-1", templateId:"template-sports" };
const sportsConfig = {
  provider:"thesportsdb",
  mode:"rotation",
  selectedSport:"football",
  selectedSports:["football","basketball","motorsport"],
  transition:"fade",
  items:{
    football:{ competitionId:"brasileirao_a", duration:5, modules:{ results:true, upcoming:true, standings:true } },
    basketball:{ competitionId:"daily", duration:5, modules:{ events:true } },
    motorsport:{ competitionId:"daily", duration:5, modules:{ events:true } },
  },
};
const sportsPayload = {
  sports:{
    football:{ data:{ results:[{ id:"football-result" }], upcoming:[], standings:[], events:[] } },
    basketball:{ data:{ results:[], upcoming:[], standings:[], events:[{ id:"basketball-event" }] } },
    motorsport:{ data:{ results:[], upcoming:[], standings:[], events:[{ id:"motorsport-event" }] } },
  },
  sportsErrors:[],
};

test("Sports online salvo é restaurado offline", () => {
  const storage = new MemoryStorage();
  writeSportsTemplateDataCache(sportsScope, sportsConfig, sportsPayload, { storage, now:101 });
  assert.deepEqual(readSportsTemplateDataCache(sportsScope, sportsConfig, storage)?.payload, sportsPayload);
});

test("cache Sports sobrevive a nova instância lógica", () => {
  const storage = new MemoryStorage();
  writeSportsTemplateDataCache(sportsScope, sportsConfig, sportsPayload, { storage, now:102 });
  clearTemplateDataMemoryCacheForTests();
  assert.equal(readSportsTemplateDataCache(sportsScope, sportsConfig, storage)?.timestamp, 102);
});

test("segunda leitura após hidratação encontra a configuração correta", () => {
  const storage = new MemoryStorage();
  const embedded = { ...sportsConfig, selectedSports:["football"], items:{ ...sportsConfig.items, football:{ ...sportsConfig.items.football, competitionId:"embedded-old" } } };
  writeSportsTemplateDataCache(sportsScope, sportsConfig, sportsPayload, { storage });
  clearTemplateDataMemoryCacheForTests();
  assert.equal(readSportsTemplateDataCache(sportsScope, embedded, storage), null);
  assert.deepEqual(readSportsTemplateDataCache(sportsScope, sportsConfig, storage)?.payload, sportsPayload);
});

test("propriedades visuais não alteram fingerprint Sports", () => {
  const visualChange = {
    ...sportsConfig,
    mode:"split",
    transition:"slide",
    visualPreset:"neon",
    background:"blob:https://localhost/background",
    color:"#fff",
    items:{ ...sportsConfig.items, football:{ ...sportsConfig.items.football, duration:99, homeLogo:{ url:"blob:https://localhost/logo" }, modules:{ ...sportsConfig.items.football.modules, internalRotation:true } } },
  };
  assert.deepEqual(createSportsDataFingerprintConfig(visualChange), createSportsDataFingerprintConfig(sportsConfig));
});

test("competitionId altera fingerprint Sports", () => {
  const changed = { ...sportsConfig, items:{ ...sportsConfig.items, football:{ ...sportsConfig.items.football, competitionId:"brasileirao_d" } } };
  assert.notEqual(buildTemplateDataCacheKey(buildSportsDataCacheContext(sportsScope, changed)), buildTemplateDataCacheKey(buildSportsDataCacheContext(sportsScope, sportsConfig)));
});

test("esporte selecionado altera fingerprint Sports", () => {
  const changed = { ...sportsConfig, selectedSport:"football", selectedSports:["football"] };
  assert.notEqual(buildTemplateDataCacheKey(buildSportsDataCacheContext(sportsScope, changed)), buildTemplateDataCacheKey(buildSportsDataCacheContext(sportsScope, sportsConfig)));
});

test("módulo de dados altera fingerprint Sports", () => {
  const changed = { ...sportsConfig, items:{ ...sportsConfig.items, football:{ ...sportsConfig.items.football, modules:{ ...sportsConfig.items.football.modules, standings:false } } } };
  assert.notEqual(buildTemplateDataCacheKey(buildSportsDataCacheContext(sportsScope, changed)), buildTemplateDataCacheKey(buildSportsDataCacheContext(sportsScope, sportsConfig)));
});

test("READ e WRITE Sports compartilham escopo, módulo e fingerprint", () => {
  const storage = new MemoryStorage();
  const context = buildSportsDataCacheContext(sportsScope, sportsConfig);
  writeSportsTemplateDataCache(sportsScope, sportsConfig, sportsPayload, { storage });
  assert.equal(context.module, "sports");
  assert.ok(storage.getItem(buildTemplateDataCacheKey(context)));
  assert.deepEqual(readSportsTemplateDataCache(sportsScope, sportsConfig, storage)?.payload, sportsPayload);
});

test("restauração offline Sports não depende de provider remoto", () => {
  const storage = new MemoryStorage();
  let providerCalls = 0;
  writeSportsTemplateDataCache(sportsScope, sportsConfig, sportsPayload, { storage });
  clearTemplateDataMemoryCacheForTests();
  const restored = readSportsTemplateDataCache(sportsScope, sportsConfig, storage);
  assert.equal(providerCalls, 0);
  assert.deepEqual(restored.payload, sportsPayload);
});

test("falha remota não apaga last-known Sports", () => {
  const previous = { weather:{ temperature:28 }, ...sportsPayload };
  assert.equal(mergeSportsLastKnown(previous, null), previous);
});

test("payload remoto vazio não apaga last-known Sports", () => {
  const previous = { ...sportsPayload };
  assert.equal(mergeSportsLastKnown(previous, { sports:{}, sportsErrors:["football"] }), previous);
});

test("payload Sports preserva football, basketball e motorsport", () => {
  const merged = mergeSportsLastKnown({}, sportsPayload);
  assert.deepEqual(Object.keys(merged.sports).sort(), ["basketball","football","motorsport"]);
  assert.deepEqual(merged.sportsErrors, []);
});

test("Weather permanece isolado do cache Sports", () => {
  const storage = new MemoryStorage();
  writeSportsTemplateDataCache(sportsScope, sportsConfig, sportsPayload, { storage });
  assert.equal(readTemplateDataCache({ ...sportsScope, module:"weather", config:createSportsDataFingerprintConfig(sportsConfig) }, storage), null);
});

test("News permanece isolado do cache Sports", () => {
  const storage = new MemoryStorage();
  writeSportsTemplateDataCache(sportsScope, sportsConfig, sportsPayload, { storage });
  assert.equal(readTemplateDataCache({ ...sportsScope, module:"news", config:createSportsDataFingerprintConfig(sportsConfig) }, storage), null);
});

test("cache legado Sports é entregue, migrado e reutilizado pela chave canônica", () => {
  const storage = new MemoryStorage();
  const legacyContext = { ...sportsScope, module:"sports", config:sportsConfig };
  const canonicalContext = buildSportsDataCacheContext(sportsScope, sportsConfig);
  writeTemplateDataCache(legacyContext, sportsPayload, { storage, now:777, source:"sports-v2" });
  clearTemplateDataMemoryCacheForTests();
  const migrated = readSportsTemplateDataCache(sportsScope, sportsConfig, storage);
  assert.deepEqual(migrated.payload, sportsPayload);
  assert.ok(storage.getItem(buildTemplateDataCacheKey(canonicalContext)));
  clearTemplateDataMemoryCacheForTests();
  const visualChange = { ...sportsConfig, transition:"zoom", backgroundUrl:"blob:https://localhost/new" };
  assert.deepEqual(readSportsTemplateDataCache(sportsScope, visualChange, storage)?.payload, sportsPayload);
});
