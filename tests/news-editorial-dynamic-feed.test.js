import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { clearTemplateV2DynamicDataCache, loadTemplateV2DynamicData } from "../src/templates-v2/editor/template-v2-dynamic-loader.js";
import { createTemplateV2Draft, NEWS_EDITORIAL_DYNAMIC_TYPE } from "../src/templates-v2/schema.js";

let newsConfig = {};
try { newsConfig = await import("../src/templates-v2/news-editorial-dynamic/config.js"); } catch { /* RED: módulo ainda não implementado */ }

test("normalização mantém RSS legado somente nos cards e não ativa o feed", () => {
  assert.equal(typeof newsConfig.normalizeNewsEditorialDynamicConfig, "function");
  const normalized = newsConfig.normalizeNewsEditorialDynamicConfig(
    { layout:"B", secondarySlots:2 },
    { enabled:true, newsSource:"CNN Brasil", newsFeedUrl:"editorial.xml", selectedNewsSources:["CNN Brasil"] },
  );
  assert.equal(normalized.layout, "B");
  assert.deepEqual(normalized.editorial.selectedNewsSources, ["CNN Brasil"]);
  assert.equal(normalized.editorial.newsFeedUrl, "editorial.xml");
  assert.equal(normalized.feed.enabled, false);
});

test("feed explícito preserva fontes, clima e cidades independentemente do editorial", () => {
  const normalized = newsConfig.normalizeNewsEditorialDynamicConfig({
    editorial:{ enabled:true, newsFeedUrl:"editorial.xml", selectedNewsSources:["Editorial"] },
    feed:{ enabled:true, news:{ enabled:true, newsFeedUrl:"feed.xml", selectedNewsSources:["Feed"] }, includeWeather:true, weatherCities:["Natal/RN","Recife/PE"], tickerSpeed:"fast" },
  });
  assert.equal(normalized.editorial.newsFeedUrl, "editorial.xml");
  assert.equal(normalized.feed.news.newsFeedUrl, "feed.xml");
  assert.deepEqual(normalized.feed.weatherCities, ["Natal/RN","Recife/PE"]);
  assert.equal(normalized.feed.tickerSpeed, "fast");
});

test("loader consulta editorial, feed e cidades separadamente sem bloquear falhas climáticas", async () => {
  clearTemplateV2DynamicDataCache();
  const newsCalls = [];
  const weatherCalls = [];
  const config = {
    dynamicNews:{
      editorial:{ enabled:true, newsFeedUrl:"editorial.xml" },
      feed:{ enabled:true, news:{ enabled:true, newsFeedUrl:"feed.xml" }, includeWeather:true, weatherCities:["Natal/RN","Cidade inválida","Recife/PE"] },
    },
    modules:{ news:{ enabled:true, newsFeedUrl:"legacy.xml" }, weather:{ enabled:false } },
  };
  const data = await loadTemplateV2DynamicData(config, {
    loadNews:async (source) => { newsCalls.push(source.newsFeedUrl); return [{ title:source.newsFeedUrl }]; },
    loadWeather:async (city) => { weatherCalls.push(city); if (city === "Cidade inválida") throw new Error("indisponível"); return { city, temperature:28, condition:"Céu limpo" }; },
  });
  assert.deepEqual(newsCalls, ["editorial.xml","feed.xml"]);
  assert.deepEqual(weatherCalls, ["Natal/RN","Cidade inválida","Recife/PE"]);
  assert.equal(data.editorialNews[0].title, "editorial.xml");
  assert.equal(data.feedNews[0].title, "feed.xml");
  assert.deepEqual(data.feedWeather.map((item) => item.city), ["Natal/RN","Recife/PE"]);
});

