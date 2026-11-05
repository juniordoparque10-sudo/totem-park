import { prepareTemplateAssets } from "./offline-asset-cache.js";
import { prepareTemplateV2CriticalImage } from "./player-preload.js";

export async function prepareTemplateV2CriticalImageFromCache(item, ImageClass = globalThis.Image, options = {}) {
  const { assetOptions = {}, ...preloadOptions } = options;
  const prepared = await prepareTemplateAssets(item, {
    ...assetOptions,
    preserveRemoteOnMiss:true,
  });
  const result = await prepareTemplateV2CriticalImage(prepared.template, ImageClass, preloadOptions);
  return {
    ...result,
    template:prepared.template,
    assetCache:{ hits:prepared.hits, misses:prepared.misses },
  };
}
