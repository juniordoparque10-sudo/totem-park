import { useEffect, useRef } from "react";
import { mergeLegacyLiveContent } from "./weather-presentation.js";
import { selectRealNewsState } from "./template-news-state.js";
import { buildTemplateDataCacheKey, readTemplateDataCache } from "./templates-v2/offline-data-cache.js";

const scheduleMicrotask = (task) => Promise.resolve().then(task);

export function restoreLegacyTemplateLiveContent(context, { storage } = {}) {
  if (!context) return null;
  return readTemplateDataCache(context, storage)?.payload || null;
}

export function mergeRestoredLegacyLiveContent(current = {}, restored = {}) {
  const merged = mergeLegacyLiveContent(current, restored);
  if (Object.hasOwn(restored, "news")) {
    merged.news = selectRealNewsState({ cached:current.news, fetched:restored.news });
  }
  return merged;
}

export function mergeLegacyLiveContentWithRss(previous = {}, candidate = {}, { isUsableNews = (items) => Array.isArray(items) && items.length > 0 } = {}) {
  const merged = mergeLegacyLiveContent(previous, candidate);
  if (Object.hasOwn(candidate, "news")) {
    merged.news = isUsableNews(candidate.news) ? candidate.news : previous.news;
    if (!isUsableNews(merged.news)) delete merged.news;
  }
  return merged;
}

export function buildLegacyLiveContentForPersistence(previous = {}, candidate = {}, {
  isUsableNews = (items) => Array.isArray(items) && items.length > 0,
  isUsableWeather = () => false,
} = {}) {
  const next = { ...(previous || {}) };
  if (isUsableWeather(candidate.weather)) next.weather = candidate.weather;
  if (isUsableNews(candidate.news)) next.news = candidate.news;
  if (candidate.sportsData) next.sportsData = candidate.sportsData;
  if (candidate.tideForecast) next.tideForecast = candidate.tideForecast;
  return next;
}

export function useLegacyTemplateLiveContentRehydration({
  context = null,
  storage,
  onRestore,
  schedule = scheduleMicrotask,
} = {}) {
  const onRestoreRef = useRef(onRestore);
  const contextKey = context ? buildTemplateDataCacheKey(context) : "";

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    if (!contextKey) return undefined;
    let active = true;
    schedule(() => {
      if (!active) return;
      const restored = restoreLegacyTemplateLiveContent(context, { storage });
      if (active && restored) onRestoreRef.current?.(restored);
    });
    return () => { active = false; };
  // The persistent cache key is the complete late-rehydration boundary.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, storage, schedule]);
}
