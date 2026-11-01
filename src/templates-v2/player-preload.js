import { getMarketPreloadImageUrls } from "./market-premium/config.js";

const decodedImagePromises = new Map();
const failedImageCooldowns = new Map();
const DEFAULT_IMAGE_FAILURE_COOLDOWN_MS = 5 * 60 * 1000;

export function markTemplateV2BackgroundForOnlineRetry(retryKeys, key, online = globalThis.navigator?.onLine !== false) {
  if (!retryKeys || !key || online) return false;
  retryKeys.add(key);
  return true;
}

export function takeTemplateV2BackgroundOnlineRetries(retryKeys) {
  if (!retryKeys?.size) return [];
  const keys = [...retryKeys];
  retryKeys.clear();
  return keys;
}

export function clearTemplateV2BackgroundOnlineRetry(retryKeys, key) {
  retryKeys?.delete?.(key);
}

export function getTemplateV2ImageAssetUrl(asset) {
  if (!asset) return "";
  return String(asset.url || asset.preview || asset.publicUrl || asset.remotePreview || asset.imageUrl || "").trim();
}

export function getTemplateV2CriticalImageUrl(item) {
  const asset = item?.published?.media?.primary;
  return asset?.type === "video" ? "" : getTemplateV2ImageAssetUrl(asset);
}

export function getTemplateV2EssentialImageUrls(item) {
  const urls = new Set();
  const background = getTemplateV2CriticalImageUrl(item);
  if (background) urls.add(background);
  const type = item?.identity?.templateType || item?.templateType || item?.type || "";
  if (type === "market-premium") {
    getMarketPreloadImageUrls(item?.published?.market, {
      secondarySlots:item?.published?.display?.defaultOrientation === "Retrato" ? 4 : 6,
      frameCount:2,
    }).forEach((url) => urls.add(url));
  }
  return [...urls];
}

export function getTemplateV2CriticalImageState(item) {
  if (item?.templatePublishedResolved === false) {
    return { status: "pending-hydration", configured: false, url: "" };
  }
  const asset = item?.published?.media?.primary;
  const configured = Boolean(asset && asset.type !== "video");
  return { status: configured ? "configured" : "no-background", configured, url: configured ? getTemplateV2CriticalImageUrl(item) : "" };
}

export function getTemplateV2ReadinessFingerprint(item) {
  const state = getTemplateV2CriticalImageState(item);
  const asset = item?.published?.media?.primary;
  return [
    item?.templateId || item?.sourceTemplateId || item?.id || "",
    item?.templateRevision || item?.published?.revision || "",
    state.status,
    asset?.type || "none",
    asset?.mediaId || asset?.id || asset?.fileHash || "",
    state.url,
  ].join("|");
}

export function localizeTemplateV2Assets(item, urlMap = {}) {
  if (!item?.published?.media?.primary) return item;
  const primary = item.published.media.primary;
  const remoteUrl = primary.url || primary.preview || primary.publicUrl || "";
  const localUrl = urlMap[remoteUrl];
  if (!localUrl) return item;
  return {
    ...item,
    published: {
      ...item.published,
      media: {
        ...item.published.media,
        primary: { ...primary, remoteUrl, url: localUrl, preview: localUrl, publicUrl: localUrl },
      },
    },
  };
}

export function preloadImageForPaint(url, ImageClass = globalThis.Image, options = {}) {
  if (!url || typeof ImageClass !== "function") return Promise.resolve();
  const cached = decodedImagePromises.get(url);
  if (cached) {
    return cached.promise.then(() => {
      options.onEvent?.("T4", { cached: true, loadedAt: cached.loadedAt });
      options.onEvent?.("T5", { cached: true, decodedAt: cached.decodedAt });
    });
  }
  const entry = { promise: null, loadedAt: 0, decodedAt: 0 };
  const promise = new Promise((resolve, reject) => {
    const image = new ImageClass();
    const timeoutMs = Math.max(0, Number(options.timeoutMs) || 0);
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
      callback(value);
    };
    const timeoutId = timeoutMs > 0 ? setTimeout(() => {
      finish(reject, new Error(`Tempo limite ao preparar imagem V2: ${url}`));
    }, timeoutMs) : null;
    image.onload = async () => {
      try {
        entry.loadedAt = Date.now();
        options.onEvent?.("T4", { cached: false, loadedAt: entry.loadedAt });
        if (typeof image.decode === "function") await image.decode();
        entry.decodedAt = Date.now();
        options.onEvent?.("T5", { cached: false, decodedAt: entry.decodedAt });
        finish(resolve);
      } catch (error) {
        finish(reject, error);
      }
    };
    image.onerror = () => finish(reject, new Error(`Falha ao preparar imagem V2: ${url}`));
    image.src = url;
  });
  entry.promise = promise;
  decodedImagePromises.set(url, entry);
  promise.catch(() => decodedImagePromises.delete(url));
  return promise;
}

export async function prepareTemplateV2CriticalImage(item, ImageClass = globalThis.Image, options = {}) {
  const state = getTemplateV2CriticalImageState(item);
  const essentialUrls = getTemplateV2EssentialImageUrls(item);
  if (state.status === "pending-hydration") return { status: "pending-hydration", attempts: 0, url: "" };
  if (!state.configured && !essentialUrls.length) return { status: "no-background", attempts: 0, url: "" };
  if (state.configured && !state.url) return { status: "asset-unresolved", attempts: 0, url: "" };

  const now = typeof options.now === "function" ? options.now : Date.now;
  const currentTime = now();
  const coolingUrl = essentialUrls.find((url) => Number(failedImageCooldowns.get(url) || 0) > currentTime);
  if (coolingUrl) {
    return {
      status: "cooldown",
      attempts: 0,
      url: state.url || essentialUrls[0],
      urls:essentialUrls,
      retryAt:failedImageCooldowns.get(coolingUrl),
    };
  }

  const maxAttempts = Math.max(1, Number(options.maxAttempts) || 2);
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await Promise.all(essentialUrls.map((url) => preloadImageForPaint(url, ImageClass, options)));
      essentialUrls.forEach((url) => failedImageCooldowns.delete(url));
      return { status: "ready", attempts: attempt, url: state.url || essentialUrls[0], urls:essentialUrls };
    } catch (error) {
      lastError = error;
      options.onFailure?.(error, { attempt, maxAttempts, url: state.url || essentialUrls[0] });
    }
  }

  const failureCooldownMs = Math.max(1, Number(options.failureCooldownMs) || DEFAULT_IMAGE_FAILURE_COOLDOWN_MS);
  const retryAt = now() + failureCooldownMs;
  essentialUrls.forEach((url) => failedImageCooldowns.set(url, retryAt));
  return { status: "failed", attempts: maxAttempts, url: state.url || essentialUrls[0], urls:essentialUrls, error: lastError };
}

export function suppressTemplateV2CriticalImage(item) {
  if (!item?.published?.media) return item;
  return {
    ...item,
    published: {
      ...item.published,
      media: { ...item.published.media, primary: null },
    },
  };
}
