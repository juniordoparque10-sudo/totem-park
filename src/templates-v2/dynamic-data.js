export function getTemplateV2DynamicDataKey(config = {}) {
  const weather = config.modules?.weather || {};
  const news = config.modules?.news || {};
  return JSON.stringify({
    weather: weather.enabled ? { city: weather.city || "", days: Number(weather.forecastDays || 5) } : null,
    news: news.enabled ? { feed: news.newsFeedUrl || "", source: news.newsSource || "", selected: news.selectedNewsSources || [] } : null,
  });
}

export function hasTemplateV2DynamicModules(config = {}) {
  return Boolean(config.modules?.weather?.enabled || config.modules?.news?.enabled);
}
