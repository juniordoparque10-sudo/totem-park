import { normalizeSportsV2Config } from "./sports-v2/config.js";
import { normalizeNewsEditorialDynamicConfig } from "./news-editorial-dynamic/config.js";

const DATA_PREFIX = "totempark.template-data.v1";
const memoryCache = new Map();
const inflightRefreshes = new Map();

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  return JSON.stringify(value ?? null);
}

function hash(value) {
  let result = 2166136261;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function storageOrDefault(storage) {
  try { return storage || globalThis.localStorage || null; } catch { return null; }
}

export function buildTemplateDataCacheKey({ clientId = "", screenId = "", templateId = "", module = "", config = null } = {}) {
  const scope = [clientId || "unknown-client", screenId || "unknown-screen", templateId || "unknown-template", module || "unknown-module"].map(encodeURIComponent).join(".");
  return `${DATA_PREFIX}.${scope}.${hash(stableSerialize(config))}`;
}

export function readTemplateDataCache(context, storage) {
  const key = buildTemplateDataCacheKey(context);
  let record = memoryCache.get(key) || null;
  if (!record) {
    try {
      const raw = storageOrDefault(storage)?.getItem(key);
      record = raw ? JSON.parse(raw) : null;
    } catch { record = null; }
  }
  if (!record || record.version !== 1 || record.payload == null) return null;
  memoryCache.set(key, record);
  return record;
}

export function writeTemplateDataCache(context, payload, { source = "remote", now = Date.now(), fetchedAt, refreshAttemptAt, storage } = {}) {
  if (payload == null) return null;
  const key = buildTemplateDataCacheKey(context);
  const record = { version:1, payload, timestamp:now, ...(fetchedAt != null ? { fetchedAt } : {}), ...(refreshAttemptAt != null ? { refreshAttemptAt } : {}), source, configVersion:hash(stableSerialize(context?.config)) };
  memoryCache.set(key, record);
  try { storageOrDefault(storage)?.setItem(key, JSON.stringify(record)); } catch { /* Storage pressure must not affect playback. */ }
  return record;
}

export function createWeatherDataFingerprintConfig(value = {}) {
  return {
    city:String(value.city || "").trim(),
    ...(value.latitude != null ? { latitude:Number(value.latitude) } : {}),
    ...(value.longitude != null ? { longitude:Number(value.longitude) } : {}),
    ...(value.forecastDays != null ? { forecastDays:Number(value.forecastDays) } : {}),
  };
}

export function createNewsDataFingerprintConfig(value = {}) {
  return {
    parserGeneration:2,
    newsSource:String(value.newsSource || "").trim(),
    newsFeedUrl:String(value.newsFeedUrl || "").trim(),
    selectedNewsSources:(value.selectedNewsSources || []).map((item) => String(item).trim()).filter(Boolean),
  };
}

function buildNewsEditorialSegmentContext(scope, segment, config) {
  return { ...scope, module:`news-editorial-${segment}`, config:createNewsDataFingerprintConfig(config) };
}

export function readNewsEditorialDynamicCache(scope, value, storage) {
  const config = normalizeNewsEditorialDynamicConfig(value);
  const segments = [
    ["editorial", "editorialNews", config.editorial],
    ["feed", "feedNews", config.feed.news],
  ];
  const data = {};
  segments.forEach(([segment, key, segmentConfig]) => {
    if (!segmentConfig?.enabled) return;
    const record = readTemplateDataCache(buildNewsEditorialSegmentContext(scope, segment, segmentConfig), storage);
    if (Array.isArray(record?.payload) && record.payload.length) data[key] = record.payload;
  });
  return Object.keys(data).length ? data : null;
}

export function writeNewsEditorialDynamicCache(scope, value, payload = {}, options = {}) {
  const config = normalizeNewsEditorialDynamicConfig(value);
  const records = [];
  if (config.editorial.enabled && Array.isArray(payload.editorialNews) && payload.editorialNews.length) {
    records.push(writeTemplateDataCache(buildNewsEditorialSegmentContext(scope, "editorial", config.editorial), payload.editorialNews, { ...options, source:"rss" }));
  }
  if (config.feed.enabled && config.feed.news.enabled && Array.isArray(payload.feedNews) && payload.feedNews.length) {
    records.push(writeTemplateDataCache(buildNewsEditorialSegmentContext(scope, "feed", config.feed.news), payload.feedNews, { ...options, source:"rss" }));
  }
  return records.filter(Boolean);
}

export async function refreshTemplateDataIfNeeded(context, { ttlMs, fetcher, now = Date.now(), storage, online = true, source = "remote", isUsable = (payload) => payload != null } = {}) {
  const key = buildTemplateDataCacheKey(context);
  const cached = readTemplateDataCache(context, storage);
  if (cached?.fetchedAt != null && now - cached.fetchedAt < ttlMs) {
    return { payload:cached.payload, fetched:false, reason:"fresh", record:cached };
  }
  if (cached?.refreshAttemptAt != null && now - cached.refreshAttemptAt < ttlMs) {
    return { payload:cached.payload, fetched:false, reason:"retry-deferred", record:cached };
  }
  if (!online) return { payload:cached?.payload ?? null, fetched:false, reason:"offline", record:cached };
  if (inflightRefreshes.has(key)) return inflightRefreshes.get(key);

  const refresh = (async () => {
    try {
      const payload = await fetcher();
      if (!isUsable(payload)) return { payload:cached?.payload ?? null, fetched:true, reason:"unusable", record:cached };
      const record = writeTemplateDataCache(context, payload, { source, now, fetchedAt:now, refreshAttemptAt:now, storage });
      return { payload, fetched:true, reason:"refreshed", record };
    } catch (error) {
      const record = cached ? writeTemplateDataCache(context, cached.payload, { source:cached.source, now:cached.timestamp, fetchedAt:cached.fetchedAt, refreshAttemptAt:now, storage }) : null;
      return { payload:cached?.payload ?? null, fetched:true, reason:"failed", record, error };
    } finally {
      inflightRefreshes.delete(key);
    }
  })();
  inflightRefreshes.set(key, refresh);
  return refresh;
}

export function createSportsDataFingerprintConfig(value = {}) {
  const sports = normalizeSportsV2Config(value || {});
  const selectedSports = [...new Set(sports.selectedSports || [])].sort();
  const dataModuleNames = ["results","upcoming","standings","events","live","statistics","advancedStats","sets"];
  return {
    provider:sports.provider,
    selectedSports,
    items:Object.fromEntries(selectedSports.map((sport) => [sport, {
      competitionId:String(sports.items?.[sport]?.competitionId || ""),
      modules:Object.fromEntries(dataModuleNames.filter((module) => Object.hasOwn(sports.items?.[sport]?.modules || {}, module)).map((module) => [module, Boolean(sports.items[sport].modules[module])])),
    }])),
  };
}

export function buildSportsDataCacheContext(scope = {}, sportsConfig = {}) {
  return { ...scope, module:"sports", config:createSportsDataFingerprintConfig(sportsConfig) };
}

export function hasUsableSportsPayload(payload) {
  if (!payload?.sports || typeof payload.sports !== "object") return false;
  return Object.values(payload.sports).some((snapshot) => {
    const data = snapshot?.data;
    if (!data || typeof data !== "object") return false;
    return ["results","upcoming","standings","events"].some((field) => Array.isArray(data[field]) && data[field].length > 0);
  });
}

export function mergeSportsLastKnown(previous, payload) {
  if (!hasUsableSportsPayload(payload)) return previous;
  return { ...(previous || {}), sports:payload.sports, sportsErrors:Array.isArray(payload.sportsErrors) ? payload.sportsErrors : [] };
}

export function writeSportsTemplateDataCache(scope, sportsConfig, payload, options = {}) {
  if (!hasUsableSportsPayload(payload)) return null;
  return writeTemplateDataCache(buildSportsDataCacheContext(scope, sportsConfig), payload, options);
}

export function readSportsTemplateDataCache(scope, sportsConfig, storage) {
  const canonicalContext = buildSportsDataCacheContext(scope, sportsConfig);
  const canonical = readTemplateDataCache(canonicalContext, storage);
  if (hasUsableSportsPayload(canonical?.payload)) return canonical;

  const legacyContext = { ...scope, module:"sports", config:sportsConfig };
  if (buildTemplateDataCacheKey(legacyContext) === buildTemplateDataCacheKey(canonicalContext)) return null;
  const legacy = readTemplateDataCache(legacyContext, storage);
  if (!hasUsableSportsPayload(legacy?.payload)) return null;

  return writeTemplateDataCache(canonicalContext, legacy.payload, {
    storage,
    source:legacy.source || "sports-v2-legacy-migration",
    now:legacy.timestamp,
  });
}

export function clearTemplateDataMemoryCacheForTests() {
  memoryCache.clear();
  inflightRefreshes.clear();
}
