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
    loadNews:async (source) => { newsCalls.push([source.newsFeedUrl,source.dynamicStrict]); return [{ title:source.newsFeedUrl }]; },
    loadWeather:async (city) => { weatherCalls.push(city); if (city === "Cidade inválida") throw new Error("indisponível"); return { city, temperature:28, condition:"Céu limpo" }; },
  });
  assert.deepEqual(newsCalls, [["editorial.xml",true],["feed.xml",true]]);
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

test("falha temporária após o TTL preserva o último feed válido", async () => {
  clearTemplateV2DynamicDataCache();
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  const config = { dynamicNews:{ editorial:{ enabled:false }, feed:{ enabled:true, news:{ enabled:true, newsFeedUrl:"feed.xml" } } } };
  try {
    const first = await loadTemplateV2DynamicData(config, { loadNews:async () => [{ title:"Manchete válida" }] });
    assert.equal(first.feedNews[0].title, "Manchete válida");
    now += 10 * 60 * 1000 + 1;
    const second = await loadTemplateV2DynamicData(config, { loadNews:async () => { throw new Error("offline"); } });
    assert.equal(second.feedNews[0].title, "Manchete válida");
  } finally {
    Date.now = originalNow;
    clearTemplateV2DynamicDataCache();
  }
});

test("resposta RSS vazia não apaga Notícias V2 e a reconexão força nova consulta", async () => {
  clearTemplateV2DynamicDataCache();
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  const config = {
    dynamicNews:{
      editorial:{ enabled:true, newsFeedUrl:"editorial.xml" },
      feed:{ enabled:true, news:{ enabled:true, newsFeedUrl:"feed.xml" } },
    },
  };
  let phase = "online";
  const calls = [];
  const loadNews = async (source) => {
    calls.push([phase, source.newsFeedUrl]);
    if (phase === "offline") return [];
    return [{ title:`${phase}-${source.newsFeedUrl}` }];
  };
  try {
    const online = await loadTemplateV2DynamicData(config, { loadNews });
    assert.equal(online.editorialNews[0].title, "online-editorial.xml");
    assert.equal(online.feedNews[0].title, "online-feed.xml");

    now += 10 * 60 * 1000 + 1;
    phase = "offline";
    const offline = await loadTemplateV2DynamicData(config, { loadNews });
    assert.equal(offline.editorialNews[0].title, "online-editorial.xml");
    assert.equal(offline.feedNews[0].title, "online-feed.xml");

    phase = "reconnected";
    const recovered = await loadTemplateV2DynamicData(config, { loadNews }, { force:true });
    assert.equal(recovered.editorialNews[0].title, "reconnected-editorial.xml");
    assert.equal(recovered.feedNews[0].title, "reconnected-feed.xml");
    assert.deepEqual(calls.filter(([callPhase]) => callPhase === "reconnected"), [
      ["reconnected", "editorial.xml"],
      ["reconnected", "feed.xml"],
    ]);
  } finally {
    Date.now = originalNow;
    clearTemplateV2DynamicDataCache();
  }
});

