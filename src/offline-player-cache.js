import { Capacitor } from "@capacitor/core";
import { FileTransfer } from "@capacitor/file-transfer";
import { Directory, Filesystem } from "@capacitor/filesystem";
import {
  finishFileTransfer,
  recordCacheResult,
  recordLabEvent,
  recordMediaResolve,
  startFileTransfer,
} from "./android-diagnostics";
import {
  ANDROID_DOWNLOAD_POLICY,
  createProgressReporter,
  isNativeTimeout,
  runSingleFlightDownload,
  shouldRetryDownload,
  validateDownloadedFile,
} from "./android-download-policy";

const MEDIA_CACHE_NAME = "totempark-player-media-v1";
const MEDIA_CACHE_META_KEY = "totempark-player-media-cache-meta";
const CACHE_URL_PREFIX = "https://totempark.local/cache/";

function hashUrl(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function getMetaStore() {
  if (typeof localStorage === "undefined") return {};
  return safeJsonParse(localStorage.getItem(MEDIA_CACHE_META_KEY), {});
}

function saveMetaStore(meta) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(MEDIA_CACHE_META_KEY, JSON.stringify(meta));
}

function getTimestampVersion(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value.seconds) return `${value.seconds}-${value.nanoseconds || 0}`;
  if (value.toMillis) return String(value.toMillis());
  return "";
}

function getMediaRemoteUrl(item = {}) {
  return item.remotePreview || item.preview || item.imageUrl || "";
}

function getMediaStableId(item = {}, remoteUrl = "") {
  return (
    item.mediaId ||
    item.sourceMediaId ||
    item.id ||
    item.storagePath ||
    item.fileName ||
    hashUrl(remoteUrl)
  );
}

function getMediaFileVersion(item = {}) {
  return (
    item.fileHash ||
    item.contentHash ||
    item.md5Hash ||
    item.etag ||
    item.mediaVersion ||
    item.fileVersion ||
    item.uploadVersion ||
    ""
  );
}

export function buildMediaCacheManifest(clientId, items = []) {
  const entries = [];
  const seen = new Set();

  items.filter(isCacheableMediaItem).forEach((item, index) => {
    const remoteUrl = getMediaRemoteUrl(item);
    const fileVersion = getMediaFileVersion(item);
    const key = getMediaCacheKey(clientId, item);

    if (seen.has(key)) return;
    seen.add(key);

    entries.push({
      key,
      index,
      id: getMediaStableId(item, remoteUrl),
      mediaId: item.mediaId || item.sourceMediaId || item.id || "",
      remoteUrl,
      storagePath: item.storagePath || "",
      fileName: item.fileName || "",
      sizeBytes: Number(item.sizeBytes || 0),
      fileVersion,
      type: item.type || "",
    });
  });

  const manifestKey = hashUrl(
    entries
      .map((entry) => [
        entry.key,
        entry.remoteUrl,
        entry.storagePath,
        entry.sizeBytes,
        entry.fileVersion,
      ].join(":"))
      .join("|")
  );

  return {
    version: 1,
    clientId: clientId || "",
    manifestKey,
    totalItems: entries.length,
    totalSizeBytes: entries.reduce((total, entry) => total + Number(entry.sizeBytes || 0), 0),
    entries,
  };
}

