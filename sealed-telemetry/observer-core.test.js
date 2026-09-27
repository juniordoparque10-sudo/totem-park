import test from "node:test";
import assert from "node:assert/strict";
import { APP_VERSION, CHECKPOINT_MS, createObserver, CURRENT_KEY_STORAGE_KEY, currentSessionCheckpoint, HISTORY_AT_KEY, isAllowed, STORAGE_KEY, TELEMETRY_SCHEMA_VERSION, VERSION_STORAGE_KEY } from "./observer-core.js";

test("only an explicit pilot allowlist enables operational telemetry", () => {
  const identity = { screenId: "pilot", clientId: "client", deviceId: "device" };
  assert.equal(isAllowed({ enabled: false, screenIds: ["pilot"] }, identity), false);
  assert.equal(isAllowed({ enabled: true, screenIds: [] }, identity), false);
  assert.equal(isAllowed({ enabled: true, screenIds: ["pilot"] }, identity), true);
});

test("in-place migration preserves binding, auth and media cache while dropping old telemetry", () => {
  const values = new Map([
    [STORAGE_KEY, "old-outbox"], [HISTORY_AT_KEY, "old-history"], [CURRENT_KEY_STORAGE_KEY, "old-current"],
    ["totempark-tv-connection", "binding"], ["totempark-device-id", "device"], ["media-cache", "keep"],
  ]);
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const observer = createObserver({ storage });
  observer.start({ clientId: "client", screenId: "pilot", deviceId: "device" });
  assert.equal(values.get(VERSION_STORAGE_KEY), `${TELEMETRY_SCHEMA_VERSION}:${APP_VERSION}`);
  for (const key of [STORAGE_KEY, HISTORY_AT_KEY, CURRENT_KEY_STORAGE_KEY]) assert.equal(values.has(key), false);
  for (const key of ["totempark-tv-connection", "totempark-device-id", "media-cache"]) assert.ok(values.has(key));
  observer.stop();
});

test("operational checkpoints start immediately, contain no media fields, and heartbeat without DOM access", () => {
  const originalDocument = globalThis.document;
  const originalNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, "document", { configurable: true, get() { throw Error("DOM accessed"); } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: true } });
  try {
    let clock = 1_000_000;
    const values = new Map();
    const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
    const sent = [];
    const observer = createObserver({ storage, now: () => clock, onCheckpoint: (item) => sent.push(item) });
    observer.start({ clientId: "c", screenId: "s", deviceId: "d" });
    observer.checkpoint();
    assert.equal(sent.length, 0);
    observer.setEnabled(true);
    assert.equal(sent.length, 1);
    const first = sent[0].payload;
    assert.equal(first.schemaVersion, 3);
    assert.equal(first.session.appVersion, APP_VERSION);
    assert.equal(first.current.connectionStatus, "ONLINE");
    assert.deepEqual(Object.keys(first.current).sort(), ["connectionStatus", "lastSignalAt"]);
    assert.deepEqual(Object.keys(first.counters), ["activeTimeMs"]);
    assert.equal(JSON.stringify(first).match(/mediaSource|currentSrc|playing|waiting|stalled|error|video|image/i), null);
    clock += CHECKPOINT_MS;
    observer.checkpoint();
    assert.equal(sent.length, 2);
    assert.equal(sent[1].payload.session.sequence, 2);
    assert.equal(sent[1].payload.counters.activeTimeMs, CHECKPOINT_MS);
    assert.equal(observer.pending().length, 2);
    observer.acknowledge(first.session.sessionId, 1);
    assert.equal(observer.pending().length, 1);
    observer.stop();
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
    if (originalNavigator === undefined) delete globalThis.navigator;
    else Object.defineProperty(globalThis, "navigator", { configurable: true, value: originalNavigator });
  }
});

test("old session cannot become the current checkpoint", () => {
  const old = { sequence: 3, payload: { session: { sessionId: "old" } } };
  const current = { sequence: 1, payload: { session: { sessionId: "current" } } };
  assert.equal(currentSessionCheckpoint([old], "current"), null);
  assert.equal(currentSessionCheckpoint([old, current], "current"), current);
});