test("reconexão força somente RSS e preserva o cache de clima do feed", async () => {
  clearTemplateV2DynamicDataCache();
  const config = {
    dynamicNews:{
      editorial:{ enabled:true, newsFeedUrl:"editorial.xml" },
      feed:{
        enabled:true,
        news:{ enabled:true, newsFeedUrl:"feed.xml" },
        includeWeather:true,
        weatherCities:["Natal/RN"],
      },
    },
  };
  let weatherCalls = 0;
  const loadWeather = async () => { weatherCalls += 1; return { city:"Natal/RN", temperature:28 }; };
  const loadNews = async (source) => [{ title:source.newsFeedUrl }];
  await loadTemplateV2DynamicData(config, { loadNews, loadWeather });
  await loadTemplateV2DynamicData(config, { loadNews, loadWeather }, { force:true });
  assert.equal(weatherCalls, 1);
  clearTemplateV2DynamicDataCache();
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

test("templates antigas preservam a aparência editorial atual", () => {
  const normalized = newsConfig.normalizeNewsEditorialDynamicConfig({});
  assert.deepEqual(normalized.appearance.cards, { featuredTransparency:22, secondaryTransparency:10 });
  assert.equal(normalized.feed.tickerBackground, "#07111f");
  assert.equal(normalized.feed.tickerTransparency, 8);
  assert.equal(normalized.feed.tickerTextColor, "#ffffff");
  assert.equal(normalized.feed.tickerAccentColor, "");
  assert.equal(normalized.feed.position, "compact");
});

test("aparência normaliza transparências independentes sem apagar conteúdo", () => {
  const normalized = newsConfig.normalizeNewsEditorialDynamicConfig({
    appearance:{ cards:{ featuredTransparency:37, secondaryTransparency:64 } },
    feed:{ tickerTransparency:45, tickerBackground:"#112233", tickerTextColor:"#fefefe", tickerAccentColor:"#ffcc00", position:"expanded" },
  });
  const style = newsConfig.getNewsEditorialAppearanceStyle(normalized, "Paisagem");
  assert.equal(style.featuredBackgroundAlpha, 0.63);
  assert.equal(style.secondaryBackgroundAlpha, 0.36);
  assert.equal(style.tickerBackground, "#112233");
  assert.equal(style.tickerTextColor, "#fefefe");
  assert.equal(style.tickerAccentColor, "#ffcc00");
  assert.equal(style.position, "expanded");
  assert.equal(style.editorialFooterGap, "0.8cqw");
});

test("três posições reservam áreas crescentes e respeitam a orientação", () => {
  const landscape = ["compact","intermediate","expanded"].map((position) => newsConfig.getNewsEditorialAppearanceStyle(newsConfig.normalizeNewsEditorialDynamicConfig({ feed:{ position } }), "Paisagem").editorialFooterGap);
  const portrait = ["compact","intermediate","expanded"].map((position) => newsConfig.getNewsEditorialAppearanceStyle(newsConfig.normalizeNewsEditorialDynamicConfig({ feed:{ position } }), "Retrato").editorialFooterGap);
  assert.deepEqual(landscape, ["4cqw","2.2cqw","0.8cqw"]);
  assert.deepEqual(portrait, ["4cqw","2.8cqw","1.4cqw"]);
});

test("aparência V2.2 persiste ao salvar e reabrir", () => {
  const draft = createTemplateV2Draft(NEWS_EDITORIAL_DYNAMIC_TYPE, { dynamicNews:{ appearance:{ cards:{ featuredTransparency:40, secondaryTransparency:55 } }, feed:{ position:"intermediate", tickerAccentColor:"#12abef" } } });
  const reopened = createTemplateV2Draft(NEWS_EDITORIAL_DYNAMIC_TYPE, draft);
  assert.equal(reopened.dynamicNews.appearance.cards.featuredTransparency, 40);
  assert.equal(reopened.dynamicNews.appearance.cards.secondaryTransparency, 55);
  assert.equal(reopened.dynamicNews.feed.position, "intermediate");
  assert.equal(reopened.dynamicNews.feed.tickerAccentColor, "#12abef");
});

test("renderer usa dados editoriais e feed separados e reserva a faixa", () => {
  const renderer = fs.readFileSync(new URL("../src/templates-v2/news-editorial-dynamic/NewsEditorialDynamicRenderer.jsx", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../src/templates-v2/news-editorial-dynamic/news-editorial-dynamic.css", import.meta.url), "utf8");
  assert.match(renderer, /dynamicData\?\.editorialNews/);
  assert.match(renderer, /buildNewsEditorialFeedItems/);
  assert.match(renderer, /TemplateNewsTicker/);
  assert.match(renderer, /has-news-ticker/);
  assert.doesNotMatch(renderer, /feedItems\s*=\s*buildNewsEditorialFeedItems\(items/);
  assert.match(css, /\.tpv2-news-dynamic\.is-landscape \.featured h2\{[^}]*-webkit-line-clamp/);
  assert.match(css, /\.tpv2-news-dynamic\.is-landscape \.featured p\{[^}]*-webkit-line-clamp/);
  assert.match(css, /\.tpv2-news-dynamic\.has-news-ticker\{/);
  assert.match(css, /--news-editorial-stage-bottom/);
  assert.match(css, /\.tpv2-news-dynamic\.has-news-ticker\{[^}]*padding-bottom:var\(--news-editorial-stage-bottom\)/);
  assert.doesNotMatch(css, /\.tpv2-news-dynamic\.has-news-ticker\.ticker-(?:compact|large)\{[^}]*padding-bottom/);
});

test("Player carrega os segmentos editoriais e do feed dinâmico, não apenas modules.news", () => {
  const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /loadTemplateV2DynamicData\(dynamicNewsPlayerConfig/);
  assert.match(app, /dynamicNews:originalConfig\.dynamicNews/);
  assert.match(app, /!dynamicNewsPlayerConfig/);
});

test("Player atualiza Notícias Editorial dinâmica pelo timer compartilhado de notícias", () => {
  const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /if \(dynamicNewsPlayerConfig && modules\.includes\("news"\)\) \{[\s\S]*?tasks\.push\([\s\S]*?loadTemplateV2DynamicData\(dynamicNewsPlayerConfig[\s\S]*?writeNewsEditorialDynamicCache/);
  assert.match(app, /setInterval\(\(\) => load\("timer", \["weather","news"\]\), 10 \* 60 \* 1000\)/);
  assert.match(app, /loadTemplateV2DynamicData\(dynamicNewsPlayerConfig,[\s\S]*?\{ force:reason === "online" \}/);
  assert.match(app, /refreshTemplateDataIfNeeded\(\{ \.\.\.scope, module:"news", config:newsCacheConfig \}, \{[^}]*force:reason === "online"/);
  assert.doesNotMatch(app, /if \(!dynamicNewsPlayerConfig\) return undefined;[\s\S]*?loadTemplateV2DynamicData\(dynamicNewsPlayerConfig/);
});

test("editor específico oferece fontes independentes e clima multi-cidade", () => {
  const editor = fs.readFileSync(new URL("../src/templates-v2/news-editorial-dynamic/NewsEditorialDynamicEditorFields.jsx", import.meta.url), "utf8");
  assert.match(editor, /Notícias editoriais/);
  assert.match(editor, /Feed inferior/);
  assert.match(editor, /Incluir previsão do tempo no feed/);
  assert.match(editor, /weatherCities/);
});
