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
  storage?.setItem(TV_CONNECTION_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
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
