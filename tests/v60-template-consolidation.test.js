import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { normalizeNewsEditorialDynamicConfig } from "../src/templates-v2/news-editorial-dynamic/config.js";
import { getMarketPreloadImageUrls, normalizeMarketPremiumConfig } from "../src/templates-v2/market-premium/config.js";
import { selectRealNewsState } from "../src/template-news-state.js";

test("Notícias V2 normaliza o intervalo único entre 5 e 60 segundos", () => {
  assert.equal(normalizeNewsEditorialDynamicConfig({}).rotation.intervalSeconds, 12);
  assert.equal(normalizeNewsEditorialDynamicConfig({ rotation:{ intervalSeconds:2 } }).rotation.intervalSeconds, 5);
  assert.equal(normalizeNewsEditorialDynamicConfig({ rotation:{ intervalSeconds:90 } }).rotation.intervalSeconds, 60);
  assert.equal(normalizeNewsEditorialDynamicConfig({ rotation:{ featuredSeconds:18, secondarySeconds:9 } }).rotation.intervalSeconds, 18);
});

test("Mercado Premium normaliza intervalo individual com padrão retrocompatível", () => {
  assert.equal(normalizeMarketPremiumConfig({}).rotation.intervalSeconds, 10);
  assert.equal(normalizeMarketPremiumConfig({ rotation:{ intervalSeconds:1 } }).rotation.intervalSeconds, 5);
  assert.equal(normalizeMarketPremiumConfig({ rotation:{ intervalSeconds:100 } }).rotation.intervalSeconds, 60);
});

test("Mercado Premium prepara somente imagens do frame inicial e do próximo frame", () => {
  const market = {
    catalog:Array.from({ length:12 }, (_, index) => ({ id:`p${index}`, name:`Produto ${index}`, active:true, image:{ url:`https://cdn/${index}.jpg` } })),
    rotation:{ intervalSeconds:10 },
  };
  const urls = getMarketPreloadImageUrls(market, { secondarySlots:6, frameCount:2 });
  assert.ok(urls.length > 0);
  assert.ok(urls.length < 12);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every((url) => url.startsWith("https://cdn/")));
});

test("Hora Certa preserva cache real e nunca injeta notícias institucionais", () => {
  const cached = [{ title:"Notícia real armazenada", source:"G1" }];
  assert.deepEqual(selectRealNewsState({ cached }), cached);
  assert.deepEqual(selectRealNewsState({ cached, fetched:[] }), cached);
  assert.deepEqual(selectRealNewsState({ cached:[], fetched:[] }), []);
  assert.deepEqual(selectRealNewsState({ cached, fetched:[{ title:"Nova notícia", source:"CNN" }] }), [{ title:"Nova notícia", source:"CNN" }]);
});

test("editores V2 expõem os dois intervalos sem alterar a duração da playlist", () => {
  const editor = fs.readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");
  const intervalField = fs.readFileSync(new URL("../src/templates-v2/editor/RotatingCardIntervalField.jsx", import.meta.url), "utf8");
  assert.match(editor, /Trocar notícia a cada/);
  assert.match(editor, /Trocar oferta a cada/);
  assert.match(intervalField, /min="5" max="60"/);
  assert.match(intervalField, /não altera a duração total da template na playlist/);
});

test("Hora Certa não volta a usar mensagens promocionais como fallback RSS", () => {
  const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /setNews\(DEFAULT_NEWS_ITEMS\)/);
  assert.match(app, /Notícias indisponíveis no momento/);
});

test("animações V59 aprovadas permanecem presentes na consolidação V60", () => {
  const splash = fs.readFileSync(new URL("../src/player/player-startup-splash.css", import.meta.url), "utf8");
  const maintenance = fs.readFileSync(new URL("../src/player/maintenance-screen.css", import.meta.url), "utf8");
  assert.match(splash, /player-startup-progress-fill/);
  assert.match(maintenance, /maintenance-ring-rotation/);
  assert.match(maintenance, /maintenance-progress-fill/);
  assert.doesNotMatch(maintenance, /@keyframes maintenance-gear/);
});
