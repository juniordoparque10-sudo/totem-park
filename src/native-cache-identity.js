const NATIVE_IDENTITY_CACHE_SUFFIX = "-identity-v1";

export function getNativeIdentityCacheStorageKey(storageKey) {
  return `${storageKey}${NATIVE_IDENTITY_CACHE_SUFFIX}`;
}

export function getNativeIdentityDownloadKey(cacheIdentity, contentVersion = "") {
  return `${cacheIdentity}|${contentVersion || "stable"}`;
}

export function resolveNativeIdentityRecord(records = {}, cacheIdentity = "", contentVersion = "") {
  const record = records[cacheIdentity];
  if (!record) return null;
  if (record.contentVersion && contentVersion && record.contentVersion !== contentVersion) return null;
  return record;
}

export function buildNativeIdentityRecord({ cacheIdentity, contentVersion = "", canonicalUrl = "", aliases = [], localUri = "", localPath = "", sizeBytes = 0, validatedAt = Date.now() } = {}) {
  return {
    cacheIdentity,
    contentVersion,
    canonicalUrl,
    aliases:[...new Set([canonicalUrl,...aliases].filter(Boolean))],
    localUri,
    localPath,
    sizeBytes:Number(sizeBytes || 0),
    validatedAt,
  };
}

export async function classifyLegacyIdentityRecord({ rawMap = {}, aliases = [], cacheIdentity = "", contentVersion = "", canonicalUrl = "", expectedSizeBytes = 0, getLegacyPath, statFile, validateFile } = {}) {
  for (const alias of aliases) {
    const legacyUri = rawMap[alias];
    if (!legacyUri) continue;
    const localPath = getLegacyPath(alias);
    const stat = await statFile(localPath);
    const validation = validateFile(stat?.size,expectedSizeBytes);
    if (!validation.valid) return { status:"invalid", alias, localUri:legacyUri, localPath, validation, record:null };
    return {
      status:"migrated",
      alias,
      localUri:legacyUri,
      localPath,
      validation,
      record:buildNativeIdentityRecord({ cacheIdentity, contentVersion, canonicalUrl, aliases, localUri:legacyUri || stat.uri, localPath, sizeBytes:validation.actual, validatedAt:Date.now() }),
    };
  }
  return { status:"unresolved", alias:"", localUri:"", localPath:"", validation:null, record:null };
}

export async function migrateLegacyIdentityRecord(options = {}) {
  const result = await classifyLegacyIdentityRecord(options);
  return result.record;
}
