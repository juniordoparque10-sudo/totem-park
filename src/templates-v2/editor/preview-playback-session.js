const DEFAULT_TICK_MS = 100;

export function createPreviewPlaybackSession({
  now = () => Date.now(),
  setIntervalFn = (callback, delay) => globalThis.setInterval(callback, delay),
  clearIntervalFn = (timer) => globalThis.clearInterval(timer),
  tickMs = DEFAULT_TICK_MS,
} = {}) {
  let startedAt = now();
  let accumulatedMs = 0;
  let paused = false;
  let revision = 0;
  let timer = null;
  let destroyed = false;
  const listeners = new Set();
  let snapshot = { elapsedMs:0, paused:false, executionId:`preview-${revision}` };

  function elapsed() {
    return Math.max(0, accumulatedMs + (paused ? 0 : now() - startedAt));
  }

  function publish() {
    if (destroyed) return;
    snapshot = { elapsedMs:elapsed(), paused, executionId:`preview-${revision}` };
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (destroyed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (destroyed || timer !== null) return;
      timer = setIntervalFn(() => { if (!paused) publish(); }, tickMs);
      publish();
    },
    pause() {
      if (destroyed || paused) return;
      accumulatedMs = elapsed();
      paused = true;
      publish();
    },
    resume() {
      if (destroyed || !paused) return;
      startedAt = now();
      paused = false;
      publish();
    },
    restart() {
      if (destroyed) return;
      accumulatedMs = 0;
      startedAt = now();
      revision += 1;
      publish();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (timer !== null) clearIntervalFn(timer);
      timer = null;
      listeners.clear();
    },
  };
}
