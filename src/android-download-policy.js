const activeDownloads = new Map();

export const ANDROID_DOWNLOAD_POLICY = Object.freeze({
  connectTimeoutMs: 60000,
  inactivityTimeoutMs: 60000,
  maxRetriesWithoutProgress: 1,
  retryBackoffMs: 2000,
  progressMinBytes: 1024 * 1024,
  progressMaxIntervalMs: 5000,
});

export function validateDownloadedFile(actualSize, expectedSize = 0) {
  const actual = Number(actualSize || 0);
  const expected = Number(expectedSize || 0);
  if (actual <= 0) return { valid: false, reason: "empty", actual, expected };
  if (expected > 0 && actual !== expected) {
    return { valid: false, reason: "size-mismatch", actual, expected };
  }
  return { valid: true, reason: "ok", actual, expected };
}

export function isNativeTimeout(error) {
  const value = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return value.includes("timeout") || value.includes("timed out");
}

export function shouldRetryDownload({ error, partialSize = 0, attempt = 1, policy = ANDROID_DOWNLOAD_POLICY }) {
  if (attempt > policy.maxRetriesWithoutProgress) return false;
  if (Number(partialSize || 0) > 0) return false;
  const value = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  if (/\bhttp\s*4\d\d\b/.test(value)) return false;
  return true;
}

export function createProgressReporter({ onEvent, diagnostic = {}, now = Date.now, policy = ANDROID_DOWNLOAD_POLICY }) {
  let lastBytes = 0;
  let lastAt = 0;
  return (event = {}) => {
    const bytes = Number(event.bytes || 0);
    const at = now();
    const advancedEnough = bytes - lastBytes >= policy.progressMinBytes;
    const waitedEnough = at - lastAt >= policy.progressMaxIntervalMs;
    if (!advancedEnough && !waitedEnough && bytes !== Number(event.contentLength || 0)) return;
    lastBytes = bytes;
    lastAt = at;
    onEvent?.("FILETRANSFER_PROGRESS", {
      ...diagnostic,
      bytes,
      contentLength: Number(event.contentLength || 0),
      lengthComputable: Boolean(event.lengthComputable),
    });
  };
}

export function runSingleFlightDownload(key, operation) {
  if (activeDownloads.has(key)) return activeDownloads.get(key);
  const promise = Promise.resolve().then(operation).finally(() => activeDownloads.delete(key));
  activeDownloads.set(key, promise);
  return promise;
}

export function resetDownloadPolicyForTests() {
  activeDownloads.clear();
}