export function isCacheableMediaItem(item = {}) {
  const url = getMediaRemoteUrl(item);
  const type = String(item.type || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (!/^https?:\/\//i.test(url)) return false;
  if (item.playerItemType === "template" || item.templateType) return false;

  return type.includes("video") || type.includes("imagem") || Boolean(item.preview);
}

export function getMediaCacheKey(clientId, item = {}) {
  const url = getMediaRemoteUrl(item);
  const fileVersion = getMediaFileVersion(item);
  const hasStableFileIdentity = Boolean(
    item.storagePath ||
    item.fileName ||
    item.sizeBytes ||
    fileVersion ||
    url
  );
  const versionParts = [
    clientId || "client",
    getMediaStableId(item, url),
    item.storagePath || "",
    fileVersion || (hasStableFileIdentity ? "" : getTimestampVersion(item.updatedAt)),
    item.sizeBytes || "",
    url,
  ];

  return hashUrl(versionParts.join("|"));
}

function getCacheRequest(key) {
  return new Request(`${CACHE_URL_PREFIX}${key}`);
}

async function openMediaCache() {
  if (typeof caches === "undefined") return null;
  return caches.open(MEDIA_CACHE_NAME);
}

async function responseToObjectUrl(response) {
  const blob = await response.blob();
  return {
    url: URL.createObjectURL(blob),
    sizeBytes: blob.size || 0,
  };
}

export async function getCachedMediaUrl(clientId, item = {}) {
  if (!isCacheableMediaItem(item)) {
    return {
      url: getMediaRemoteUrl(item),
      source: "remote",
      key: "",
      sizeBytes: Number(item.sizeBytes || 0),
    };
  }

  const key = getMediaCacheKey(clientId, item);
  const cache = await openMediaCache();

  if (!cache) {
    return {
      url: getMediaRemoteUrl(item),
      source: "remote",
      key,
      sizeBytes: Number(item.sizeBytes || 0),
    };
  }

  const response = await cache.match(getCacheRequest(key));

  if (!response) {
    return {
      url: getMediaRemoteUrl(item),
      source: "remote",
      key,
      sizeBytes: Number(item.sizeBytes || 0),
    };
  }

  const objectUrl = await responseToObjectUrl(response);

  return {
    ...objectUrl,
    source: "cache",
    key,
  };
}

async function cacheSingleMedia(clientId, item = {}) {
  const remoteUrl = getMediaRemoteUrl(item);
  const key = getMediaCacheKey(clientId, item);
  const cache = await openMediaCache();

  if (!cache) {
    return {
      key,
      remoteUrl,
      status: "unsupported",
      sizeBytes: Number(item.sizeBytes || 0),
    };
  }

  const request = getCacheRequest(key);
  const existing = await cache.match(request);

  if (existing) {
    const cached = await responseToObjectUrl(existing.clone());
    const meta = getMetaStore();
    meta[key] = {
      ...(meta[key] || {}),
      key,
      remoteUrl,
      clientId,
      lastUsedAt: Date.now(),
      sizeBytes: cached.sizeBytes || meta[key]?.sizeBytes || Number(item.sizeBytes || 0),
    };
    saveMetaStore(meta);

    return {
      ...cached,
      key,
      remoteUrl,
      status: "hit",
      source: "cache",
    };
  }

  const response = await fetch(remoteUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  await cache.put(request, response.clone());

  const cached = await responseToObjectUrl(response);
  const meta = getMetaStore();
  meta[key] = {
    key,
    remoteUrl,
    clientId,
    storagePath: item.storagePath || "",
    updatedAt: getTimestampVersion(item.updatedAt),
    sizeBytes: cached.sizeBytes || Number(item.sizeBytes || 0),
    cachedAt: Date.now(),
    lastUsedAt: Date.now(),
  };
  saveMetaStore(meta);

  return {
    ...cached,
    key,
    remoteUrl,
    status: "miss",
    source: "cache",
  };
}

export async function cachePlaylistMedia({
  clientId,
  items = [],
  currentIndex = 0,
  concurrency = 1,
  onProgress,
} = {}) {
  const manifest = buildMediaCacheManifest(clientId, items);
  const unique = new Map();

  items.filter(isCacheableMediaItem).forEach((item, index) => {
    const key = getMediaCacheKey(clientId, item);
    if (!unique.has(key)) unique.set(key, { item, index });
  });

  const ordered = [...unique.values()].sort((a, b) => {
    if (a.index === currentIndex) return -1;
    if (b.index === currentIndex) return 1;
    if (a.index === currentIndex + 1) return -1;
    if (b.index === currentIndex + 1) return 1;
    return a.index - b.index;
  });
  const results = {};
  const failures = [];
  let completed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < ordered.length) {
      const entry = ordered[cursor];
      cursor += 1;

      try {
        const result = await cacheSingleMedia(clientId, entry.item);
        results[result.key] = result;
      } catch (error) {
        failures.push({
          key: getMediaCacheKey(clientId, entry.item),
          url: getMediaRemoteUrl(entry.item),
          message: error?.message || "Falha ao baixar",
        });
      } finally {
        completed += 1;
        onProgress?.({
          completed,
          total: ordered.length,
          failed: failures.length,
          downloaded: Object.values(results).filter((result) => result.status === "miss").length,
          results,
          failures,
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, ordered.length || 1)) }, worker)
  );

  return {
    manifest,
    total: ordered.length,
    cached: Object.values(results).filter((result) => result.source === "cache").length,
    failed: failures.length,
    downloaded: Object.values(results).filter((result) => result.status === "miss").length,
    downloadedBytes: Object.values(results).reduce(
      (total, result) => total + (result.status === "miss" ? Number(result.sizeBytes || 0) : 0),
      0
    ),
    results,
    failures,
  };
}

export async function removeUnusedCachedMedia(keepKeys = [], protectedKeys = []) {
  // Web keys/metadata do not track screen or playlist ownership. Absence from
  // this playlist cannot prove that another screen no longer needs an entry.
  // Retain existing entries until scoped ownership can be established safely.
  if (!Capacitor.isNativePlatform()) return { removed: 0, sizeBytes: 0 };

  const cache = await openMediaCache();
  if (!cache) return { removed: 0, sizeBytes: 0 };

  const keep = new Set([...keepKeys, ...protectedKeys].filter(Boolean));
  const meta = getMetaStore();
  const requests = await cache.keys();
  let removed = 0;
  let sizeBytes = 0;

  for (const request of requests) {
    const key = request.url.replace(CACHE_URL_PREFIX, "");
    if (keep.has(key)) continue;

    sizeBytes += Number(meta[key]?.sizeBytes || 0);
    await cache.delete(request);
    delete meta[key];
    removed += 1;
  }

  saveMetaStore(meta);
  return { removed, sizeBytes };
}

export async function clearScreenMediaCache(clientId) {
  const cache = await openMediaCache();
  if (!cache) return { removed: 0, sizeBytes: 0 };

  const meta = getMetaStore();
  const requests = await cache.keys();
  let removed = 0;
  let sizeBytes = 0;

  for (const request of requests) {
    const key = request.url.replace(CACHE_URL_PREFIX, "");
    if (meta[key]?.clientId !== clientId) continue;

    sizeBytes += Number(meta[key]?.sizeBytes || 0);
    await cache.delete(request);
    delete meta[key];
    removed += 1;
  }

  saveMetaStore(meta);
  return { removed, sizeBytes };
}

export function getMediaCacheStats(clientId) {
  const meta = getMetaStore();
  const entries = Object.values(meta).filter((entry) => !clientId || entry.clientId === clientId);
  const cacheSizeBytes = entries.reduce((total, entry) => total + Number(entry.sizeBytes || 0), 0);

  return {
    items: entries.length,
    cacheSizeBytes,
    updatedAt: entries.reduce((latest, entry) => Math.max(latest, Number(entry.cachedAt || 0), Number(entry.lastUsedAt || 0)), 0),
  };
}

function getFileExtension(url) {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match ? match[1].toLowerCase() : "bin";
  } catch {
    return "bin";
  }
}

