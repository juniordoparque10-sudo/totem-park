const EMPTY_SOURCE = { enabled:true, newsSource:"", newsFeedUrl:"", selectedNewsSources:[] };
const EMPTY_FEED = { enabled:false, news:{ ...EMPTY_SOURCE }, includeWeather:false, weatherCities:[], tickerSpeed:"normal", tickerSize:"normal", tickerBackground:"#07111f", tickerTextColor:"#ffffff", tickerTransparency:8, tickerLabel:"Últimas notícias" };

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
    rotation:{ featuredSeconds:8, secondarySeconds:5, transition:"fade", ...(value.rotation || {}) },
    editorial,
    feed:{
      ...EMPTY_FEED,
      ...feedValue,
      enabled:feedValue.enabled === true,
      news:normalizeSource(feedValue.news, { enabled:true }),
      includeWeather:feedValue.includeWeather === true,
      weatherCities:uniqueStrings(feedValue.weatherCities),
    },
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
