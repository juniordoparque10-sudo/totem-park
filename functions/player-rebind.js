const REBIND_AUTHORIZATION_TTL_MS = 10 * 60 * 1000;

function evaluateRebindAuthorization({ authorization, clientId, screenId, nowMs = Date.now() } = {}) {
  if (!authorization || authorization.status !== "ACTIVE") return { allowed: false, reason: "missing-or-consumed" };
  if (authorization.clientId !== clientId || authorization.screenId !== screenId) {
    return { allowed: false, reason: "wrong-screen" };
  }
  if (!Number.isFinite(Number(authorization.expiresAtMs)) || Number(authorization.expiresAtMs) <= nowMs) {
    return { allowed: false, reason: "expired" };
  }
  if (authorization.consumedAt || authorization.consumedBy) return { allowed: false, reason: "consumed" };
  return { allowed: true, reason: "active" };
}

function canRebindKnownDevice({ connectedDeviceId, requestedDeviceId } = {}) {
  return !connectedDeviceId || connectedDeviceId === requestedDeviceId;
}

module.exports = {
  REBIND_AUTHORIZATION_TTL_MS,
  evaluateRebindAuthorization,
  canRebindKnownDevice,
};
