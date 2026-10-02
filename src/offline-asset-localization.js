import { isRemoteDownloadSource } from "./android-media-source.js";

const LOCALIZABLE_FIELDS = ["preview","imageUrl","logoUrl"];

export function localizeOfflineAssetFields(item, urlMap = {}) {
  const localized = { ...item };
  LOCALIZABLE_FIELDS.forEach((field) => {
    const source = localized[field];
    if (!source || !urlMap[source]) return;
    if (field === "preview" && isRemoteDownloadSource(source) && !isRemoteDownloadSource(localized.remotePreview)) {
      localized.remotePreview = source;
    }
    localized[field] = urlMap[source];
  });
  return localized;
}
