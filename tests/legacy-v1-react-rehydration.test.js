import test, { after } from "node:test";
import assert from "node:assert/strict";
import React, { useState } from "react";
import { act, create } from "react-test-renderer";
import { clearTemplateDataMemoryCacheForTests, writeTemplateDataCache } from "../src/templates-v2/offline-data-cache.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalConsoleError = console.error;
console.error = (...args) => {
  if (String(args[0]).includes("react-test-renderer is deprecated")) return;
  originalConsoleError(...args);
};
after(() => { console.error = originalConsoleError; });

let rehydration = {};
try { rehydration = await import("../src/legacy-template-offline-rehydration.js"); } catch { /* RED */ }

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const scope = { clientId:"client-1", screenId:"screen-1", templateId:"template-1", module:"legacy-live" };
const weather = { city:"Natal/RN", temperature:29, sensation:30, source:"Open-Meteo" };
const news = [{ title:"RSS persistido" }];
const cases = [
  ["clima", true, false],
  ["noticias", false, true],
  ["jornal_premium", true, true],
  ["clima_premium_v2", true, true],
  ["hora_certa_premium", true, true],
  ["tela_corporativa_personalizada", true, true],
  ["receitas_fitness_premium", false, true],
  ["tendencia_beleza_premium", false, true],
  ["fofocas_premium", false, true],
];

function contextFor(type) {
  return { ...scope, config:{ type, city:"Natal/RN", feed:"https://example.com/rss.xml", sports:null } };
}

function Harness({ context, storage, schedule, onRender }) {
  const [data, setData] = useState({});
  rehydration.useLegacyTemplateLiveContentRehydration({
    context,
    storage,
    schedule,
    onRestore:(restored) => setData((current) => rehydration.mergeRestoredLegacyLiveContent(current, restored)),
  });
  onRender?.(data);
  return React.createElement("output", null, JSON.stringify(data));
}

test("nove Templates V1 reidratam somente RSS e clima aplicáveis após identidade tardia", async () => {
  assert.equal(typeof rehydration.useLegacyTemplateLiveContentRehydration, "function");
  const storage = new MemoryStorage();
  for (const [type, hasWeather, hasNews] of cases) {
    const payload = { ...(hasWeather ? { weather } : {}), ...(hasNews ? { news } : {}) };
    writeTemplateDataCache(contextFor(type), payload, { storage, now:100 });
  }
  clearTemplateDataMemoryCacheForTests();

  for (const [type, hasWeather, hasNews] of cases) {
    let renders = 0;
    let root;
    await act(async () => { root = create(React.createElement(Harness, { context:null, storage, onRender:() => { renders += 1; } })); });
    await act(async () => {
      root.update(React.createElement(Harness, { context:contextFor(type), storage, onRender:() => { renders += 1; } }));
      await Promise.resolve();
    });
    const value = JSON.parse(root.toJSON().children[0]);
    assert.equal(Boolean(value.weather), hasWeather, `${type} weather`);
    assert.equal(Boolean(value.news?.length), hasNews, `${type} news`);
    assert.ok(renders <= 4, `${type} rendered ${renders} times`);
    await act(async () => { root.unmount(); });
  }
});

test("cold remount V1 preserva último válido e não atualiza depois do unmount", async () => {
  const storage = new MemoryStorage();
  const context = contextFor("hora_certa_premium");
  writeTemplateDataCache(context, { weather, news }, { storage, now:100 });
  clearTemplateDataMemoryCacheForTests();
  const scheduled = [];
  const rendered = [];
  let root;
  await act(async () => {
    root = create(React.createElement(Harness, { context, storage, schedule:(task) => scheduled.push(task), onRender:(value) => rendered.push(value) }));
  });
  assert.equal(scheduled.length, 1);
  await act(async () => { root.unmount(); });
  await act(async () => { scheduled[0](); });
  assert.equal(rendered.some((value) => value.weather?.temperature === 29), false);
});

test("falha RSS não apaga o último feed válido ao persistir clima nas nove V1", async () => {
  assert.equal(typeof rehydration.mergeLegacyLiveContentWithRss, "function");
  assert.equal(typeof rehydration.buildLegacyLiveContentForPersistence, "function");
  const fallback = [{ title:"Totem Park fallback" }];
  const isUsableNews = (items) => Array.isArray(items) && items.length > 0 && items[0]?.title !== "Totem Park fallback";

  for (const [type, hasWeather, hasNews] of cases) {
    if (!hasNews) continue;
    const previous = { ...(hasWeather ? { weather } : {}), news };
    const failedRefresh = { ...(hasWeather ? { weather:{ ...weather, temperature:30 } } : {}), news:fallback };
    const merged = rehydration.mergeLegacyLiveContentWithRss(previous, failedRefresh, { isUsableNews });
    const persisted = rehydration.buildLegacyLiveContentForPersistence(previous, failedRefresh, {
      isUsableNews,
      isUsableWeather:(value) => Number.isFinite(Number(value?.temperature)),
    });
    assert.deepEqual(merged.news, news, `${type} memória`);
    assert.deepEqual(persisted.news, news, `${type} persistência`);
  }
});

test("online offline cold boot V1 restaura RSS real e ignora resposta vazia", async () => {
  const storage = new MemoryStorage();
  const context = contextFor("hora_certa_premium");
  const isUsableNews = (items) => Array.isArray(items) && items.some((item) => item?.title === "RSS persistido");
  const online = rehydration.buildLegacyLiveContentForPersistence({}, { weather, news }, {
    isUsableNews,
    isUsableWeather:(value) => Number.isFinite(Number(value?.temperature)),
  });
  writeTemplateDataCache(context, online, { storage, now:100 });
  const afterFailure = rehydration.buildLegacyLiveContentForPersistence(online, { weather:{ ...weather, temperature:30 }, news:[] }, {
    isUsableNews,
    isUsableWeather:(value) => Number.isFinite(Number(value?.temperature)),
  });
  writeTemplateDataCache(context, afterFailure, { storage, now:200 });
  clearTemplateDataMemoryCacheForTests();

  let root;
  await act(async () => {
    root = create(React.createElement(Harness, { context, storage }));
    await Promise.resolve();
  });
  const value = JSON.parse(root.toJSON().children[0]);
  assert.equal(value.weather.temperature, 30);
  assert.deepEqual(value.news, news);
  await act(async () => { root.unmount(); });
});
