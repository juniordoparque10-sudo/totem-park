import { useEffect, useRef } from "react";
import { readTemplateDataCache } from "./offline-data-cache.js";

const scheduleMicrotask = (task) => Promise.resolve().then(task);

export function restoreTemplateV2WeatherCachedData({ scope = {}, weatherConfig = null, storage } = {}) {
  if (!weatherConfig) return {};
  const record = readTemplateDataCache({ ...scope, module:"weather", config:weatherConfig }, storage);
  return record?.payload && typeof record.payload === "object" ? { weather:record.payload } : {};
}

export function useTemplateV2WeatherRehydration({
  scope = {},
  weatherConfig = null,
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
    weatherConfig,
  });

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return undefined;
    }
    if (!weatherConfig) return undefined;
    let active = true;
    schedule(() => {
      if (!active) return;
      const restored = restoreTemplateV2WeatherCachedData({ scope, weatherConfig, storage });
      if (active && restored.weather) onRestoreRef.current?.(restored);
    });
    return () => { active = false; };
  // The serialized weather configuration is the complete late-rehydration boundary.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rehydrationKey, storage, schedule]);
}
