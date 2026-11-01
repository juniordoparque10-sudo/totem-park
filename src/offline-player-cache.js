import { Capacitor } from "@capacitor/core";
import { FileTransfer } from "@capacitor/file-transfer";
import { Directory, Filesystem } from "@capacitor/filesystem";
import {
  finishFileTransfer,
  recordCacheResult,
  recordLabEvent,
  recordMediaResolve,
  startFileTransfer,
} from "./android-diagnostics.js";
import {
  ANDROID_DOWNLOAD_POLICY,
  createProgressReporter,
  isNativeTimeout,
  runSingleFlightDownload,
  shouldRetryDownload,
  validateDownloadedFile,
} from "./android-download-policy.js";
import { getPlaylistMediaCanonicalIdentity, getPlaylistMediaContentVersion } from "./media-download-readiness.js";
import { buildNativeIdentityRecord, classifyLegacyIdentityRecord, getNativeIdentityCacheStorageKey, getNativeIdentityDownloadKey, resolveNativeIdentityRecord } from "./native-cache-identity.js";
import { isRemoteDownloadSource } from "./android-media-source.js";
import { getNativeCacheJournalEntry, updateNativeCacheJournal } from "./native-cache-journal.js";
import { promoteNativeCachePartial } from "./native-cache-transaction.js";
import { getCacheFailureCode } from "./cache-failure-diagnostics.js";

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
  return getPlaylistMediaCanonicalIdentity(item) || hashUrl(remoteUrl);
}

function getMediaFileVersion(item = {}) {
  return getPlaylistMediaContentVersion(item);
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
  const versionParts = [
    clientId || "client",
    getMediaStableId(item, url),
    item.storagePath || "",
    fileVersion,
    item.sizeBytes || "",
  ];

  return hashUrl(versionParts.join("|"));
}

function getCacheRequest(key) {
  return new Request(`${CACHE_URL_PREFIX}${key}`);
}

