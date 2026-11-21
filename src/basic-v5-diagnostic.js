const PREFIX = "[BASIC_V5_DIAG]";

function validTimestamp(value) {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Date.parse(value));
}

export function getBasicAppInfoValidation(snapshot = {}) {
  const installation = snapshot?.installation || {};
  const fields = {
    packageName:typeof installation.packageName === "string" && installation.packageName.trim() !== "",
    versionCode:Number.isInteger(installation.versionCode) && installation.versionCode > 0,
    versionName:typeof installation.versionName === "string" && installation.versionName.trim() !== "",
    buildId:typeof installation.buildId === "string" && installation.buildId.trim() !== "",
    buildTimestamp:validTimestamp(installation.buildTimestamp),
  };
  const invalidFields = Object.entries(fields).filter(([, valid]) => !valid).map(([field]) => field);
  return { valid:invalidFields.length === 0, invalidFields, fields };
}

export function getBasicBindingConditions({ snapshot, binding, clientId, screenId, deviceId } = {}) {
  const result = {
    appInfoValid:getBasicAppInfoValidation(snapshot).valid,
    bindingActive:binding?.status === "ACTIVE",
    clientMatches:binding?.clientId === clientId,
    screenMatches:binding?.screenId === screenId,
    deviceMatches:binding?.deviceId === deviceId,
  };
  return {
    ...result,
    canSyncBasicTelemetry:Object.values(result).every(Boolean),
  };
}

export function getHeartbeatKeySummary(payload = {}) {
  return {
    hasTelemetry:Object.hasOwn(payload, "telemetry"),
    hasTelemetryUpdatedAt:Object.hasOwn(payload, "telemetryUpdatedAt"),
  };
}

export function sanitizeDiagnosticError(error = {}) {
  const code = String(error?.code || error?.name || "unknown").slice(0, 80);
  const message = String(error?.message || "unknown error")
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/\b(?:token|apiKey|bindingCode|code)\s*[=:]\s*[^\s,;]+/gi, "$1=[redacted]")
    .slice(0, 240);
  return { code, message };
}

export function createBasicV5Diagnostic({ enabled = false, log = console.info } = {}) {
  const onceKeys = new Set();
  const changedValues = new Map();
  const emit = (event, detail) => {
    if (!enabled) return false;
    log(`${PREFIX} ${event}`, detail);
    return true;
  };
  return {
    once(event, detail = {}) {
      if (!enabled || onceKeys.has(event)) return false;
      onceKeys.add(event);
      return emit(event, detail);
    },
    changed(event, detail = {}) {
      if (!enabled) return false;
      const fingerprint = JSON.stringify(detail);
      if (changedValues.get(event) === fingerprint) return false;
      changedValues.set(event, fingerprint);
      return emit(event, detail);
    },
    event(event, detail = {}) {
      return emit(event, detail);
    },
  };
}
