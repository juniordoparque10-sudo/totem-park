import test from "node:test";
import assert from "node:assert/strict";
import { createPlayerTelemetry, isTelemetryAllowed } from "../src/player-telemetry.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
}

test("telemetry is off by default and requires an allowlist match", () => {
  assert.equal(isTelemetryAllowed({}, { screenId: "A" }), false);
  assert.equal(isTelemetryAllowed({ enabled: true, screenIds: ["B"] }, { screenId: "A" }), false);
  assert.equal(isTelemetryAllowed({ enabled: true, screenIds: ["A"] }, { screenId: "A" }), true);
});

test("disabled telemetry does not collect events", () => {
  const telemetry = createPlayerTelemetry({ identity: { screenId: "A" }, storage: memoryStorage() });
  telemetry.record("PLAYBACK_START", { mediaSource: "CACHE_LOCAL", sizeBytes: 100 });
  assert.equal(telemetry.getReport().counters.localPlaybackCount, 0);
});

test("local playback and traffic saved are cumulative", () => {
  const telemetry = createPlayerTelemetry({ identity: { screenId: "A" }, storage: memoryStorage() });
  telemetry.configure({ enabled: true, screenIds: ["A"] });
  telemetry.record("PLAYBACK_START", { mediaId: "M", mediaSource: "CACHE_LOCAL", sizeBytes: 100 });
  telemetry.record("PLAYBACK_END", { mediaId: "M", mediaSource: "CACHE_LOCAL" });
  telemetry.record("PLAYBACK_START", { mediaId: "M", mediaSource: "CACHE_LOCAL", sizeBytes: 100 });
  const report = telemetry.getReport();
  assert.equal(report.counters.localPlaybackCount, 2);
  assert.equal(report.counters.estimatedTrafficSaved, 200);
});

test("outbox snapshot is idempotent by session and sequence", () => {
  const telemetry = createPlayerTelemetry({ identity: { screenId: "A" }, storage: memoryStorage() });
  telemetry.configure({ enabled: true, screenIds: ["A"], syncIntervalMs: 60_000 });
  const first = telemetry.heartbeat();
  assert.equal(first.outbox.length, 1);
  assert.match(first.outbox[0].id, /:1$/);
  telemetry.acknowledge(1);
  assert.equal(telemetry.getReport().outbox.length, 0);
});

test("transition trace remains bounded and completes", () => {
  const telemetry = createPlayerTelemetry({ identity: { screenId: "A" }, storage: memoryStorage() });
  telemetry.configure({ enabled: true, screenIds: ["A"] });
  const id = telemetry.startTransition({ fromMediaId: "A", toMediaId: "B", reason: "VIDEO_ENDED" });
  telemetry.completeTransition(id);
  assert.equal(telemetry.getReport().transitions[0].result, "SUCCESS");
});
