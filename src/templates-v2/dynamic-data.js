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
  return JSON.stringify({
    weather: weather.enabled ? { city: weather.city || "", days: normalizeTemplateV2ForecastDays(weather.forecastDays) } : null,
    news: news.enabled ? { feed: news.newsFeedUrl || "", source: news.newsSource || "", selected: news.selectedNewsSources || [] } : null,
    sports: config.sports?.provider ? {
      provider: config.sports.provider,
      selected: config.sports.selectedSports || [],
      competitions: Object.fromEntries(Object.entries(config.sports.items || {}).map(([type,item]) => [type,item.competitionId || "daily"])),
    } : null,
  });
}

export function hasTemplateV2DynamicModules(config = {}) {
  return Boolean(config.modules?.weather?.enabled || config.modules?.news?.enabled || config.sports?.provider);
}
