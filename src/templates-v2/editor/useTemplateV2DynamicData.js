import { useEffect, useState } from "react";
import { getTemplateV2DynamicDataKey, hasTemplateV2DynamicModules } from "../dynamic-data";
import { normalizeSportsV2Config } from "../sports-v2/config";
import { resolveSportsDataProvider } from "../sports-v2/data/SportsDataProvider";

const CACHE_TTL_MS = 10 * 60 * 1000;
const dynamicCache = new Map();
const pendingLoads = new Map();

async function loadSharedDynamicData(config, loadWeather, loadNews) {
  const key = getTemplateV2DynamicDataKey(config);
  const cached = dynamicCache.get(key);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.data;
  if (pendingLoads.has(key)) return pendingLoads.get(key);

  const request = (async () => {
    const data = {};
    const weather = config.modules?.weather || {};
    const news = config.modules?.news || {};
    if (weather.enabled && loadWeather) data.weather = await loadWeather(weather.city);
    if (news.enabled && loadNews) data.news = await loadNews(news);
    if (config.sports?.provider) {
      const sports = normalizeSportsV2Config(config.sports);
      const provider = resolveSportsDataProvider(sports);
      const snapshots = await Promise.allSettled(sports.selectedSports.map(async (sport) => [sport,await provider.getSnapshot(sport)]));
      data.sports = Object.fromEntries(snapshots.filter((result)=>result.status==="fulfilled").map((result)=>result.value));
      data.sportsErrors = sports.selectedSports.filter((_,index)=>snapshots[index].status==="rejected");
    }
    dynamicCache.set(key, { data, loadedAt: Date.now() });
    return data;
  })().finally(() => pendingLoads.delete(key));
  pendingLoads.set(key, request);
  return request;
}

export default function useTemplateV2DynamicData(config, { loadWeather, loadNews } = {}) {
  const key = getTemplateV2DynamicDataKey(config);
  const [state, setState] = useState(() => hasTemplateV2DynamicModules(config) ? { loading:true } : null);

  /* Loading state begins at the external weather/news request boundary. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!hasTemplateV2DynamicModules(config)) { setState(null); return undefined; }
    let cancelled = false;
    setState({ loading:true });
    loadSharedDynamicData(config, loadWeather, loadNews)
      .then((data) => { if (!cancelled) setState(data); })
      .catch(() => { if (!cancelled) setState({ weather:null, news:[], error:true }); });
    return () => { cancelled = true; };
  }, [config, key, loadNews, loadWeather]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return state;
}
