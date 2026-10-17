import { Capacitor, CapacitorHttp } from "@capacitor/core";

const ASSET_CACHE_NAME = "totempark-template-assets-v1";
const inflightRefreshes = new Map();
const resolvedLocalUrls = new Map();
const retiredLocalUrlsByRemote = new Map();

export const TEMPLATE_ASSET_URL_ONLY_TTL_MS = 60 * 60 * 1000;

const CACHE_IDENTITY_HEADER = "x-totempark-asset-identity";
const CACHE_VALIDATED_AT_HEADER = "x-totempark-asset-validated-at";

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

function getAssetIdentity(asset, remoteUrl) {
  const fileHash = String(asset?.fileHash || asset?.hash || "").trim();
  if (fileHash) return { key:`hash:${fileHash}`, strong:true };
  const mediaId = String(asset?.mediaId || asset?.id || "").trim();
  const assetRevision = String(asset?.revision || asset?.version || "").trim();
  if (mediaId && assetRevision) return { key:`media:${mediaId}:${assetRevision}`, strong:true };
  if (assetRevision) return { key:`revision:${assetRevision}`, strong:true };
  const contentVersion = String(asset?.contentVersion || "").trim();
  if (contentVersion) return { key:`content:${contentVersion}`, strong:true };
  return { key:`url:${remoteUrl}`, strong:false };
}

function collectTemplateAssetDescriptors(value, found = new Map(), parentKey = "") {
  if (!value) return found;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectTemplateAssetDescriptors(entry, found, parentKey));
    return found;
  }
  if (typeof value !== "object") return found;
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && isRemoteUrl(entry) && isVisualUrlField(key, value, parentKey)) {
      const descriptor = { remoteUrl:entry.trim(), ...getAssetIdentity(value, entry.trim()) };
      const previous = found.get(descriptor.remoteUrl);
      if (!previous || (!previous.strong && descriptor.strong)) found.set(descriptor.remoteUrl, descriptor);
    } else if (entry && typeof entry === "object") {
      collectTemplateAssetDescriptors(entry, found, `${parentKey}.${key}`);
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

function getCachedResponseSignature(response) {
  const identity = response?.headers?.get?.(CACHE_IDENTITY_HEADER) || "legacy";
  const validatedAt = response?.headers?.get?.(CACHE_VALIDATED_AT_HEADER) || "0";
  return `${identity}|${validatedAt}`;
}

async function resolveCachedTemplateAssetDetails(remoteUrl, { cacheStorage = globalThis.caches, createObjectURL = globalThis.URL?.createObjectURL?.bind(globalThis.URL) } = {}) {
  if (!isRemoteUrl(remoteUrl)) return remoteUrl || "";
  const cache = await openCache(cacheStorage);
  const response = await cache?.match(remoteUrl);
  if (!response?.ok) return { localUrl:"", retiredLocalUrls:[] };
  const signature = getCachedResponseSignature(response);
  const current = resolvedLocalUrls.get(remoteUrl);
  if (current?.signature === signature) {
    return { localUrl:current.localUrl, retiredLocalUrls:[...(retiredLocalUrlsByRemote.get(remoteUrl) || [])] };
  }
  const blob = await response.blob();
  if (!blob?.size || !createObjectURL) return { localUrl:"", retiredLocalUrls:[] };
  const localUrl = createObjectURL(blob);
  if (current?.localUrl && current.localUrl !== localUrl) {
    const retired = retiredLocalUrlsByRemote.get(remoteUrl) || new Set();
    retired.add(current.localUrl);
    retiredLocalUrlsByRemote.set(remoteUrl, retired);
  }
  resolvedLocalUrls.set(remoteUrl, { localUrl, signature });
  return { localUrl, retiredLocalUrls:[...(retiredLocalUrlsByRemote.get(remoteUrl) || [])] };
}

export async function resolveCachedTemplateAsset(remoteUrl, options = {}) {
  if (!isRemoteUrl(remoteUrl)) return remoteUrl || "";
  return (await resolveCachedTemplateAssetDetails(remoteUrl, options)).localUrl;
}

function isCachedAssetFresh(response, identity, now, ttlMs) {
  if (!response?.ok) return false;
  if (response.headers.get(CACHE_IDENTITY_HEADER) !== identity.key) return false;
  if (identity.strong) return true;
  const validatedAt = Number(response.headers.get(CACHE_VALIDATED_AT_HEADER) || 0);
  return validatedAt > 0 && now - validatedAt < ttlMs;
}

export async function refreshTemplateAsset(remoteUrl, options = {}) {
  const { cacheStorage = globalThis.caches } = options;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (!isRemoteUrl(remoteUrl) || !fetchImpl) return { status:"ignored", remoteUrl };
  if (inflightRefreshes.has(remoteUrl)) {
    const inflight = inflightRefreshes.get(remoteUrl);
    if (!options.cachePolicyEnabled) return inflight;
    return inflight.then(() => refreshTemplateAsset(remoteUrl, options));
  }
  const refresh = (async () => {
    const cache = await openCache(cacheStorage);
    if (!cache) return { status:"unsupported", remoteUrl };
    const previous = await cache.match(remoteUrl);
    const identity = options.assetIdentity || getAssetIdentity(null, remoteUrl);
    const now = Number(options.now ?? Date.now());
    if (options.cachePolicyEnabled && isCachedAssetFresh(previous, identity, now, Number(options.urlOnlyTtlMs) || TEMPLATE_ASSET_URL_ONLY_TTL_MS)) {
      return { status:"fresh", remoteUrl };
    }
    try {
      const response = await fetchTemplateAssetResponse(remoteUrl, { ...options, fetchImpl });
      const { blob, contentType } = await validateTemplateAssetResponse(response, remoteUrl);
      if (options.cachePolicyEnabled) {
        const headers = new Headers(response.headers);
        headers.set(CACHE_IDENTITY_HEADER, identity.key);
        headers.set(CACHE_VALIDATED_AT_HEADER, String(now));
        await cache.put(remoteUrl, new Response(blob, { status:response.status, statusText:response.statusText, headers }));
      } else {
        await cache.put(remoteUrl, response.clone());
      }
      const oldLocalEntry = resolvedLocalUrls.get(remoteUrl);
      if (!options.cachePolicyEnabled && oldLocalEntry?.localUrl) {
        try { (options.revokeObjectURL || globalThis.URL?.revokeObjectURL?.bind(globalThis.URL))?.(oldLocalEntry.localUrl); } catch { /* noop */ }
        resolvedLocalUrls.delete(remoteUrl);
      }
      return { status:previous ? "updated" : "stored", remoteUrl, size:blob.size, contentType };
    } catch (error) {
      return { status:previous ? "preserved" : "failed", remoteUrl, error };
    }
  })().finally(() => inflightRefreshes.delete(remoteUrl));
  inflightRefreshes.set(remoteUrl, refresh);
  return refresh;
}

function replaceRemoteUrls(value, localByRemote, parentKey = "", preserveRemoteOnMiss = false) {
  if (Array.isArray(value)) return value.map((entry) => replaceRemoteUrls(entry, localByRemote, parentKey, preserveRemoteOnMiss));
  if (!value || typeof value !== "object") return value;
  const next = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && isRemoteUrl(entry)) {
      next[key] = isVisualUrlField(key, value, parentKey) ? (localByRemote.get(entry) || (preserveRemoteOnMiss ? entry : "")) : entry;
    } else next[key] = replaceRemoteUrls(entry, localByRemote, `${parentKey}.${key}`, preserveRemoteOnMiss);
  }
  return next;
}

