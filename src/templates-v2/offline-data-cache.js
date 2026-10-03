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

export function clearTemplateDataMemoryCacheForTests() {
  memoryCache.clear();
}
