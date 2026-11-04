import { useEffect, useRef } from "react";
import { readNewsEditorialDynamicCache, readTemplateDataCache } from "./offline-data-cache.js";

const CLOCK_PRO_TYPE = "clock-pro";
const scheduleMicrotask = (task) => Promise.resolve().then(task);

export function restoreTemplateV2NewsCachedData({
  scope = {},
  templateType = "",
  dynamicNews = null,
  newsConfig = null,
  storage,
} = {}) {
  if (dynamicNews) return readNewsEditorialDynamicCache(scope, dynamicNews, storage) || {};
  if (templateType !== CLOCK_PRO_TYPE || !newsConfig) return {};
  const record = readTemplateDataCache({ ...scope, module:"news", config:newsConfig }, storage);
  return Array.isArray(record?.payload) && record.payload.length ? { news:record.payload } : {};
}

export function useTemplateV2NewsRehydration({
  scope = {},
  templateType = "",
  dynamicNews = null,
  newsConfig = null,
  storage,
  onRestore,
  schedule = scheduleMicrotask,
} = {}) {
  const onRestoreRef = useRef(onRestore);
  const mountedRef = useRef(false);
  const rehydrationKey = JSON.stringify({
    clientId:scope.clientId || "",
    screenId:scope.screenId || "",
    templateId:scope.templateId || "",
    templateType,
    dynamicNews,
    newsConfig,
  });

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return undefined;
    }
    if (!dynamicNews && (templateType !== CLOCK_PRO_TYPE || !newsConfig)) return undefined;
    let active = true;
    schedule(() => {
      if (!active) return;
      const restored = restoreTemplateV2NewsCachedData({ scope, templateType, dynamicNews, newsConfig, storage });
      if (active && Object.keys(restored).length) onRestoreRef.current?.(restored);
    });
    return () => { active = false; };
  // The serialized news configuration is the complete late-rehydration boundary.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rehydrationKey, storage, schedule]);
}
