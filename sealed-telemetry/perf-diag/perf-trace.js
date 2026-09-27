export const TRACE_LIMIT = 100;

export function publicMediaSrc(value) {
  return String(value || "").split(/[?#]/, 1)[0];
}

export function createPerfTrace({
  clock = () => performance.now(),
  wallClock = () => new Date().toISOString(),
  limit = TRACE_LIMIT,
} = {}) {
  const events = [];
  let sequence = 0;

  return {
    record(type, details = {}) {
      const entry = {
        sequence: ++sequence,
        type,
        monotonicMs: clock(),
        timestamp: wallClock(),
        ...details,
      };
      if (events.length === limit) events.shift();
      events.push(entry);
      return entry;
    },
    snapshot() {
      return events.map((entry) => ({ ...entry }));
    },
  };
}

export function observeLongTasks(trace, PerformanceObserverClass = globalThis.PerformanceObserver) {
  if (!PerformanceObserverClass?.supportedEntryTypes?.includes("longtask")) {
    trace.record("LONG_TASK_API_UNAVAILABLE");
    return null;
  }
  try {
    const observer = new PerformanceObserverClass((list) => {
      for (const entry of list.getEntries()) {
        trace.record("LONG_TASK", {
          startTimeMs: entry.startTime,
          durationMs: entry.duration,
        });
      }
    });
    observer.observe({ entryTypes: ["longtask"] });
    return observer;
  } catch {
    trace.record("LONG_TASK_API_UNAVAILABLE");
    return null;
  }
}
