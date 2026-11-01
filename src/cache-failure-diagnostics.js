const FAILURE_MODES = new Set(["item", "pipeline"]);
const MAX_FAILURE_CODES = 5;
const MAX_FAILURE_CODE_LENGTH = 64;

export function getCacheFailureCode(error) {
  const source = String(error?.code || error?.message || error || "CACHE_FAILURE")
    .replace(/\b(?:https?|file):\/\/\S+/gi, "RESOURCE")
    .replace(/\b(?:token|signature|credential|authorization|password)\s*[=:]\s*\S+/gi, "$1_REDACTED")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_FAILURE_CODE_LENGTH);
  return source || "CACHE_FAILURE";
}

export function createCacheFailureDiagnostic(mode = "none", failureCount = 0, errors = []) {
  const normalizedMode = FAILURE_MODES.has(mode) && Number(failureCount) > 0 ? mode : "none";
  const normalizedCount = normalizedMode === "none" ? 0 : Math.max(0, Number(failureCount) || 0);
  const cacheFailureCodes = normalizedMode === "none"
    ? []
    : [...new Set(errors.map(getCacheFailureCode).filter(Boolean))].slice(0, MAX_FAILURE_CODES);
  return {
    cacheFailureMode:normalizedMode,
    cacheFailureCount:normalizedCount,
    cacheFailureCodes,
  };
}
