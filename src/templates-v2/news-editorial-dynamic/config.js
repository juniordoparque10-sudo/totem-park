const EMPTY_SOURCE = { enabled:true, newsSource:"", newsFeedUrl:"", selectedNewsSources:[] };
const EMPTY_FEED = { enabled:false, news:{ ...EMPTY_SOURCE }, includeWeather:false, weatherCities:[], tickerSpeed:"normal", tickerSize:"normal", tickerBackground:"#07111f", tickerTextColor:"#ffffff", tickerAccentColor:"", tickerTransparency:8, tickerLabel:"Últimas notícias", position:"compact" };
const EMPTY_APPEARANCE = { cards:{ featuredTransparency:22, secondaryTransparency:10 } };
const POSITIONS = new Set(["compact", "intermediate", "expanded"]);
const clampPercent = (value, fallback) => Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : fallback));
const validColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
const clampInterval = (value, fallback = 12) => Math.max(5, Math.min(60, Number.isFinite(Number(value)) ? Number(value) : fallback));

const uniqueStrings = (values) => [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];

function normalizeSource(value = {}, fallback = {}) {
  return {
    ...EMPTY_SOURCE,
    ...fallback,
    ...value,
    enabled:value.enabled ?? fallback.enabled ?? true,
    selectedNewsSources:uniqueStrings(value.selectedNewsSources ?? fallback.selectedNewsSources),
  };
}

export function normalizeNewsEditorialDynamicConfig(value = {}, legacyNews = {}) {
  const editorial = normalizeSource(value.editorial, legacyNews);
  const feedValue = value.feed || {};
  return {
    layout:value.layout || "A",
    showImage:value.showImage !== false,
    showSummary:value.showSummary !== false,
    showSource:value.showSource !== false,
    showDate:value.showDate !== false,
    secondarySlots:Math.max(1,Math.min(4,Math.trunc(Number(value.secondarySlots)) || 3)),
    rotation:{
      featuredSeconds:clampInterval(value.rotation?.intervalSeconds ?? value.rotation?.featuredSeconds, 12),
      secondarySeconds:clampInterval(value.rotation?.intervalSeconds ?? value.rotation?.featuredSeconds, 12),
      transition:["fade","slide-soft"].includes(value.rotation?.transition) ? value.rotation.transition : "fade",
      intervalSeconds:clampInterval(value.rotation?.intervalSeconds ?? value.rotation?.featuredSeconds, 12),
    },
    appearance:{ cards:{
      featuredTransparency:clampPercent(value.appearance?.cards?.featuredTransparency, EMPTY_APPEARANCE.cards.featuredTransparency),
      secondaryTransparency:clampPercent(value.appearance?.cards?.secondaryTransparency, EMPTY_APPEARANCE.cards.secondaryTransparency),
    } },
    editorial,
    feed:{
      ...EMPTY_FEED,
      ...feedValue,
      enabled:feedValue.enabled === true,
      news:normalizeSource(feedValue.news, { enabled:true }),
      includeWeather:feedValue.includeWeather === true,
      weatherCities:uniqueStrings(feedValue.weatherCities),
      tickerBackground:validColor(feedValue.tickerBackground, EMPTY_FEED.tickerBackground),
      tickerTextColor:validColor(feedValue.tickerTextColor, EMPTY_FEED.tickerTextColor),
      tickerAccentColor:validColor(feedValue.tickerAccentColor, EMPTY_FEED.tickerAccentColor),
      tickerTransparency:clampPercent(feedValue.tickerTransparency, EMPTY_FEED.tickerTransparency),
      position:POSITIONS.has(feedValue.position) ? feedValue.position : EMPTY_FEED.position,
    },
  };
}

export function getNewsEditorialAppearanceStyle(value = {}, orientation = "Paisagem") {
  const config = normalizeNewsEditorialDynamicConfig(value);
  const gaps = orientation === "Retrato"
    ? { compact:"4cqw", intermediate:"2.8cqw", expanded:"1.4cqw" }
    : { compact:"4cqw", intermediate:"2.2cqw", expanded:"0.8cqw" };
  return {
    featuredBackgroundAlpha:(100 - config.appearance.cards.featuredTransparency) / 100,
    secondaryBackgroundAlpha:(100 - config.appearance.cards.secondaryTransparency) / 100,
    tickerBackground:config.feed.tickerBackground,
    tickerTextColor:config.feed.tickerTextColor,
    tickerAccentColor:config.feed.tickerAccentColor,
    position:config.feed.position,
    editorialFooterGap:gaps[config.feed.position],
  };
}

export function buildNewsEditorialFeedItems(news = [], weather = []) {
  const headlines = (Array.isArray(news) ? news : []).map((item) => String(item?.title || item?.headline || "").trim()).filter(Boolean).map((title) => ({ title, kind:"news" }));
  const forecasts = (Array.isArray(weather) ? weather : []).flatMap((item) => {
    const city = String(item?.city || "").trim();
    const temperature = Number(item?.temperature);
    const condition = String(item?.condition || "").trim();
    if (!city || !Number.isFinite(temperature) || !condition || item?.unavailable) return [];
    return [{ title:`${city} · ${Math.round(temperature)}°C · ${condition}`, kind:"weather" }];
  });
  return [...headlines,...forecasts];
}
