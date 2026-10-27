import assert from "node:assert/strict";
import test from "node:test";

import * as weatherPresentation from "../src/weather-presentation.js";
import {
  clearTemplateDataMemoryCacheForTests,
  readTemplateDataCache,
  refreshTemplateDataIfNeeded,
  writeTemplateDataCache,
} from "../src/templates-v2/offline-data-cache.js";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

const valid = (city, temperature) => ({ city, temperature, sensation:temperature + 1, source:"Open-Meteo" });
const unavailable = (city) => ({ city, temperature:"--", sensation:"--", source:"Aguardando atualização" });

test("Hora Certa V1 preserva a última temperatura válida no ciclo online offline online", () => {
  assert.equal(typeof weatherPresentation.mergeLegacyLiveContent, "function");
  const online = weatherPresentation.mergeLegacyLiveContent({}, { weather:valid("Natal/RN", 29) });
  const offline = weatherPresentation.mergeLegacyLiveContent(online, { weather:unavailable("Natal/RN") });
  const reconnected = weatherPresentation.mergeLegacyLiveContent(offline, { weather:valid("Natal/RN", 30) });
  assert.equal(offline.weather.temperature, 29);
  assert.equal(reconnected.weather.temperature, 30);
});

test("Clima V1 preserva temperatura em falha conectada e não inventa valor sem histórico", () => {
  const previous = { weather:valid("Recife/PE", 28) };
  assert.deepEqual(weatherPresentation.mergeLegacyLiveContent(previous, { weather:unavailable("Recife/PE") }).weather, previous.weather);
  assert.equal(weatherPresentation.mergeLegacyLiveContent({}, { weather:unavailable("Recife/PE") }).weather, undefined);
});

test("reinício offline restaura somente a temperatura da mesma cidade", async () => {
  const storage = new MemoryStorage();
  const natal = { clientId:"c1",screenId:"s1",templateId:"clock",module:"legacy-live",config:{type:"hora_certa_premium",city:"Natal/RN"} };
  const recife = { ...natal,config:{...natal.config,city:"Recife/PE"} };
  writeTemplateDataCache(natal, { weather:valid("Natal/RN", 29) }, { storage, now:100 });
  clearTemplateDataMemoryCacheForTests();
  assert.equal(readTemplateDataCache(natal, storage).payload.weather.temperature, 29);
  assert.equal(readTemplateDataCache(recife, storage), null);

  let fetches = 0;
  const offline = await refreshTemplateDataIfNeeded(natal, { storage, online:false, ttlMs:1, now:200, fetcher:async () => { fetches += 1; return valid("Natal/RN", 31); } });
  assert.equal(offline.payload.weather.temperature, 29);
  assert.equal(fetches, 0);
});
