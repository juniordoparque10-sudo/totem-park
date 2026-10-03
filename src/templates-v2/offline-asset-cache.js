const ASSET_CACHE_NAME = "totempark-template-assets-v1";
const inflightRefreshes = new Map();
const resolvedLocalUrls = new Map();

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function isImageAsset(value) {
  return String(value?.type || "").toLowerCase() === "image";
}

function isVisualUrlField(key, value, parentKey) {
  if (/^(logo|image|background|imageUrl|logoUrl|backgroundUrl|mainImageUrl)$/i.test(key)) return true;
  const imageParent = /(logo|image|background|media|asset)/i.test(parentKey);
  return /^(url|publicUrl|preview|remotePreview)$/i.test(key) && (isImageAsset(value) || imageParent);
}

export function collectTemplateAssetUrls(value, found = new Set(), parentKey = "") {
  if (!value) return found;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectTemplateAssetUrls(entry, found, parentKey));
    return found;
  }
  if (typeof value !== "object") return found;
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && isRemoteUrl(entry)) {
      if (isVisualUrlField(key, value, parentKey)) found.add(entry.trim());
    } else if (entry && typeof entry === "object") {
      collectTemplateAssetUrls(entry, found, `${parentKey}.${key}`);
    }
  }
  return found;
}

async function openCache(cacheStorage = globalThis.caches) {
  if (!cacheStorage?.open) return null;
  return cacheStorage.open(ASSET_CACHE_NAME);
}

export async function resolveCachedTemplateAsset(remoteUrl, { cacheStorage = globalThis.caches, createObjectURL = globalThis.URL?.createObjectURL?.bind(globalThis.URL) } = {}) {
  if (!isRemoteUrl(remoteUrl)) return remoteUrl || "";
  if (resolvedLocalUrls.has(remoteUrl)) return resolvedLocalUrls.get(remoteUrl);
  const cache = await openCache(cacheStorage);
  const response = await cache?.match(remoteUrl);
  if (!response?.ok) return "";
  const blob = await response.blob();
  if (!blob?.size || !createObjectURL) return "";
  const localUrl = createObjectURL(blob);
  resolvedLocalUrls.set(remoteUrl, localUrl);
  return localUrl;
}

export async function refreshTemplateAsset(remoteUrl, { cacheStorage = globalThis.caches, fetchImpl = globalThis.fetch } = {}) {
  if (!isRemoteUrl(remoteUrl) || !fetchImpl) return { status:"ignored", remoteUrl };
  if (inflightRefreshes.has(remoteUrl)) return inflightRefreshes.get(remoteUrl);
  const refresh = (async () => {
    const cache = await openCache(cacheStorage);
    if (!cache) return { status:"unsupported", remoteUrl };
    const previous = await cache.match(remoteUrl);
    try {
      const response = await fetchImpl(remoteUrl, { cache:"no-store" });
      if (!response?.ok) throw new Error(`HTTP ${response?.status || 0}`);
      const candidate = response.clone();
      const blob = await candidate.blob();
      if (!blob?.size) throw new Error("Empty template asset");
      await cache.put(remoteUrl, response.clone());
      const oldLocalUrl = resolvedLocalUrls.get(remoteUrl);
      if (oldLocalUrl) {
        try { globalThis.URL?.revokeObjectURL?.(oldLocalUrl); } catch { /* noop */ }
        resolvedLocalUrls.delete(remoteUrl);
      }
      return { status:previous ? "updated" : "stored", remoteUrl, size:blob.size };
    } catch (error) {
      return { status:previous ? "preserved" : "failed", remoteUrl, error };
    }
  })().finally(() => inflightRefreshes.delete(remoteUrl));
  inflightRefreshes.set(remoteUrl, refresh);
  return refresh;
}

function replaceRemoteUrls(value, localByRemote, parentKey = "") {
  if (Array.isArray(value)) return value.map((entry) => replaceRemoteUrls(entry, localByRemote, parentKey));
  if (!value || typeof value !== "object") return value;
  const next = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && isRemoteUrl(entry)) {
      next[key] = isVisualUrlField(key, value, parentKey) ? (localByRemote.get(entry) || "") : entry;
    } else next[key] = replaceRemoteUrls(entry, localByRemote, `${parentKey}.${key}`);
  }
  return next;
}

export function createOfflineSafeTemplate(template) {
  return replaceRemoteUrls(template, new Map());
}

export async function prepareTemplateAssets(template, options = {}) {
  const urls = [...collectTemplateAssetUrls(template)];
  const localByRemote = new Map();
  await Promise.all(urls.map(async (url) => {
    const localUrl = await resolveCachedTemplateAsset(url, options);
    if (localUrl) localByRemote.set(url, localUrl);
  }));
  return { template:replaceRemoteUrls(template, localByRemote), urls, localByRemote, hits:localByRemote.size, misses:urls.length-localByRemote.size };
}

export async function refreshTemplateAssets(template, options = {}) {
  const urls = [...collectTemplateAssetUrls(template)];
  return Promise.all(urls.map((url) => refreshTemplateAsset(url, options)));
}

export function clearTemplateAssetMemoryCacheForTests() {
  resolvedLocalUrls.clear();
  inflightRefreshes.clear();
}