test("alterar somente o feed reutiliza o cache editorial de dez minutos", async () => {
  clearTemplateV2DynamicDataCache();
  const calls = [];
  const base = { modules:{ news:{ enabled:true } }, dynamicNews:{ editorial:{ enabled:true, newsFeedUrl:"editorial.xml" }, feed:{ enabled:true, news:{ enabled:true, newsFeedUrl:"feed-a.xml" } } } };
  const loadNews = async (source) => { calls.push(source.newsFeedUrl); return [{ title:source.newsFeedUrl }]; };
  await loadTemplateV2DynamicData(base, { loadNews });
  await loadTemplateV2DynamicData({ ...base, dynamicNews:{ ...base.dynamicNews, feed:{ ...base.dynamicNews.feed, news:{ enabled:true, newsFeedUrl:"feed-b.xml" } } } }, { loadNews });
  assert.deepEqual(calls, ["editorial.xml","feed-a.xml","feed-b.xml"]);
});

test("itens mistos do ticker combinam notícias e clima sem dados fictícios", () => {
  assert.equal(typeof newsConfig.buildNewsEditorialFeedItems, "function");
  const items = newsConfig.buildNewsEditorialFeedItems(
    [{ title:"Manchete real" }],
    [{ city:"Natal/RN", temperature:29, condition:"Parcialmente nublado" }],
  );
  assert.deepEqual(items.map((item) => item.title), ["Manchete real","Natal/RN · 29°C · Parcialmente nublado"]);
});

test("ticker aceita somente notícias ou somente clima", () => {
  const newsOnly = newsConfig.buildNewsEditorialFeedItems([{ title:"Manchete real" }], []);
  const weatherOnly = newsConfig.buildNewsEditorialFeedItems([], [{ city:"Recife/PE", temperature:27, condition:"Chuva leve" }]);
  assert.deepEqual(newsOnly.map((item) => item.title), ["Manchete real"]);
  assert.deepEqual(weatherOnly.map((item) => item.title), ["Recife/PE · 27°C · Chuva leve"]);
});

test("configuração independente persiste ao reabrir o rascunho", () => {
  const draft = createTemplateV2Draft(NEWS_EDITORIAL_DYNAMIC_TYPE, { dynamicNews:{ editorial:{ newsFeedUrl:"editorial.xml" }, feed:{ enabled:true, news:{ newsFeedUrl:"feed.xml" }, includeWeather:true, weatherCities:["Natal/RN"] } } });
  const reopened = createTemplateV2Draft(NEWS_EDITORIAL_DYNAMIC_TYPE, draft);
  assert.equal(reopened.dynamicNews.editorial.newsFeedUrl, "editorial.xml");
  assert.equal(reopened.dynamicNews.feed.news.newsFeedUrl, "feed.xml");
  assert.deepEqual(reopened.dynamicNews.feed.weatherCities, ["Natal/RN"]);
});

test("renderer usa dados editoriais e feed separados e reserva a faixa", () => {
  const renderer = fs.readFileSync(new URL("../src/templates-v2/news-editorial-dynamic/NewsEditorialDynamicRenderer.jsx", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../src/templates-v2/news-editorial-dynamic/news-editorial-dynamic.css", import.meta.url), "utf8");
  assert.match(renderer, /dynamicData\?\.editorialNews/);
  assert.match(renderer, /buildNewsEditorialFeedItems/);
  assert.match(renderer, /TemplateNewsTicker/);
  assert.match(renderer, /has-news-ticker/);
  assert.match(css, /\.tpv2-news-dynamic\.is-landscape \.featured h2\{[^}]*-webkit-line-clamp/);
  assert.match(css, /\.tpv2-news-dynamic\.is-landscape \.featured p\{[^}]*-webkit-line-clamp/);
  assert.match(css, /\.tpv2-news-dynamic\.has-news-ticker\{/);
});

test("editor específico oferece fontes independentes e clima multi-cidade", () => {
  const editor = fs.readFileSync(new URL("../src/templates-v2/news-editorial-dynamic/NewsEditorialDynamicEditorFields.jsx", import.meta.url), "utf8");
  assert.match(editor, /Notícias editoriais/);
  assert.match(editor, /Feed inferior/);
  assert.match(editor, /Incluir previsão do tempo no feed/);
  assert.match(editor, /weatherCities/);
});
