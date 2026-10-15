import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  createTemplateV2Document,
  getPublishedTemplateV2View,
  getTemplateV2DraftConfig,
  WEATHER_PREMIUM_TYPE,
} from "../src/templates-v2/schema.js";
import {
  getTemplateV2Orientation,
  groupTemplatesByOrientation,
} from "../src/templates-v2/orientation.js";
import {
  clearTemplateV2DynamicDataCache,
  loadTemplateV2DynamicData,
} from "../src/templates-v2/editor/template-v2-dynamic-loader.js";
import { getConfiguredTemplateWeatherCity } from "../src/templates-v2/weather-city.js";

test("persiste e reabre uma Template V2 em Retrato", () => {
  const document = createTemplateV2Document({
    name: "Clima Retrato",
    type: WEATHER_PREMIUM_TYPE,
    draft: { display: { defaultOrientation: "Retrato" } },
  });

  assert.equal(document.orientation, "Retrato");
  assert.equal(document.aspectRatio, "9:16");
  assert.equal(getTemplateV2DraftConfig(document).display.defaultOrientation, "Retrato");
});

test("preserva orientação publicada de documento antigo sem orientação no topo", () => {
  const document = createTemplateV2Document({ name: "Retrato legado", type: WEATHER_PREMIUM_TYPE });
  delete document.orientation;
  delete document.aspectRatio;
  document.published = {
    ...document.draft,
    display: { ...document.draft.display, defaultOrientation: "Retrato" },
  };

  assert.equal(getTemplateV2Orientation(document), "Retrato");
  assert.equal(getPublishedTemplateV2View(document).orientation, "Retrato");
});

test("organiza a biblioteca sem duplicar templates", () => {
  const portrait = createTemplateV2Document({ name: "Retrato", draft: { display: { defaultOrientation: "Retrato" } } });
  const landscape = createTemplateV2Document({ name: "Paisagem" });
  const groups = groupTemplatesByOrientation([{ id: "p", ...portrait }, { id: "l", ...landscape }]);

  assert.deepEqual(groups.portrait.map((item) => item.id), ["p"]);
  assert.deepEqual(groups.landscape.map((item) => item.id), ["l"]);
});

test("preview carrega dados meteorológicos reais para a cidade configurada", async () => {
  clearTemplateV2DynamicDataCache();
  const requested = [];
  const config = createTemplateV2Document({
    type: WEATHER_PREMIUM_TYPE,
    draft: { modules: { weather: { enabled: true, city: "Fortaleza/CE" } } },
  }).draft;

  const data = await loadTemplateV2DynamicData(config, {
    loadWeather: async (city) => {
      requested.push(city);
      return { city, temperature: 29, unavailable: false };
    },
  });

  assert.deepEqual(requested, ["Fortaleza/CE"]);
  assert.equal(data.weather.city, "Fortaleza/CE");
  assert.equal(data.weather.temperature, 29);
});

test("falha meteorológica não fica presa no cache do preview", async () => {
  clearTemplateV2DynamicDataCache();
  const config = createTemplateV2Document({
    type: WEATHER_PREMIUM_TYPE,
    draft: { modules: { weather: { enabled: true, city: "Natal/RN" } } },
  }).draft;
  let attempts = 0;
  const loadWeather = async () => {
    attempts += 1;
    return attempts === 1
      ? { city: "Natal/RN", unavailable: true }
      : { city: "Natal/RN", temperature: 30, unavailable: false };
  };

  const first = await loadTemplateV2DynamicData(config, { loadWeather });
  const second = await loadTemplateV2DynamicData(config, { loadWeather });

  assert.equal(first.weather.unavailable, true);
  assert.equal(second.weather.temperature, 30);
  assert.equal(attempts, 2);
});

test("placeholder não é tratado como cidade configurada", async () => {
  clearTemplateV2DynamicDataCache();
  let calls = 0;
  const config = createTemplateV2Document({ type: WEATHER_PREMIUM_TYPE }).draft;
  const data = await loadTemplateV2DynamicData(config, {
    loadWeather: async () => { calls += 1; return {}; },
  });

  assert.equal(getConfiguredTemplateWeatherCity("Sua cidade"), "");
  assert.equal(calls, 0);
  assert.equal(data.weatherError, "missing-city");
});

test("editor usa a orientação publicada como única fonte do preview", () => {
  const source = readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");
  assert.match(source, /const orientation = normalizeTemplateV2Orientation\(draftState\.editorDraft\.display\?\.defaultOrientation\)/);
  assert.match(source, /onOrientationChange=\{updateOrientation\}/);
  assert.doesNotMatch(source, /useState\("Paisagem"\)/);
});

test("biblioteca separa Paisagem e Retrato e playlist resolve orientação V2 publicada", () => {
  const editor = readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(editor, /Paisagem — 16:9/);
  assert.match(editor, /Retrato — 9:16/);
  assert.match(app, /if \(isTemplateV2\(item\)\) return getTemplateV2Orientation\(item\)/);
});

test("editor e biblioteca distinguem cidade ausente de falha real da API", () => {
  const editor = readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");
  const renderer = readFileSync(new URL("../src/templates-v2/TemplateV2Renderer.jsx", import.meta.url), "utf8");
  assert.match(editor, /Selecione uma cidade para carregar a previsão no preview\./);
  assert.match(renderer, /dynamicData\?\.weatherError === "missing-city"/);
  assert.match(renderer, /Selecione uma cidade no editor/);
  assert.match(renderer, /selectTemplateV2ForecastDays\(weather\?\.forecast, weatherConfig\.forecastDays\)/);
});
