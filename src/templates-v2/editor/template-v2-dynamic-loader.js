import { getTemplateV2DynamicDataKey, normalizeTemplateV2ForecastDays } from "../dynamic-data.js";
import { getConfiguredTemplateWeatherCity } from "../weather-city.js";
import { normalizeNewsEditorialDynamicConfig } from "../news-editorial-dynamic/config.js";

const CACHE_TTL_MS = 10 * 60 * 1000;
const dynamicCache = new Map();
const pendingLoads = new Map();
const segmentCache = new Map();
const pendingSegments = new Map();

async function loadCachedSegment(key, load) {
  const cached = segmentCache.get(key);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.data;
  if (pendingSegments.has(key)) return pendingSegments.get(key);
  const request = Promise.resolve().then(load).then((data)=>{ segmentCache.set(key,{ data,loadedAt:Date.now() }); return data; }).catch((error)=>{
    if (cached?.data != null) return cached.data;
    throw error;
  }).finally(()=>pendingSegments.delete(key));
  pendingSegments.set(key,request);
  return request;
}

export function clearTemplateV2DynamicDataCache() {
  dynamicCache.clear();
  pendingLoads.clear();
  segmentCache.clear();
  pendingSegments.clear();
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
    const dynamicNews = config.dynamicNews ? normalizeNewsEditorialDynamicConfig(config.dynamicNews, news) : null;
    const weatherCity = getConfiguredTemplateWeatherCity(weather.city);
    const tasks = [];
    if (weather.enabled && !weatherCity) data.weatherError = "missing-city";
    else if (weather.enabled && loadWeather) tasks.push({ key:"weather", run:()=>loadWeather(weatherCity, normalizeTemplateV2ForecastDays(weather.forecastDays)) });
    if (dynamicNews) {
      if (dynamicNews.editorial.enabled && loadNews) tasks.push({ key:"editorialNews", run:()=>loadCachedSegment(`editorial:${JSON.stringify(dynamicNews.editorial)}`,()=>loadNews({ ...dynamicNews.editorial, dynamicStrict:true })) });
      if (dynamicNews.feed.enabled && dynamicNews.feed.news.enabled && loadNews) tasks.push({ key:"feedNews", run:()=>loadCachedSegment(`feed:${JSON.stringify(dynamicNews.feed.news)}`,()=>loadNews({ ...dynamicNews.feed.news, dynamicStrict:true })) });
      if (dynamicNews.feed.enabled && dynamicNews.feed.includeWeather && loadWeather && dynamicNews.feed.weatherCities.length) tasks.push({ key:"feedWeather", run:async()=>{
        const results = await Promise.allSettled(dynamicNews.feed.weatherCities.map((city)=>loadCachedSegment(`feed-weather:${city}`,()=>loadWeather(city,3))));
        return results.filter((result)=>result.status === "fulfilled" && result.value && !result.value.unavailable).map((result)=>result.value);
      } });
    } else if (news.enabled && loadNews) tasks.push({ key:"news", run:()=>loadNews(news) });
    const settled = await Promise.allSettled(tasks.map((task)=>task.run()));
    settled.forEach((result,index)=>{ if (result.status === "fulfilled") data[tasks[index].key] = result.value; else data[`${tasks[index].key}Error`] = true; });
    if (dynamicNews) data.news = data.editorialNews || [];
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
