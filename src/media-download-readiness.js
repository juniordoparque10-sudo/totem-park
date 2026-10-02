import { isRemoteDownloadSource } from "./android-media-source.js";

export function getPlaylistMediaRemoteUrl(item = {}) {
  return [item.remotePreview,item.preview,item.imageUrl]
    .map((url) => String(url || "").trim())
    .find(isRemoteDownloadSource) || "";
}

function getRemoteMediaAliases(item = {}) {
  return [...new Set([item.remotePreview,item.preview,item.imageUrl]
    .map((url) => String(url || "").trim())
    .filter(isRemoteDownloadSource))];
}

export function getPlaylistMediaCanonicalIdentity(item = {}) {
  const stableId = item.mediaId || item.sourceMediaId || item.id || item.storagePath || item.fileName;
  return String(stableId || getPlaylistMediaRemoteUrl(item)).trim();
}

export function getPlaylistMediaContentVersion(item = {}) {
  return String(item.fileHash || item.contentHash || item.md5Hash || item.etag || item.mediaVersion || item.fileVersion || item.uploadVersion || "").trim();
}

export function getCanonicalPlaylistMediaEntries(items = []) {
  const entries = new Map();
  items.forEach((item) => {
    if (item?.playerItemType === "template" || item?.templateType) return;
    const aliases = getRemoteMediaAliases(item);
    if (aliases.length === 0) return;
    const identity = getPlaylistMediaCanonicalIdentity(item);
    if (!identity) return;
    const current = entries.get(identity) || { identity, contentVersion:getPlaylistMediaContentVersion(item), url:aliases[0], aliases:[], item };
    current.aliases = [...new Set([...current.aliases,...aliases])];
    if (!current.contentVersion) current.contentVersion = getPlaylistMediaContentVersion(item);
    if (isRemoteDownloadSource(item.remotePreview)) current.url = String(item.remotePreview).trim();
    entries.set(identity,current);
  });
  return [...entries.values()];
}

export function getPlaylistMediaPreparation(items = [], offlineAssetMap = {}) {
  const entries = getCanonicalPlaylistMediaEntries(items);
  const pendingUrls = entries.filter((entry) => !offlineAssetMap[`identity:${entry.identity}`] && !entry.aliases.some((url) => offlineAssetMap[url])).map((entry) => entry.url);
  return {
    total:entries.length,
    cached:entries.length - pendingUrls.length,
    pendingUrls,
  };
}

export function getNativeOfflineQueueUrls(assetUrls = [], mediaItems = []) {
  const mediaEntries = getCanonicalPlaylistMediaEntries(mediaItems);
  const mediaAliases = new Set(mediaEntries.flatMap((entry) => entry.aliases));
  return [...new Set([
    ...assetUrls.filter((url) => !mediaAliases.has(url)),
    ...mediaEntries.map((entry) => entry.url),
  ].filter(isRemoteDownloadSource))].sort();
}

export function getUntrackedPendingMediaUrls({ pendingUrls = [], queuedUrls = new Set(), activeUrls = new Set() } = {}) {
  return pendingUrls.filter((url) => !queuedUrls.has(url) && !activeUrls.has(url));
}

export function shouldDeferMediaAdvance({ native = false, item, pendingUrls } = {}) {
  if (!native || !item || item.playerItemType === "template" || item.templateType) return false;
  const url = getPlaylistMediaRemoteUrl(item);
  return Boolean(url && pendingUrls?.has?.(url));
}

export function findNextReadyMediaIndex({ items = [], currentIndex = 0, native = false, pendingUrls = new Set() } = {}) {
  if (items.length === 0) return -1;
  const safeCurrentIndex = currentIndex >= 0 && currentIndex < items.length ? currentIndex : 0;
  for (let offset = 1; offset <= items.length; offset += 1) {
    const candidateIndex = (safeCurrentIndex + offset) % items.length;
    if (!shouldDeferMediaAdvance({ native, item:items[candidateIndex], pendingUrls })) return candidateIndex;
  }
  return -1;
}
