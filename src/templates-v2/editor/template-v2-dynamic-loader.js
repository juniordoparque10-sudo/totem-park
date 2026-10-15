import { getTemplateV2DynamicDataKey, normalizeTemplateV2ForecastDays } from "../dynamic-data.js";
import { getConfiguredTemplateWeatherCity } from "../weather-city.js";

const CACHE_TTL_MS = 10 * 60 * 1000;
const dynamicCache = new Map();
const pendingLoads = new Map();

export function clearTemplateV2DynamicDataCache() {
  dynamicCache.clear();
  pendingLoads.clear();
}

export async function loadTemplateV2DynamicData(config, { loadWeather, loadNews } = {}) {
  const key = getTemplateV2DynamicDataKey(config);
  const cached = dynamicCache.get(key);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.data;
  if (pendingLoads.has(key)) return pendingLoads.get(key);

  const request = (async () => {
    const data = {};
    const weather = config.modules?.weather || {};
    const news = config.modules?.news || {};
    const weatherCity = getConfiguredTemplateWeatherCity(weather.city);
    if (weather.enabled && !weatherCity) data.weatherError = "missing-city";
    else if (weather.enabled && loadWeather) data.weather = await loadWeather(weatherCity, normalizeTemplateV2ForecastDays(weather.forecastDays));
    if (news.enabled && loadNews) data.news = await loadNews(news);
    if (config.sports?.provider) {
      const [{ normalizeSportsV2Config }, { resolveSportsDataProvider }] = await Promise.all([
        import("../sports-v2/config.js"),
        import("../sports-v2/data/SportsDataProvider.js"),
      ]);
      const sports = normalizeSportsV2Config(config.sports);
      const provider = resolveSportsDataProvider(sports);
      const snapshots = await Promise.allSettled(sports.selectedSports.map(async (sport) => [sport,await provider.getSnapshot(sport)]));
      data.sports = Object.fromEntries(snapshots.filter((result)=>result.status==="fulfilled").map((result)=>result.value));
      data.sportsErrors = sports.selectedSports.filter((_,index)=>snapshots[index].status==="rejected");
    }
    const hasUnavailableWeather = weather.enabled && (!data.weather || data.weather.unavailable === true);
    if (!hasUnavailableWeather) dynamicCache.set(key, { data, loadedAt: Date.now() });
    return data;
  })().finally(() => pendingLoads.delete(key));
  pendingLoads.set(key, request);
  return request;
}
