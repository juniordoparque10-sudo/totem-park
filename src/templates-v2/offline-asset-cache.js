import { Capacitor, CapacitorHttp } from "@capacitor/core";

const ASSET_CACHE_NAME = "totempark-template-assets-v1";
const inflightRefreshes = new Map();
const resolvedLocalUrls = new Map();

const IMAGE_CONTENT_TYPES_BY_EXTENSION = {
  avif:"image/avif",
  bmp:"image/bmp",
  gif:"image/gif",
  jpeg:"image/jpeg",
  jpg:"image/jpeg",
  png:"image/png",
  svg:"image/svg+xml",
  webp:"image/webp",
};

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

function maskRemoteUrl(remoteUrl) {
  try {
    const value = new URL(remoteUrl);
    if (value.search) value.search = "?masked";
    if (value.hash) value.hash = "#masked";
    return value.toString();
  } catch {
    return String(remoteUrl || "").split("?")[0].split("#")[0];
  }
}

function logNativeFetch(event, details, logImpl = import.meta.env?.DEV ? console.debug : null) {
  logImpl?.(event, { ...details, url:maskRemoteUrl(details.url) });
}

function readHeader(headers, name) {
  const expected = String(name).toLowerCase();
  const entry = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === expected);
  return String(entry?.[1] || "").split(";")[0].trim().toLowerCase();
}

function inferImageContentType(remoteUrl) {
  try {
    const extension = new URL(remoteUrl).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
    return IMAGE_CONTENT_TYPES_BY_EXTENSION[extension] || "";
  } catch {
    return "";
  }
}

function decodeBase64Bytes(value, atobImpl = globalThis.atob?.bind(globalThis)) {
  const encoded = String(value || "").replace(/^data:[^,]*;base64,/i, "").replace(/\s/g, "");
  if (!encoded || !atobImpl) throw new Error("Empty native template asset");
  const binary = atobImpl(encoded);
  if (!binary.length) throw new Error("Empty native template asset");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function assertImageContent(contentType) {
  if (!/^image\//i.test(contentType)) throw new Error(`Invalid template asset content-type: ${contentType || "missing"}`);
}

async function validateTemplateAssetResponse(response, remoteUrl) {
  if (!response || response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response?.status || 0}`);
  }
  const contentType = readHeader(Object.fromEntries(response.headers?.entries?.() || []), "content-type") || inferImageContentType(remoteUrl);
  assertImageContent(contentType);
  const blob = await response.clone().blob();
  if (!blob?.size) throw new Error("Empty template asset");
  return { blob, contentType };
}

export async function fetchTemplateAssetResponse(remoteUrl, {
  fetchImpl = globalThis.fetch,
  capacitor = Capacitor,
  capacitorHttp = CapacitorHttp,
  atobImpl = globalThis.atob?.bind(globalThis),
  logImpl = import.meta.env?.DEV ? console.debug : null,
} = {}) {
  if (!capacitor?.isNativePlatform?.()) return fetchImpl(remoteUrl, { cache:"no-store" });

  logNativeFetch("TEMPLATE_NATIVE_FETCH_STARTED", { url:remoteUrl }, logImpl);
  try {
    const nativeResponse = await capacitorHttp.get({ url:remoteUrl, responseType:"blob" });
    if (nativeResponse?.status < 200 || nativeResponse?.status >= 300) {
      throw new Error(`HTTP ${nativeResponse?.status || 0}`);
    }
    const bytes = decodeBase64Bytes(nativeResponse?.data, atobImpl);
    const contentType = readHeader(nativeResponse?.headers, "content-type") || inferImageContentType(remoteUrl);
    assertImageContent(contentType);
    const response = new Response(bytes, { status:nativeResponse.status, headers:{ "Content-Type":contentType } });
    logNativeFetch("TEMPLATE_NATIVE_FETCH_COMPLETED", { url:remoteUrl, bytes:bytes.byteLength, contentType }, logImpl);
    return response;
  } catch (error) {
    logNativeFetch("TEMPLATE_NATIVE_FETCH_FAILED", { url:remoteUrl, bytes:0, contentType:"" }, logImpl);
    throw error;
  }
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

export async function refreshTemplateAsset(remoteUrl, options = {}) {
  const { cacheStorage = globalThis.caches } = options;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (!isRemoteUrl(remoteUrl) || !fetchImpl) return { status:"ignored", remoteUrl };
  if (inflightRefreshes.has(remoteUrl)) return inflightRefreshes.get(remoteUrl);
  const refresh = (async () => {
    const cache = await openCache(cacheStorage);
    if (!cache) return { status:"unsupported", remoteUrl };
    const previous = await cache.match(remoteUrl);
    try {
      const response = await fetchTemplateAssetResponse(remoteUrl, { ...options, fetchImpl });
      const { blob } = await validateTemplateAssetResponse(response, remoteUrl);
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
