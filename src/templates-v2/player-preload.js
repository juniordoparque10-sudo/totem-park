const decodedImagePromises = new Map();

export function getTemplateV2CriticalImageUrl(item) {
  const asset = item?.published?.media?.primary;
  if (!asset || asset.type === "video") return "";
  return String(asset.url || asset.preview || asset.publicUrl || "").trim();
}

export function getTemplateV2CriticalImageState(item) {
  const asset = item?.published?.media?.primary;
  const configured = Boolean(asset && asset.type !== "video");
  return { configured, url: configured ? getTemplateV2CriticalImageUrl(item) : "" };
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
    image.onload = async () => {
      try {
        entry.loadedAt = Date.now();
        options.onEvent?.("T4", { cached: false, loadedAt: entry.loadedAt });
        if (typeof image.decode === "function") await image.decode();
        entry.decodedAt = Date.now();
        options.onEvent?.("T5", { cached: false, decodedAt: entry.decodedAt });
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error(`Falha ao preparar imagem V2: ${url}`));
    image.src = url;
  });
  entry.promise = promise;
  decodedImagePromises.set(url, entry);
  promise.catch(() => decodedImagePromises.delete(url));
  return promise;
}

export async function prepareTemplateV2CriticalImage(item, ImageClass = globalThis.Image, options = {}) {
  const state = getTemplateV2CriticalImageState(item);
  if (!state.configured) return { status: "no-background", attempts: 0, url: "" };
  if (!state.url) return { status: "asset-unresolved", attempts: 0, url: "" };

  const maxAttempts = Math.max(1, Number(options.maxAttempts) || 2);
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await preloadImageForPaint(state.url, ImageClass, options);
      return { status: "ready", attempts: attempt, url: state.url };
    } catch (error) {
      lastError = error;
      options.onFailure?.(error, { attempt, maxAttempts, url: state.url });
    }
  }

  return { status: "failed", attempts: maxAttempts, url: state.url, error: lastError };
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
