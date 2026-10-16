export function getPlaybackRemainingAfterWake({ remainingMs, startedAtMs, nowMs = Date.now() } = {}) {
  const remaining = Number(remainingMs);
  const startedAt = Number(startedAtMs);
  const current = Number(nowMs);
  if (!Number.isFinite(remaining) || remaining < 0) return 0;
  if (!Number.isFinite(startedAt) || startedAt <= 0 || !Number.isFinite(current) || current < startedAt) return remaining;
  return Math.max(0, remaining - (current - startedAt));
}

export function subscribePlayerRuntimeWake(callback, windowObject = globalThis.window, documentObject = globalThis.document) {
  if (typeof callback !== "function") return () => {};
  const wake = () => callback(Date.now());
  const wakeWhenVisible = () => {
    if (!documentObject || documentObject.visibilityState === "visible") wake();
  };
  windowObject?.addEventListener?.("pageshow", wake);
  windowObject?.addEventListener?.("focus", wake);
  windowObject?.addEventListener?.("online", wake);
  windowObject?.addEventListener?.("resume", wake);
  documentObject?.addEventListener?.("visibilitychange", wakeWhenVisible);
  return () => {
    windowObject?.removeEventListener?.("pageshow", wake);
    windowObject?.removeEventListener?.("focus", wake);
    windowObject?.removeEventListener?.("online", wake);
    windowObject?.removeEventListener?.("resume", wake);
    documentObject?.removeEventListener?.("visibilitychange", wakeWhenVisible);
  };
}
