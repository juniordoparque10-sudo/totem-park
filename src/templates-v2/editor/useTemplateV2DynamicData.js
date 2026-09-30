import { useEffect, useState } from "react";
import { getTemplateV2DynamicDataKey, hasTemplateV2DynamicModules } from "../dynamic-data";

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
