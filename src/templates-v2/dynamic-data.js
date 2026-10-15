import { normalizeNewsEditorialDynamicConfig } from "./news-editorial-dynamic/config.js";

export function normalizeTemplateV2ForecastDays(value) {
  const days = Number(value);
  if (!Number.isFinite(days)) return 5;
  return Math.max(3, Math.min(5, Math.trunc(days)));
}

export function getTemplateV2ForecastRequestDays(value) {
  return normalizeTemplateV2ForecastDays(value) + 1;
}

export function selectTemplateV2ForecastDays(forecast = [], value) {
  const days = normalizeTemplateV2ForecastDays(value);
  return (Array.isArray(forecast) ? forecast : []).slice(1, 1 + days);
}

export function getTemplateV2DynamicDataKey(config = {}) {
  const weather = config.modules?.weather || {};
  const news = config.modules?.news || {};
  const dynamicNews = config.dynamicNews ? normalizeNewsEditorialDynamicConfig(config.dynamicNews, news) : null;
  return JSON.stringify({
    weather: weather.enabled ? { city: weather.city || "", days: normalizeTemplateV2ForecastDays(weather.forecastDays) } : null,
    news: news.enabled ? { feed: news.newsFeedUrl || "", source: news.newsSource || "", selected: news.selectedNewsSources || [] } : null,
    editorialNews: dynamicNews?.editorial.enabled ? { feed:dynamicNews.editorial.newsFeedUrl, source:dynamicNews.editorial.newsSource, selected:dynamicNews.editorial.selectedNewsSources } : null,
    lowerFeed: dynamicNews?.feed.enabled ? { news:dynamicNews.feed.news, includeWeather:dynamicNews.feed.includeWeather, weatherCities:dynamicNews.feed.weatherCities } : null,
    sports: config.sports?.provider ? {
      provider: config.sports.provider,
      selected: config.sports.selectedSports || [],
      competitions: Object.fromEntries(Object.entries(config.sports.items || {}).map(([type,item]) => [type,item.competitionId || "daily"])),
    } : null,
  });
}

export function hasTemplateV2DynamicModules(config = {}) {
  const dynamicNews = config.dynamicNews ? normalizeNewsEditorialDynamicConfig(config.dynamicNews, config.modules?.news) : null;
  return Boolean(config.modules?.weather?.enabled || config.modules?.news?.enabled || dynamicNews?.editorial.enabled || dynamicNews?.feed.enabled || config.sports?.provider);
}