export function createOfflineSafeTemplate(template) {
  return replaceRemoteUrls(template, new Map());
}

export async function prepareTemplateAssets(template, options = {}) {
  const descriptors = [...collectTemplateAssetDescriptors(template).values()];
  const urls = descriptors.map(({ remoteUrl }) => remoteUrl);
  const localByRemote = new Map();
  const retiredLocalUrls = new Set();
  await Promise.all(urls.map(async (url) => {
    const result = await resolveCachedTemplateAssetDetails(url, options);
    if (result.localUrl) localByRemote.set(url, result.localUrl);
    result.retiredLocalUrls.forEach((localUrl) => retiredLocalUrls.add(localUrl));
  }));
  return { template:replaceRemoteUrls(template, localByRemote, "", options.preserveRemoteOnMiss === true), urls, localByRemote, retiredLocalUrls:[...retiredLocalUrls], hits:localByRemote.size, misses:urls.length-localByRemote.size };
}

export async function refreshTemplateAssets(template, options = {}) {
  const descriptors = [...collectTemplateAssetDescriptors(template).values()];
  return Promise.all(descriptors.map(({ remoteUrl, key, strong }) => refreshTemplateAsset(remoteUrl, { ...options, assetIdentity:{ key, strong } })));
}

export function releaseRetiredTemplateAssetUrls(localUrls = [], { revokeObjectURL = globalThis.URL?.revokeObjectURL?.bind(globalThis.URL) } = {}) {
  const released = new Set(localUrls);
  released.forEach((localUrl) => {
    try { revokeObjectURL?.(localUrl); } catch { /* noop */ }
  });
  retiredLocalUrlsByRemote.forEach((urls, remoteUrl) => {
    released.forEach((localUrl) => urls.delete(localUrl));
    if (!urls.size) retiredLocalUrlsByRemote.delete(remoteUrl);
  });
}

export function clearTemplateAssetMemoryCacheForTests() {
  resolvedLocalUrls.clear();
  inflightRefreshes.clear();
  retiredLocalUrlsByRemote.clear();
}
