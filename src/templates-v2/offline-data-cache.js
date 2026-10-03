import { normalizeSportsV2Config } from "./sports-v2/config.js";

const DATA_PREFIX = "totempark.template-data.v1";
const memoryCache = new Map();

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

export function writeTemplateDataCache(context, payload, { source = "remote", now = Date.now(), storage } = {}) {
  if (payload == null) return null;
  const key = buildTemplateDataCacheKey(context);
  const record = { version:1, payload, timestamp:now, source, configVersion:hash(stableSerialize(context?.config)) };
  memoryCache.set(key, record);
  try { storageOrDefault(storage)?.setItem(key, JSON.stringify(record)); } catch { /* Storage pressure must not affect playback. */ }
  return record;
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
}
