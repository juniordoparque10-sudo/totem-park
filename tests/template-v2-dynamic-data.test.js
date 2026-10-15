import test from "node:test";
import assert from "node:assert/strict";
import {
  getTemplateV2DynamicDataKey,
  getTemplateV2ForecastRequestDays,
  hasTemplateV2DynamicModules,
  normalizeTemplateV2ForecastDays,
  selectTemplateV2ForecastDays,
} from "../src/templates-v2/dynamic-data.js";
import { clearTemplateV2DynamicDataCache, loadTemplateV2DynamicData } from "../src/templates-v2/editor/template-v2-dynamic-loader.js";

test("weather cache key preserves city and five-day configuration", () => {
  const config = { modules:{ weather:{ enabled:true, city:"João Câmara/RN", forecastDays:5 }, news:{ enabled:false } } };
  assert.match(getTemplateV2DynamicDataKey(config), /João Câmara\/RN/);
  assert.match(getTemplateV2DynamicDataKey(config), /"days":5/);
  assert.equal(hasTemplateV2DynamicModules(config), true);
});

test("static templates do not start a dynamic-data request", () => {
  assert.equal(hasTemplateV2DynamicModules({ modules:{} }), false);
});

test("weather forecast count is normalized between three and five days", () => {
  assert.equal(normalizeTemplateV2ForecastDays(2), 3);
  assert.equal(normalizeTemplateV2ForecastDays(3), 3);
  assert.equal(normalizeTemplateV2ForecastDays(4), 4);
  assert.equal(normalizeTemplateV2ForecastDays(5), 5);
  assert.equal(normalizeTemplateV2ForecastDays(6), 5);
});

test("weather request includes today plus the configured future days", () => {
  assert.equal(getTemplateV2ForecastRequestDays(3), 4);
  assert.equal(getTemplateV2ForecastRequestDays(4), 5);
  assert.equal(getTemplateV2ForecastRequestDays(5), 6);
});

test("weather renderer keeps today separate and selects three, four or five future days", () => {
  const forecast = Array.from({ length:6 }, (_, index) => ({ date:`2026-10-${15 + index}` }));
  assert.deepEqual(selectTemplateV2ForecastDays(forecast, 3).map((day) => day.date), forecast.slice(1,4).map((day) => day.date));
  assert.deepEqual(selectTemplateV2ForecastDays(forecast, 4).map((day) => day.date), forecast.slice(1,5).map((day) => day.date));
  assert.deepEqual(selectTemplateV2ForecastDays(forecast, 5).map((day) => day.date), forecast.slice(1,6).map((day) => day.date));
});

test("weather loader propagates each configured count immediately", async () => {
  clearTemplateV2DynamicDataCache();
  const received = [];
  const loadWeather = async (_city, days) => {
    received.push(days);
    return { forecast:[] };
  };

  for (const forecastDays of [3,4,5]) {
    await loadTemplateV2DynamicData({ modules:{ weather:{ enabled:true, city:"João Câmara/RN", forecastDays }, news:{ enabled:false } } }, { loadWeather });
  }

  assert.deepEqual(received, [3,4,5]);
});
