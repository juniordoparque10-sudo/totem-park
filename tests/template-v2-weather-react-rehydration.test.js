import test, { after } from "node:test";
import assert from "node:assert/strict";
import React, { useState } from "react";
import { act, create } from "react-test-renderer";
import { clearTemplateDataMemoryCacheForTests, createWeatherDataFingerprintConfig, writeTemplateDataCache } from "../src/templates-v2/offline-data-cache.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalConsoleError = console.error;
console.error = (...args) => {
  if (String(args[0]).includes("react-test-renderer is deprecated")) return;
  originalConsoleError(...args);
};
after(() => { console.error = originalConsoleError; });

let rehydration = {};
try { rehydration = await import("../src/templates-v2/weather-offline-rehydration.js"); } catch { /* RED */ }

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const scope = { clientId:"client-weather", screenId:"screen-weather", templateId:"template-weather" };

function Harness({ weatherConfig, storage, schedule, onRender }) {
  const [dynamicData, setDynamicData] = useState({ news:[{ title:"preservar" }] });
  onRender(dynamicData);
  rehydration.useTemplateV2WeatherRehydration({
    scope,
    weatherConfig,
    storage,
    schedule,
    onRestore:(restored) => setDynamicData((current) => ({ ...current, ...restored })),
  });
  return React.createElement("output", null, JSON.stringify(dynamicData));
}

test("Weather V2 reidrata cache após configuração real chegar depois do mount", async () => {
  assert.equal(typeof rehydration.useTemplateV2WeatherRehydration, "function");
  const storage = new MemoryStorage();
  const config = createWeatherDataFingerprintConfig({ enabled:true, city:"Natal/RN", forecastDays:5 });
  writeTemplateDataCache({ ...scope, module:"weather", config }, { city:"Natal/RN", temperature:28 }, { storage, now:100 });
  clearTemplateDataMemoryCacheForTests();
  let renders = 0;
  let root;
  await act(async () => { root = create(React.createElement(Harness, { weatherConfig:null, storage, onRender:() => { renders += 1; } })); });
  assert.doesNotMatch(root.toJSON().children[0], /temperature/);
  await act(async () => {
    root.update(React.createElement(Harness, { weatherConfig:config, storage, onRender:() => { renders += 1; } }));
    await Promise.resolve();
  });
  assert.match(root.toJSON().children[0], /"temperature":28/);
  assert.match(root.toJSON().children[0], /preservar/);
  assert.ok(renders <= 3, `rehydration rendered ${renders} times`);
  await act(async () => { root.unmount(); });
  clearTemplateDataMemoryCacheForTests();
});

test("Weather V2 cancela reidratação pendente após unmount", async () => {
  const storage = new MemoryStorage();
  const config = createWeatherDataFingerprintConfig({ enabled:true, city:"Natal/RN" });
  writeTemplateDataCache({ ...scope, module:"weather", config }, { temperature:28 }, { storage, now:100 });
  const scheduled = [];
  const rendered = [];
  let root;
  await act(async () => { root = create(React.createElement(Harness, { weatherConfig:null, storage, schedule:(task) => scheduled.push(task), onRender:(value) => rendered.push(value) })); });
  await act(async () => { root.update(React.createElement(Harness, { weatherConfig:config, storage, schedule:(task) => scheduled.push(task), onRender:(value) => rendered.push(value) })); });
  assert.equal(scheduled.length, 1);
  await act(async () => { root.unmount(); });
  await act(async () => { scheduled[0](); });
  assert.equal(rendered.some((value) => value.weather?.temperature === 28), false);
  clearTemplateDataMemoryCacheForTests();
});