function shouldBypassWebMediaCache(remoteUrl) {
  if (Capacitor.isNativePlatform()) return false;

  const webOrigin = String(globalThis.location?.origin || "").trim();
  if (!webOrigin) return false;

  try {
    return new URL(remoteUrl, webOrigin).origin !== webOrigin;
  } catch {
    return false;
  }
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

  if (shouldBypassWebMediaCache(remoteUrl)) {
    return {
      key,
      remoteUrl,
      status: "remote-bypass",
      source: "remote",
      sizeBytes: Number(item.sizeBytes || 0),
    };
  }

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
  let bypassed = 0;
  let completed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < ordered.length) {
      const entry = ordered[cursor];
      cursor += 1;

      try {
        const result = await cacheSingleMedia(clientId, entry.item);
        if (result.status === "remote-bypass") bypassed += 1;
        else results[result.key] = result;
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
    bypassed,
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

export function getAssetPath(scope, url) {
  return `totem-park/offline/${scope}/${hashUrl(url)}.${getFileExtension(url)}`;
}

export function getIdentityAssetPath(scope, cacheIdentity, contentVersion, url) {
  return `totem-park/offline/${scope}/${hashUrl(getNativeIdentityDownloadKey(cacheIdentity,contentVersion))}.${getFileExtension(url)}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function statOfflineFile(path) {
  return Filesystem.stat({ path, directory: Directory.Data }).catch(() => null);
}

function createCacheOperationId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}

export function getPartialAssetPath(finalPath, operationId) {
  return `${finalPath.replace(/\.[^/.]+$/,"")}.${operationId}.partial`;
}

async function downloadOfflineFile({ url, tempPath, destinationUri, diagnostic, policy, downloadKey = `${tempPath}|${url}`, onTransferStart, onDownloaded, onValidated }) {
  if (!isRemoteDownloadSource(url)) throw new Error("LOCAL_SOURCE_NOT_DOWNLOADABLE");
  return runSingleFlightDownload(downloadKey, async () => {
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
        onTransferStart?.({ downloadId, attempt });
        await FileTransfer.downloadFile({
          url,
          path: destinationUri,
          progress: true,
          connectTimeout: policy.connectTimeoutMs,
          readTimeout: policy.inactivityTimeoutMs,
        });
        await onDownloaded?.({ downloadId, attempt, transferredBytes });
        const fileInfo = await statOfflineFile(tempPath);
        const validation = validateDownloadedFile(fileInfo?.size, diagnostic.sizeBytes);
        if (!validation.valid) {
          throw new Error(`Arquivo baixado inválido: ${validation.reason} (${validation.actual}/${validation.expected})`);
        }
        await onValidated?.({ downloadId, attempt, transferredBytes, fileInfo, validation });
        finishFileTransfer(downloadId, "complete", {
          ...diagnostic,
          localPath: fileInfo.uri,
          expectedSizeBytes: validation.expected,
          finalFileSizeBytes: validation.actual,
          durationMs: Date.now() - startedAt,
        });
        return { ...fileInfo, transferredBytes, downloadOperationId: downloadId };
      } catch (downloadError) {
        const partial = await statOfflineFile(tempPath);
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

async function promoteValidatedPartial({ tempPath, finalPath, expectedSizeBytes = 0 }) {
  const result = await promoteNativeCachePartial({
    tempPath,
    finalPath,
    expectedSizeBytes,
    statFile:statOfflineFile,
    deleteFile:(path) => Filesystem.deleteFile({ path, directory:Directory.Data }).catch(() => {}),
    renameFile:(from,to) => Filesystem.rename({ from, to, directory:Directory.Data, toDirectory:Directory.Data }),
    validateFile:validateDownloadedFile,
  });
  return result.fileInfo;
}

export function restoreOfflineAssetMap(storageKey) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
    const restored = Object.fromEntries(
      Object.entries(stored).map(([remoteUrl, fileUri]) => [
        remoteUrl,
        Capacitor.convertFileSrc(fileUri),
      ])
    );
    const identityRecords = JSON.parse(localStorage.getItem(getNativeIdentityCacheStorageKey(storageKey)) || "{}");
    Object.values(identityRecords).forEach((record) => {
      if (!record?.cacheIdentity || !record?.localUri) return;
      const converted = Capacitor.convertFileSrc(record.localUri);
      restored[`identity:${record.cacheIdentity}`] = converted;
      [record.canonicalUrl,...(record.aliases || [])].filter(Boolean).forEach((alias) => { restored[alias] = converted; });
    });
    return restored;
  } catch {
    return {};
  }
}

export async function cacheOfflineAssets(urls, scope, storageKey, options = {}) {
  const uniqueUrls = [...new Set(urls.filter(isRemoteDownloadSource))];
  const mediaTotal = new Set(uniqueUrls
    .filter((url) => Boolean(options.mediaByUrl?.[url]))
    .map((url) => options.mediaByUrl[url].cacheIdentity || url)).size;
  const policy = { ...ANDROID_DOWNLOAD_POLICY, ...(options.downloadPolicy || {}) };
  let rawMap;
  let identityRecords;
  let failed = 0;
  let downloaded = 0;
  let downloadedBytes = 0;
  let removed = 0;
  let completed = 0;
  let mediaCompleted = 0;
  let mediaFailed = 0;
  let mediaDownloaded = 0;
  let mediaDownloadedBytes = 0;
  const mediaFailureCodes = [];
  let superseded = false;
  const sizeByUrl = {};

  try {
    rawMap = JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    rawMap = {};
  }
  try {
    identityRecords = JSON.parse(localStorage.getItem(getNativeIdentityCacheStorageKey(storageKey)) || "{}");
  } catch {
    identityRecords = {};
  }

  await Filesystem.mkdir({
    path: `totem-park/offline/${scope}`,
    directory: Directory.Data,
    recursive: true,
  }).catch(() => {});

  for (const url of uniqueUrls) {
    if (options.shouldContinue?.() === false) {
      superseded = true;
      break;
    }

    const playlistMedia = options.mediaByUrl?.[url] || null;
    const cacheIdentity = playlistMedia?.cacheIdentity || "";
    const contentVersion = playlistMedia?.contentVersion || "";
    const aliases = [...new Set([url,...(playlistMedia?.aliases || [])].filter(isRemoteDownloadSource))];
    let path = cacheIdentity
      ? getIdentityAssetPath(scope,cacheIdentity,contentVersion,url)
      : getAssetPath(scope,url);
    const diagnostic = { ...(playlistMedia || {}), cacheIdentity, contentVersion, remoteUrl:url, localPath:path };
    let itemFailed = false;
    let downloadedThisRun = false;
    let journalRecoveredThisRun = false;
    let partialPath = "";
    const previousRawUri = rawMap[url];
    const previousIdentityRecord = cacheIdentity ? identityRecords[cacheIdentity] : undefined;
    const previousPersistedRawMap = localStorage.getItem(storageKey);
    const identityStorageKey = getNativeIdentityCacheStorageKey(storageKey);
    const previousPersistedIdentityRecords = localStorage.getItem(identityStorageKey);
    recordMediaResolve(diagnostic);

    try {
      let fileInfo;
      let cacheHit = false;

      const identityRecord = cacheIdentity
        ? resolveNativeIdentityRecord(identityRecords,cacheIdentity,contentVersion)
        : null;
      if (identityRecord?.localPath) {
        const stat = await statOfflineFile(identityRecord.localPath);
        const validation = validateDownloadedFile(stat?.size,diagnostic.sizeBytes);
        if (validation.valid) {
          path = identityRecord.localPath;
          fileInfo = { ...stat, uri:identityRecord.localUri || stat.uri };
          cacheHit = true;
          identityRecords[cacheIdentity] = buildNativeIdentityRecord({ ...identityRecord, canonicalUrl:url, aliases:[...(identityRecord.aliases || []),...aliases], sizeBytes:validation.actual, validatedAt:Date.now() });
        }
      }

      if (!cacheHit && cacheIdentity) {
        const deterministicStat = await statOfflineFile(path);
        const deterministicValidation = validateDownloadedFile(deterministicStat?.size,diagnostic.sizeBytes);
        if (deterministicValidation.valid) {
          fileInfo = { ...deterministicStat, size:deterministicValidation.actual };
          cacheHit = true;
          identityRecords[cacheIdentity] = buildNativeIdentityRecord({ cacheIdentity, contentVersion, canonicalUrl:url, aliases, localUri:deterministicStat.uri, localPath:path, sizeBytes:deterministicValidation.actual, validatedAt:Date.now() });
          recordLabEvent("IDENTITY_CACHE_REINDEXED", { ...diagnostic, sizeBytes:deterministicValidation.actual });
        }
      }

      if (!cacheHit && cacheIdentity) {
        const journalEntry = getNativeCacheJournalEntry(storageKey,cacheIdentity,contentVersion);
        if (journalEntry?.tempPath) {
          const partialStat = await statOfflineFile(journalEntry.tempPath);
          const partialValidation = validateDownloadedFile(partialStat?.size,diagnostic.sizeBytes);
          if (partialValidation.valid) {
            const promoted = await promoteValidatedPartial({ tempPath:journalEntry.tempPath, finalPath:path, expectedSizeBytes:diagnostic.sizeBytes });
            fileInfo = promoted;
            cacheHit = true;
            journalRecoveredThisRun = true;
            identityRecords[cacheIdentity] = buildNativeIdentityRecord({ cacheIdentity, contentVersion, canonicalUrl:url, aliases, localUri:promoted.uri, localPath:path, sizeBytes:promoted.size, validatedAt:Date.now() });
            recordLabEvent("IDENTITY_CACHE_JOURNAL_RECOVERED", { ...diagnostic, operationId:journalEntry.operationId || "", sizeBytes:promoted.size });
          } else if (partialStat) {
            await Filesystem.deleteFile({ path:journalEntry.tempPath, directory:Directory.Data }).catch(() => {});
          }
        }
      }

      if (!cacheHit && cacheIdentity) {
        const legacyResult = await classifyLegacyIdentityRecord({
          rawMap, aliases, cacheIdentity, contentVersion, canonicalUrl:url, expectedSizeBytes:diagnostic.sizeBytes,
          getLegacyPath:(alias) => getAssetPath(scope,alias),
          statFile:statOfflineFile,
          validateFile:validateDownloadedFile,
        });
        const migrated = legacyResult.record;
        if (migrated) {
          path = migrated.localPath;
          fileInfo = { uri:migrated.localUri, size:migrated.sizeBytes };
          cacheHit = true;
          identityRecords[cacheIdentity] = migrated;
        }
        recordLabEvent("LEGACY_CACHE_CLASSIFIED", { ...diagnostic, legacyStatus:legacyResult.status, matchedAlias:legacyResult.alias || "" });
      }

      if (!cacheHit && !cacheIdentity) {
        const stat = await statOfflineFile(path);
        const validation = validateDownloadedFile(stat?.size,diagnostic.sizeBytes);
        if (validation.valid) {
          fileInfo = stat;
          cacheHit = true;
        }
      }

      if (!cacheHit) {
        if (!isRemoteDownloadSource(url)) throw new Error("LOCAL_SOURCE_NOT_DOWNLOADABLE");
        recordCacheResult(false, diagnostic);
        const operationId = createCacheOperationId();
        partialPath = getPartialAssetPath(path,operationId);
        updateNativeCacheJournal(storageKey,{ cacheIdentity:cacheIdentity || url, contentVersion, remoteUrl:url, tempPath:partialPath, finalPath:path, operationId, state:"pending" });
        const destination = await Filesystem.getUri({
          path:partialPath,
          directory: Directory.Data,
        });

        const onTransferStart = ({ downloadId, attempt }) => {
          updateNativeCacheJournal(storageKey,{ cacheIdentity:cacheIdentity || url, contentVersion, remoteUrl:url, tempPath:partialPath, finalPath:path, operationId, downloadId, attempt, state:"downloading" });
          options.onDownloadStart?.({
            url,
            cacheIdentity,
            downloadId,
            attempt,
            playlistMedia:Boolean(playlistMedia),
            mediaCompleted,
            mediaTotal,
            mediaFailed,
            mediaDownloaded,
            mediaDownloadedBytes,
          });
        };

        const onDownloaded = ({ downloadId, attempt, transferredBytes }) => updateNativeCacheJournal(storageKey,{ cacheIdentity:cacheIdentity || url, contentVersion, remoteUrl:url, tempPath:partialPath, finalPath:path, operationId, downloadId, attempt, transferredBytes, state:"downloaded" });
        const onValidated = ({ downloadId, attempt, transferredBytes, validation }) => updateNativeCacheJournal(storageKey,{ cacheIdentity:cacheIdentity || url, contentVersion, remoteUrl:url, tempPath:partialPath, finalPath:path, operationId, downloadId, attempt, transferredBytes, sizeBytes:validation.actual, state:"validated" });

        if (cacheIdentity) {
          fileInfo = await downloadOfflineFile({ url, tempPath:partialPath, destinationUri: destination.uri, diagnostic, policy, downloadKey:getNativeIdentityDownloadKey(cacheIdentity,contentVersion), onTransferStart, onDownloaded, onValidated });
        } else {
          fileInfo = await downloadOfflineFile({ url, tempPath:partialPath, destinationUri: destination.uri, diagnostic, policy, onTransferStart, onDownloaded, onValidated });
        }
        const transferredBytes = Number(fileInfo.transferredBytes || 0);
        const downloadOperationId = fileInfo.downloadOperationId;
        fileInfo = { ...(await promoteValidatedPartial({ tempPath:partialPath, finalPath:path, expectedSizeBytes:diagnostic.sizeBytes })), transferredBytes, downloadOperationId };
        downloadedThisRun = true;
      }

      rawMap[url] = fileInfo.uri;
      if (cacheIdentity) {
        const existing = identityRecords[cacheIdentity] || {};
        identityRecords[cacheIdentity] = buildNativeIdentityRecord({
          ...existing,
          cacheIdentity,
          contentVersion,
          canonicalUrl:url,
          aliases:[...(existing.aliases || []),...aliases],
          localUri:fileInfo.uri,
          localPath:path,
          sizeBytes:Number(fileInfo.size || 0),
          validatedAt:Date.now(),
        });
      }
      localStorage.setItem(storageKey, JSON.stringify(rawMap));
      localStorage.setItem(identityStorageKey, JSON.stringify(identityRecords));
      if (downloadedThisRun || journalRecoveredThisRun) {
        const journalEntry = getNativeCacheJournalEntry(storageKey,cacheIdentity || url,contentVersion);
        updateNativeCacheJournal(storageKey,{ ...(journalEntry || {}), cacheIdentity:cacheIdentity || url, contentVersion, remoteUrl:url, tempPath:partialPath, finalPath:path, operationId:journalEntry?.operationId || "", state:"committed" });
      }

      if (cacheHit) recordCacheResult(true, { ...diagnostic, localPath:path, sizeBytes:Number(fileInfo.size || 0) });

      if (downloadedThisRun) {
        downloaded += 1;
        if (playlistMedia) mediaDownloaded += 1;
        const transferredBytes = Number(fileInfo.transferredBytes || 0);
        downloadedBytes += transferredBytes;
        if (playlistMedia) mediaDownloadedBytes += transferredBytes;
        if (playlistMedia) {
          options.onDownloadComplete?.({
            operationId:fileInfo.downloadOperationId,
            bytes:transferredBytes,
            remoteUrl:url,
            classification:"playlistMedia",
            status:"complete",
          });
        }
      }
      sizeByUrl[url] = Number(fileInfo.size || 0);
    } catch (error) {
      if (partialPath) await Filesystem.deleteFile({ path:partialPath, directory:Directory.Data }).catch(() => {});
      if (previousRawUri === undefined) delete rawMap[url];
      else rawMap[url] = previousRawUri;
      if (cacheIdentity) {
        if (previousIdentityRecord === undefined) delete identityRecords[cacheIdentity];
        else identityRecords[cacheIdentity] = previousIdentityRecord;
      }
      try {
        if (previousPersistedRawMap === null) localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey,previousPersistedRawMap);
        if (previousPersistedIdentityRecords === null) localStorage.removeItem(identityStorageKey);
        else localStorage.setItem(identityStorageKey,previousPersistedIdentityRecords);
      } catch {
        // A próxima execução volta a validar arquivo e registros antes de usá-los.
      }
      failed += 1;
      itemFailed = true;
      if (playlistMedia) mediaFailureCodes.push(getCacheFailureCode(error));
      console.log("Falha ao baixar midia para uso offline:", url, error);
      recordLabEvent("CACHE_ERROR", { ...diagnostic, message: error?.message || "Falha no cache" });
    } finally {
      completed += 1;
      if (playlistMedia) {
        mediaCompleted += 1;
        if (itemFailed) mediaFailed += 1;
      }
      options.onProgress?.({
        completed,
        total: uniqueUrls.length,
        failed,
        downloaded,
        downloadedBytes,
        removed,
        url,
        cacheIdentity,
        playlistMedia:Boolean(playlistMedia),
        mediaCompleted,
        mediaTotal,
        mediaFailed,
        mediaDownloaded,
        mediaDownloadedBytes,
        mediaDownloadActive:false,
      });
    }
  }

  // V39 keeps every unclassified legacy URL and file. Absence from the current
  // aliases is not proof that a historical cache entry is invalid.

  localStorage.setItem(storageKey, JSON.stringify(rawMap));
  localStorage.setItem(getNativeIdentityCacheStorageKey(storageKey), JSON.stringify(identityRecords));

  const urlMap = Object.fromEntries(Object.entries(rawMap).map(([remoteUrl,fileUri]) => [remoteUrl,Capacitor.convertFileSrc(fileUri)]));
  Object.values(identityRecords).forEach((record) => {
    if (!record?.cacheIdentity || !record?.localUri) return;
    const converted = Capacitor.convertFileSrc(record.localUri);
    urlMap[`identity:${record.cacheIdentity}`] = converted;
    [record.canonicalUrl,...(record.aliases || [])].filter(Boolean).forEach((alias) => { urlMap[alias] = converted; });
  });

  return {
    failed,
    downloaded,
    downloadedBytes,
    removed,
    sizeByUrl,
    total: uniqueUrls.length,
    mediaTotal,
    mediaCompleted,
    mediaFailed,
    mediaDownloaded,
    mediaDownloadedBytes,
    mediaFailureCodes,
    superseded,
    urlMap,
  };
}
