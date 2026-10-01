import test from "node:test";
import assert from "node:assert/strict";
import { createPlayerTelemetry, isTelemetryAllowed } from "../src/player-telemetry.js";

function memoryStorage() {
  const values = new Map();
  return { getItem:(key) => values.get(key) || null, setItem:(key, value) => values.set(key, value) };
}

test("telemetry is off by default and requires an allowlist match", () => {
  assert.equal(isTelemetryAllowed({}, { screenId:"A" }), false);
  assert.equal(isTelemetryAllowed({ enabled:true, screenIds:["B"] }, { screenId:"A" }), false);
  assert.equal(isTelemetryAllowed({ enabled:true, screenIds:["A"] }, { screenId:"A" }), true);
});

test("one app execution keeps the same session between heartbeats and monotonic uptime grows", () => {
  let wall = Date.parse("2026-10-01T12:00:00.000Z");
  let monotonic = 1000;
  const telemetry = createPlayerTelemetry({ identity:{ screenId:"A" }, storage:memoryStorage(), now:() => wall, monotonicNow:() => monotonic });
  telemetry.configure({ enabled:true, screenIds:["A"] });
  const first = telemetry.heartbeat().snapshot;
  wall += 15_000; monotonic += 15_000;
  const second = telemetry.heartbeat().snapshot;
  assert.equal(second.session.sessionId, first.session.sessionId);
  assert.equal(second.session.sessionStartedAt, first.session.sessionStartedAt);
  assert.equal(first.session.uptimeSeconds, 0);
  assert.equal(second.session.uptimeSeconds, 15);
});

test("operational heartbeat keeps a compact schema 3 payload", () => {
  const telemetry = createPlayerTelemetry({ identity:{ screenId:"A", deviceId:"D" }, storage:memoryStorage() });
  telemetry.configure({ enabled:true, screenIds:["A"] });
  telemetry.updateOperational({
    app:{ packageName:"br.com.parksolutions.totempark", versionCode:26, versionName:"1.0.0-v26-template-layout-stability-rc" },
    playerState:"playing", currentItemId:"M", currentItemType:"VIDEO", currentMediaSource:"LOCAL",
    cache:{ cacheStatus:"pronto", cachedItems:2, totalCacheableItems:2 },
  });
  const result = telemetry.heartbeat();
  assert.equal(result.snapshot.schemaVersion, 3);
  assert.equal(result.snapshot.app.versionCode, 26);
  assert.equal(result.snapshot.current.currentMediaSource, "LOCAL");
  assert.equal(result.snapshot.cache.cacheStatus, "pronto");
  assert.equal("counters" in result.snapshot, false);
});

test("disabled or failing telemetry remains a no-op side effect", () => {
  const telemetry = createPlayerTelemetry({ identity:{ screenId:"A" }, storage:memoryStorage() });
  assert.doesNotThrow(() => telemetry.updateOperational({ playerState:"error" }));
  assert.equal(telemetry.heartbeat(), null);
});

test("history outbox remains bounded and acknowledged independently from heartbeat", () => {
  const telemetry = createPlayerTelemetry({ identity:{ screenId:"A" }, storage:memoryStorage() });
  telemetry.configure({ enabled:true, screenIds:["A"], syncIntervalMs:60_000 });
  const first = telemetry.heartbeat();
  assert.equal(first.outbox.length, 1);
  assert.match(first.outbox[0].id, /:1$/);
  telemetry.acknowledge(1);
  assert.equal(telemetry.getReport().outbox.length, 0);
});
