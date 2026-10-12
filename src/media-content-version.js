function clean(value) {
  return String(value || "").trim();
}

function timestampValue(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return clean(value);
  if (typeof value.seconds === "number") return `${value.seconds}:${value.nanoseconds || 0}`;
  if (typeof value.toMillis === "function") return String(value.toMillis());
  return "";
}

export function canonicalizeRemoteMediaUrl(value = "") {
  const source = clean(value);
  if (!source) return "";
  try {
    const parsed = new URL(source);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return source.split(/[?#]/, 1)[0];
  }
}

export function deriveCanonicalContentVersion(metadata = {}) {
  const explicit = clean(metadata.contentVersion);
  if (explicit) return explicit;

  const sha256 = clean(metadata.fileHash || metadata.contentHash || metadata.sha256 || metadata.checksum?.sha256 || metadata.checksums?.sha256);
  if (sha256) return `sha256:${sha256}`;
  const md5 = clean(metadata.md5Hash || metadata.md5 || metadata.checksum?.md5 || metadata.checksums?.md5);
  if (md5) return `md5:${md5}`;
  const generation = clean(metadata.storageGeneration || metadata.generation || metadata.versionId || metadata.version);
  if (generation) return `generation:${generation}`;
  const etag = clean(metadata.etag).replace(/^W\//, "").replace(/^"|"$/g, "");
  if (etag) return `etag:${etag}`;
  const uploadVersion = clean(metadata.mediaVersion || metadata.fileVersion || metadata.uploadVersion || metadata.contentRevision || metadata.assetRevision);
  if (uploadVersion) return `upload:${uploadVersion}`;
  return "";
}

export function normalizeStorageVersionMetadata(metadata = {}) {
  const checksums = metadata.checksums || metadata.checksum || {};
  const fileHash = clean(metadata.fileHash || metadata.contentHash || metadata.sha256 || checksums.sha256);
  const md5Hash = clean(metadata.md5Hash || metadata.md5 || checksums.md5);
  const etag = clean(metadata.etag).replace(/^W\//, "").replace(/^"|"$/g, "");
  const storageGeneration = clean(metadata.storageGeneration || metadata.generation || metadata.versionId || metadata.version);
  return {
    contentVersion:deriveCanonicalContentVersion({ ...metadata,fileHash,md5Hash,etag,storageGeneration }),
    fileHash,
    md5Hash,
    etag,
    storageGeneration,
  };
}

export function getCanonicalMediaAssetIdentity(item = {}) {
  const stableId = clean(item.mediaId || item.sourceMediaId || item.id);
  if (stableId) return `media:${stableId}`;
  const storageIdentity = clean(item.storageKey || item.storagePath);
  if (storageIdentity) return `storage:${storageIdentity}`;
  const fileIdentity = clean(item.fileName);
  if (fileIdentity) return `file:${fileIdentity}`;
  const remote = canonicalizeRemoteMediaUrl(item.remotePreview || item.preview || item.imageUrl);
  return remote ? `remote:${remote}` : "legacy:unidentified";
}

export function getCanonicalMediaContentVersion(item = {}) {
  return deriveCanonicalContentVersion(item);
}

export function getMediaVersionFields(metadata = {}) {
  const normalized = normalizeStorageVersionMetadata(metadata);
  return Object.fromEntries(Object.entries(normalized).filter(([,value]) => Boolean(value)));
}

export function getMediaCacheKeyParts(clientId, item = {}, remoteUrl = "") {
  const stableId = clean(
    item.mediaId || item.sourceMediaId || item.id || item.storagePath || item.fileName || remoteUrl
  );
  const contentVersion = clean(
    item.contentVersion || item.fileHash || item.contentHash || item.md5Hash || item.etag
      || item.mediaVersion || item.fileVersion || item.uploadVersion
  );
  return [
    clientId || "client",
    stableId,
    item.storagePath || "",
    contentVersion,
    item.sizeBytes || "",
  ];
}

export function mediaItemReferences(item = {}, media = {}) {
  if (item?.playerItemType === "template" || item?.templateType) return false;
  const mediaId = clean(media.id || media.mediaId || media.sourceMediaId);
  const ids = [item.id,item.mediaId,item.sourceMediaId,item.originalId].map(clean).filter(Boolean);
  if (mediaId && ids.includes(mediaId)) return true;
  const mediaUrls = [media.preview,media.remotePreview,media.imageUrl,media.url,media.downloadURL]
    .map(canonicalizeRemoteMediaUrl).filter(Boolean);
  const itemUrls = [item.preview,item.remotePreview,item.imageUrl,item.url,item.downloadURL]
    .map(canonicalizeRemoteMediaUrl).filter(Boolean);
  return mediaUrls.some((url) => itemUrls.includes(url));
}

export function applyMediaVersionToPlaylistItems(items = [], media = {}, versionFields = {}) {
  const mediaId = clean(media.id || media.mediaId || media.sourceMediaId);
  let changed = false;
  const next = items.map((item) => {
    if (!mediaItemReferences(item,media)) return item;
    const patch = {
      ...versionFields,
      ...(mediaId ? { mediaId:item.mediaId || mediaId, sourceMediaId:item.sourceMediaId || mediaId } : {}),
    };
    if (Object.entries(patch).every(([key,value]) => item[key] === value)) return item;
    changed = true;
    return { ...item,...patch };
  });
  return { changed,items:next };
}

export async function backfillMediaContentVersions({ items = [], readMetadata, persistVersion, onProgress } = {}) {
  const result = { total:items.length, updated:0, skipped:0, failed:0, failures:[] };
  for (const media of items) {
    if (getCanonicalMediaContentVersion(media)) {
      result.skipped += 1;
      onProgress?.({ ...result,media });
      continue;
    }
    if (!media?.storagePath || typeof readMetadata !== "function" || typeof persistVersion !== "function") {
      result.failed += 1;
      result.failures.push({ id:media?.id || "",reason:"missing-storage-metadata" });
      onProgress?.({ ...result,media });
      continue;
    }
    try {
      const metadata = await readMetadata(media);
      const versionFields = getMediaVersionFields(metadata);
      if (!versionFields.contentVersion) throw new Error("storage-version-unavailable");
      await persistVersion(media,versionFields);
      result.updated += 1;
    } catch (error) {
      result.failed += 1;
      result.failures.push({ id:media.id || "",reason:error?.message || "metadata-failed" });
    }
    onProgress?.({ ...result,media });
  }
  return result;
}

export function getLegacyMediaVersionState(item = {}) {
  return getCanonicalMediaContentVersion(item) || `legacy-unversioned:${timestampValue(item.createdAt) || "unknown"}`;
}
