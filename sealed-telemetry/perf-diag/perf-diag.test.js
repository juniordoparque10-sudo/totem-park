import assert from "node:assert/strict";
import test from "node:test";
import { createObserver } from "./observer-core.js";
import { createPerfTrace, observeLongTasks, publicMediaSrc } from "./perf-trace.js";

test("trace keeps a bounded, ordered window without leaking media tokens", () => {
  let time = 0;
  const trace = createPerfTrace({ clock: () => ++time, wallClock: () => "2026-09-26T00:00:00.000Z", limit: 3 });
  trace.record("FIRST");
  trace.record("SECOND");
  trace.record("THIRD");
  trace.record("FOURTH");
  assert.deepEqual(trace.snapshot().map((event) => event.type), ["SECOND", "THIRD", "FOURTH"]);
  assert.deepEqual(trace.snapshot().map((event) => event.sequence), [2, 3, 4]);
  assert.equal(publicMediaSrc("https://example.test/video.mp4?token=secret#x"), "https://example.test/video.mp4");
  observeLongTasks(trace, undefined);
  assert.equal(trace.snapshot().at(-1).type, "LONG_TASK_API_UNAVAILABLE");
});

test("OFF records no operational event or event write; ON traces media and checkpoint once", () => {
  const originalNavigator = globalThis.navigator;
  const originalMutationObserver = globalThis.MutationObserver;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: true } });
  globalThis.MutationObserver = class {
    observe() {}
    disconnect() {}
  };
  const listeners = new Map();
  const video = {
    tagName: "VIDEO",
    currentSrc: "file:///video.mp4",
    src: "file:///video.mp4",
    currentTime: 0,
    readyState: 4,
    networkState: 1,
    error: null,
    dataset: {},
    addEventListener(name, callback) { listeners.set(name, callback); },
  };
  const documentRef = {
    documentElement: {},
    querySelectorAll() { return [video]; },
  };
  const values = new Map();
  let writes = 0;
  const storage = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { writes += 1; values.set(key, value); },
  };
  const trace = createPerfTrace();
  let clock = Date.now();
  const observer = createObserver({ documentRef, storage, now: () => clock, onTrace: (type, data) => trace.record(type, data) });
  try {
    observer.start({ clientId: "c", screenId: "s", deviceId: "d" });
    observer.setEnabled(false);
    const before = writes;
    listeners.get("waiting")();
    assert.equal(observer.report().counters.waitingCount, 0);
    assert.equal(writes, before);
    observer.setEnabled(true);
    listeners.get("waiting")();
    listeners.get("playing")();
    video.error = { code: 3 };
    listeners.get("error")();
    assert.equal(observer.report().counters.waitingCount, 1);
    assert.equal(observer.report().counters.playbackErrors, 1);
    clock += 5 * 60 * 1000;
    observer.checkpoint();
    assert.equal(observer.report().session.sequence, 1);
    const types = trace.snapshot().map((event) => event.type);
    assert.ok(types.includes("TELEMETRY_DISABLED"));
    assert.ok(types.includes("TELEMETRY_ENABLED"));
    assert.ok(types.includes("MEDIA_ERROR"));
    assert.ok(types.includes("CHECKPOINT_BUILD_END"));
    assert.ok(types.includes("LOCALSTORAGE_WRITE_END"));
  } finally {
    observer.stop();
    if (originalNavigator === undefined) delete globalThis.navigator;
    else Object.defineProperty(globalThis, "navigator", { configurable: true, value: originalNavigator });
    if (originalMutationObserver === undefined) delete globalThis.MutationObserver;
    else globalThis.MutationObserver = originalMutationObserver;
  }
});
