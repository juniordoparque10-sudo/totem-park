export function getTemplateV2DynamicDataKey(config = {}) {
  const weather = config.modules?.weather || {};
  const news = config.modules?.news || {};
  return JSON.stringify({
    weather: weather.enabled ? { city: weather.city || "", days: Number(weather.forecastDays || 5) } : null,
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
