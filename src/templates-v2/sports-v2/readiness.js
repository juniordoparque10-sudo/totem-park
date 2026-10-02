export const SPORTS_V2_READINESS_TIMEOUT_MS = 12000;

export function isSportsV2FinalState(dynamicData) {
  return dynamicData !== null && dynamicData?.loading !== true;
}

export function canRevealSportsV2({ dynamicData, backgroundConfigured, backgroundReady }) {
  return isSportsV2FinalState(dynamicData) && (!backgroundConfigured || backgroundReady);
}

export function withSportsV2ReadinessTimeout(promise, timeoutMs = SPORTS_V2_READINESS_TIMEOUT_MS, timers = globalThis) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = timers.setTimeout(() => {
      const error = new Error("Sports V2 readiness timeout");
      error.code = "sports-v2/readiness-timeout";
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), timeout])
    .finally(() => timers.clearTimeout(timeoutId));
}
