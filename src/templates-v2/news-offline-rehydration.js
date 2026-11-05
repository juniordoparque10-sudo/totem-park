import { useEffect, useRef } from "react";
import { readNewsEditorialDynamicCache, readTemplateDataCache } from "./offline-data-cache.js";

const scheduleMicrotask = (task) => Promise.resolve().then(task);

export function restoreTemplateV2NewsCachedData({
  scope = {},
  dynamicNews = null,
  newsConfig = null,
  storage,
} = {}) {
  if (dynamicNews) return readNewsEditorialDynamicCache(scope, dynamicNews, storage) || {};
  if (!newsConfig) return {};
  const record = readTemplateDataCache({ ...scope, module:"news", config:newsConfig }, storage);
  return Array.isArray(record?.payload) && record.payload.length ? { news:record.payload } : {};
}

export function useTemplateV2NewsRehydration({
  scope = {},
  dynamicNews = null,
  newsConfig = null,
  storage,
  onRestore,
  schedule = scheduleMicrotask,
} = {}) {
  const onRestoreRef = useRef(onRestore);
  const rehydrationKey = JSON.stringify({
    clientId:scope.clientId || "",
    screenId:scope.screenId || "",
    templateId:scope.templateId || "",
    dynamicNews,
    newsConfig,
  });

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    if (!dynamicNews && !newsConfig) return undefined;
    let active = true;
    schedule(() => {
      if (!active) return;
      const restored = restoreTemplateV2NewsCachedData({ scope, dynamicNews, newsConfig, storage });
      if (active && Object.keys(restored).length) onRestoreRef.current?.(restored);
    });
    return () => { active = false; };
  // The serialized news configuration is the complete late-rehydration boundary.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rehydrationKey, storage, schedule]);
}
