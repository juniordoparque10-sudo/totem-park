const PREFIX = "TOTEMPARK-DIAG";
const REDACTED = "[REDACTED]";
const SENSITIVE_KEY = /(url|uri|token|secret|password|credential|authorization|cookie|email|phone|cpf|cnpj|address|remotePreview|preview|storagePath|src|fileName|mediaName|clientName|screenName)/i;
const URL = /(?:https?|file|content|blob):\/\/[^\s"']+/gi;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const SECRET_ASSIGNMENT = /\b(?:token|secret|password|authorization|cookie)=\S+/gi;

function safeString(value) {
  return String(value || "")
    .replace(URL, REDACTED)
    .replace(EMAIL, REDACTED)
    .replace(SECRET_ASSIGNMENT, REDACTED)
    .slice(0, 500);
}

function sanitize(value, key = "", depth = 0) {
  if (SENSITIVE_KEY.test(key)) return REDACTED;
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return safeString(value);
  if (value instanceof Error) return { errorType:value.name || "Error", message:safeString(value.message) };
  if (depth >= 3) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, "", depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 40).map(([childKey, childValue]) => [childKey, sanitize(childValue, childKey, depth + 1)]));
  }
  return safeString(value);
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function createPlayerDiagnosticLogger({ sink = (line) => console.info(line), now = () => Date.now() } = {}) {
  const lastFingerprintByKey = new Map();

  function emit(event, payload = {}, { dedupeKey = "" } = {}) {
    const safePayload = sanitize(payload);
    const fingerprint = stableSerialize({ event, payload:safePayload });
    if (dedupeKey && lastFingerprintByKey.get(dedupeKey) === fingerprint) return false;
    if (dedupeKey) lastFingerprintByKey.set(dedupeKey, fingerprint);
    sink(`${PREFIX} ${JSON.stringify({ timestamp:now(), event, ...safePayload })}`);
    return true;
  }

  function startStage(stage, context = {}) {
    const startedAt = now();
    emit("BOOTSTRAP_STAGE", { stage, status:"start", elapsedMs:0, ...context });
    let finished = false;
    const finish = (status, details = {}) => {
      if (finished) return false;
      finished = true;
      const errorDetails = details instanceof Error ? sanitize(details) : details;
      return emit("BOOTSTRAP_STAGE", { stage, status, elapsedMs:Math.max(0, now() - startedAt), ...context, ...(errorDetails || {}) });
    };
    return {
      success:(details) => finish("success", details),
      failure:(error) => finish("failure", error),
    };
  }

  return { emit, startStage };
}

export function createDecoderTransitionDiagnostics({ diagnostics } = {}) {
  const emit = (event, payload = {}) => diagnostics?.emit?.(
    event,
    payload,
    { dedupeKey:`decoder-transition:${event}` },
  ) || false;

  return {
    releaseStarted:(payload) => emit("DECODER_RELEASE_STARTED", payload),
    releaseConfirmed:(payload) => emit("DECODER_RELEASE_CONFIRMED", payload),
    mountStarted:(payload) => emit("NEXT_MEDIA_MOUNT_STARTED", payload),
    readyConfirmed:(payload) => emit("NEXT_MEDIA_READY_CONFIRMED", payload),
    pendingExited:(payload) => emit("DECODER_PENDING_EXITED", payload),
    failed:(payload) => emit("DECODER_TRANSITION_FAILED", payload),
    cancelled:(payload) => emit("DECODER_TRANSITION_CANCELLED", payload),
    staleCallback:(payload) => emit("DECODER_STALE_CALLBACK", payload),
  };
}

export function describePlayerDiagnosticItem(item = {}, index = -1) {
  return {
    index:Number.isInteger(index) ? index : -1,
    itemId:String(item.id || ""),
    mediaId:String(item.mediaId || item.sourceMediaId || ""),
    templateId:String(item.templateId || ""),
    itemType:String(item.playerItemType || item.type || "unknown"),
  };
}

export function installPlayerGlobalErrorDiagnostics({ target = globalThis, diagnostics } = {}) {
  if (!target?.addEventListener || !diagnostics?.emit) return () => {};
  const onError = (event = {}) => diagnostics.emit("WINDOW_ERROR", {
    message:event.message || event.error?.message || "JavaScript error",
    filename:event.filename || "",
    line:event.lineno || 0,
    column:event.colno || 0,
    errorType:event.error?.name || "Error",
  });
  const onUnhandledRejection = (event = {}) => {
    const reason = event.reason;
    diagnostics.emit("UNHANDLED_REJECTION", {
      errorType:reason?.name || typeof reason,
      message:reason?.message || reason || "Unhandled rejection",
    });
  };
  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onUnhandledRejection);
  return () => {
    target.removeEventListener("error", onError);
    target.removeEventListener("unhandledrejection", onUnhandledRejection);
  };
}

export const playerRuntimeDiagnostics = createPlayerDiagnosticLogger();
