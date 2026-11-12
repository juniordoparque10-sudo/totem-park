import { safeSetStorageItem } from "./safe-storage.js";

export const TV_CONNECTION_STORAGE_KEY = "totempark-tv-connection";

export const LINK_STATES = Object.freeze({
  LOCAL_FOUND: "LINK_LOCAL_FOUND",
  LOCAL_MISSING: "LINK_LOCAL_MISSING",
  VALIDATION_START: "LINK_VALIDATION_START",
  VALIDATED: "LINK_VALIDATED",
  VALIDATION_ERROR: "LINK_VALIDATION_ERROR",
  VALIDATION_TIMEOUT: "LINK_VALIDATION_TIMEOUT",
  OFFLINE: "LINK_OFFLINE",
  DEVICE_CONFLICT: "LINK_DEVICE_CONFLICT",
  EXPLICITLY_REVOKED: "LINK_EXPLICITLY_REVOKED",
  CLEARED: "LINK_CLEARED",
});

export function logLinkEvent(event, details = {}) {
  console.info(`[TotemParkLink] ${event}`, details);
}

export function normalizeTvConnection(value) {
  if (!value || typeof value !== "object") return null;
  const clientId = String(value.clientId || "").trim();
  const code = String(value.code || "").trim().toUpperCase();
  if (!clientId || !code) return null;

  return {
    clientId,
    code,
    deviceId: String(value.deviceId || "").trim(),
    ...(value.screenId ? { screenId: String(value.screenId) } : {}),
  };
}

export function readTvConnection(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(TV_CONNECTION_STORAGE_KEY);
    const connection = normalizeTvConnection(raw ? JSON.parse(raw) : null);
    logLinkEvent(connection ? LINK_STATES.LOCAL_FOUND : LINK_STATES.LOCAL_MISSING, {
      hasScreenId: Boolean(connection?.screenId),
    });
    return connection;
  } catch (error) {
    logLinkEvent(LINK_STATES.VALIDATION_ERROR, {
      stage: "local-read",
      message: error?.message || String(error),
    });
    return null;
  }
}

export function persistTvConnection(connection, storage = globalThis.localStorage) {
  const normalized = normalizeTvConnection(connection);
  if (!normalized) return null;
  const persisted = safeSetStorageItem(storage, TV_CONNECTION_STORAGE_KEY, JSON.stringify(normalized), {
    onError:(error, details) => logLinkEvent(LINK_STATES.VALIDATION_ERROR, {
      stage:"local-write",
      message:error?.message || String(error),
      quotaExceeded:details.quotaExceeded,
    }),
  });
  return persisted ? normalized : null;
}

export function updateTvConnectionScreenId(screenId, storage = globalThis.localStorage) {
  const current = readTvConnection(storage);
  if (!current || !screenId) return current;
  return persistTvConnection({ ...current, screenId }, storage);
}

export function clearTvConnection({ explicit = false, reason = "" } = {}, storage = globalThis.localStorage) {
  if (!explicit) return false;
  logLinkEvent(LINK_STATES.EXPLICITLY_REVOKED, { reason });
  storage?.removeItem(TV_CONNECTION_STORAGE_KEY);
  logLinkEvent(LINK_STATES.CLEARED, { reason });
  return true;
}

export function getTimestampMs(value) {
  if (!value) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value.seconds) return value.seconds * 1000;
  return 0;
}

export function isFreshExitCommand({ remoteCommand, commandStatus, sessionStartedAtMs } = {}) {
  if (remoteCommand?.type !== "exitTv" || commandStatus !== "sent") return false;
  const sentAtMs = getTimestampMs(remoteCommand.sentAt);
  const sessionStartMs = getTimestampMs(sessionStartedAtMs);
  if (!sentAtMs || !sessionStartMs) return false;
  return sentAtMs >= sessionStartMs - 5000;
}

export function shouldClearTvConnectionAfterRelease(releaseConfirmed) {
  return releaseConfirmed === true;
}

export function classifyLinkValidation({
  online = true,
  error = null,
  timedOut = false,
  explicitlyRevoked = false,
  connectedDeviceId = "",
  localDeviceId = "",
  recentlyOnline = false,
} = {}) {
  if (explicitlyRevoked) return { state: LINK_STATES.EXPLICITLY_REVOKED, clear: true };
  if (!online) return { state: LINK_STATES.OFFLINE, clear: false };
  if (timedOut) return { state: LINK_STATES.VALIDATION_TIMEOUT, clear: false };
  if (error) return { state: LINK_STATES.VALIDATION_ERROR, clear: false };
  if (connectedDeviceId && connectedDeviceId !== localDeviceId && recentlyOnline) {
    return { state: LINK_STATES.DEVICE_CONFLICT, clear: false };
  }
  return { state: LINK_STATES.VALIDATED, clear: false };
}