function getAssetPath(scope, url) {
  return `totem-park/offline/${scope}/${hashUrl(url)}.${getFileExtension(url)}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function statOfflineFile(path) {
  return Filesystem.stat({ path, directory: Directory.Data }).catch(() => null);
}

async function downloadOfflineFile({ url, path, destinationUri, diagnostic, policy }) {
  return runSingleFlightDownload(`${path}|${url}`, async () => {
    let attempt = 0;

    while (attempt <= policy.maxRetriesWithoutProgress) {
      attempt += 1;
      const downloadId = startFileTransfer({ ...diagnostic, localPath: destinationUri, attempt });
      const startedAt = Date.now();
      let transferredBytes = 0;
      const reportProgress = createProgressReporter({
        diagnostic: { ...diagnostic, downloadId, attempt },
        onEvent: recordLabEvent,
      });
      const progressHandle = await FileTransfer.addListener("progress", (event) => {
        if (event.type === "download" && event.url === url) {
          transferredBytes = Math.max(transferredBytes, Number(event.bytes || 0));
          reportProgress(event);
        }
      });

      try {
        await FileTransfer.downloadFile({
          url,
          path: destinationUri,
          progress: true,
          connectTimeout: policy.connectTimeoutMs,
          readTimeout: policy.inactivityTimeoutMs,
        });
        const fileInfo = await statOfflineFile(path);
        const validation = validateDownloadedFile(fileInfo?.size, diagnostic.sizeBytes);
        if (!validation.valid) {
          throw new Error(`Arquivo baixado inválido: ${validation.reason} (${validation.actual}/${validation.expected})`);
        }
        finishFileTransfer(downloadId, "complete", {
          ...diagnostic,
          localPath: fileInfo.uri,
          expectedSizeBytes: validation.expected,
          finalFileSizeBytes: validation.actual,
          durationMs: Date.now() - startedAt,
        });
        return { ...fileInfo, transferredBytes, downloadOperationId: downloadId };
      } catch (downloadError) {
        const partial = await statOfflineFile(path);
        const partialSize = Number(partial?.size || 0);
        const timeout = isNativeTimeout(downloadError);
        recordLabEvent("FILETRANSFER_PARTIAL_FILE_SIZE", { ...diagnostic, downloadId, attempt, partialFileSize: partialSize });
        if (timeout) recordLabEvent("FILETRANSFER_STALLED", { ...diagnostic, downloadId, attempt, partialFileSize: partialSize });
        finishFileTransfer(downloadId, timeout ? "timeout" : "failed", {
          ...diagnostic,
          durationMs: Date.now() - startedAt,
          message: downloadError?.message || "Falha ao baixar",
          partialFileExists: Boolean(partial),
          partialFileSize: partialSize,
          downloadStillRunning: false,
        });

        const retry = shouldRetryDownload({ error: downloadError, partialSize, attempt, policy });
        if (!retry) throw downloadError;
        recordLabEvent("FILETRANSFER_RETRY", { ...diagnostic, downloadId, attempt: attempt + 1, backoffMs: policy.retryBackoffMs });
        await sleep(policy.retryBackoffMs);
      } finally {
        await progressHandle.remove();
      }
    }

    throw new Error("Falha ao baixar mídia offline");
  });
}

export function restoreOfflineAssetMap(storageKey) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");

    return Object.fromEntries(
      Object.entries(stored).map(([remoteUrl, fileUri]) => [
        remoteUrl,
        Capacitor.convertFileSrc(fileUri),
      ])
    );
  } catch {
    return {};
  }
}

export async function cacheOfflineAssets(urls, scope, storageKey, options = {}) {
  const uniqueUrls = [...new Set(urls.filter((url) => /^https?:\/\//i.test(url || "")))];
  const keepUrls = new Set(uniqueUrls);
  const policy = { ...ANDROID_DOWNLOAD_POLICY, ...(options.downloadPolicy || {}) };
  let rawMap;
  let failed = 0;
  let downloaded = 0;
  let downloadedBytes = 0;
  let removed = 0;
  let completed = 0;
  const sizeByUrl = {};

  try {
    rawMap = JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    rawMap = {};
  }

  await Filesystem.mkdir({
    path: `totem-park/offline/${scope}`,
    directory: Directory.Data,
    recursive: true,
  }).catch(() => {});

  for (const url of uniqueUrls) {
    const path = getAssetPath(scope, url);
    const playlistMedia = options.mediaByUrl?.[url] || null;
    const diagnostic = { ...(playlistMedia || {}), remoteUrl: url, localPath: path };
    recordMediaResolve(diagnostic);

    try {
      let fileInfo;

      try {
        fileInfo = await Filesystem.stat({ path, directory: Directory.Data });
        const validation = validateDownloadedFile(fileInfo.size, diagnostic.sizeBytes);
        if (!validation.valid) throw new Error(`Cache local inválido: ${validation.reason}`);
        recordCacheResult(true, { ...diagnostic, sizeBytes: validation.actual });
      } catch {
        recordCacheResult(false, diagnostic);
        const destination = await Filesystem.getUri({
          path,
          directory: Directory.Data,
        });

        fileInfo = await downloadOfflineFile({ url, path, destinationUri: destination.uri, diagnostic, policy });
        downloaded += 1;
        const transferredBytes = Number(fileInfo.transferredBytes || 0);
        downloadedBytes += transferredBytes;
        if (playlistMedia) {
          options.onDownloadComplete?.({
            operationId: fileInfo.downloadOperationId,
            bytes: transferredBytes,
            remoteUrl: url,
            classification: "playlistMedia",
            status: "complete",
          });
        }
      }

      rawMap[url] = fileInfo.uri;
      sizeByUrl[url] = Number(fileInfo.size || 0);
    } catch (error) {
      await Filesystem.deleteFile({ path, directory: Directory.Data }).catch(() => {});
      delete rawMap[url];
      failed += 1;
      console.log("Falha ao baixar midia para uso offline:", url, error);
      recordLabEvent("CACHE_ERROR", { ...diagnostic, message: error?.message || "Falha no cache" });
    } finally {
      completed += 1;
      options.onProgress?.({
        completed,
        total: uniqueUrls.length,
        failed,
        downloaded,
        downloadedBytes,
        removed,
      });
    }
  }

  if (options.purgeUnused !== false) {
    for (const cachedUrl of Object.keys(rawMap)) {
      if (keepUrls.has(cachedUrl)) continue;

      await Filesystem.deleteFile({
        path: getAssetPath(scope, cachedUrl),
        directory: Directory.Data,
      }).catch(() => {});

      delete rawMap[cachedUrl];
      removed += 1;
    }
  }

  localStorage.setItem(storageKey, JSON.stringify(rawMap));

  return {
    failed,
    downloaded,
    downloadedBytes,
    removed,
    sizeByUrl,
    total: uniqueUrls.length,
    urlMap: Object.fromEntries(
      Object.entries(rawMap).map(([remoteUrl, fileUri]) => [
        remoteUrl,
        Capacitor.convertFileSrc(fileUri),
      ])
    ),
  };
}
