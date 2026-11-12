export function isStorageQuotaError(error) {
  return error?.name === "QuotaExceededError"
    || error?.code === 22
    || error?.code === 1014
    || /quota/i.test(String(error?.message || ""));
}

export function safeSetStorageItem(storage, key, value, { onError } = {}) {
  try {
    if (typeof storage?.setItem !== "function") return false;
    storage.setItem(key, value);
    return true;
  } catch (error) {
    onError?.(error, { key, quotaExceeded: isStorageQuotaError(error) });
    return false;
  }
}
