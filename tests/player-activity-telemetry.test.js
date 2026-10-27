import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { createPlayerActivityTelemetry } from "../src/player-activity-telemetry.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("connection is independent from real playback for video, image and template", () => {
  let nowMs = 1_000;
  const telemetry = createPlayerActivityTelemetry({ storage: memoryStorage(), now: () => nowMs, identity: { screenId: "s1" } });
  telemetry.startPlayback({ id: "v1", type: "video" });
  telemetry.setConnection("OFFLINE");
  assert.equal(telemetry.getState().playback.status, "ACTIVE");
  assert.equal(telemetry.getState().connectionStatus, "OFFLINE");
  nowMs += 100;
  telemetry.finishPlayback("ENDED");
  telemetry.startPlayback({ id: "i1", type: "image" });
  telemetry.finishPlayback("DURATION_COMPLETE");
  telemetry.startPlayback({ id: "t1", type: "template" });
  assert.deepEqual(telemetry.drainBatch(20).filter((event) => event.domain === "playback").map((event) => event.mediaType).filter(Boolean), ["video", "video", "image", "image", "template"]);
});

test("heartbeat, uptime and repeated starts create no inferred or duplicate events", () => {
  const telemetry = createPlayerActivityTelemetry({ storage: memoryStorage(), now: () => 2_000, identity: { screenId: "s1" } });
  telemetry.setConnection("ONLINE");
  telemetry.setConnection("ONLINE");
  telemetry.startPlayback({ id: "v1", type: "video" });
  telemetry.startPlayback({ id: "v1", type: "video" });
  assert.deepEqual(telemetry.drainBatch(20).map((event) => event.type), ["PLAYBACK_START"]);
});

test("item change closes the prior item, interrupt/recover are explicit, and journal is bounded", () => {
  let nowMs = 3_000;
  const telemetry = createPlayerActivityTelemetry({ storage: memoryStorage(), now: () => nowMs++, maxEvents: 4, identity: { screenId: "s1" } });
  telemetry.startPlayback({ id: "a", type: "image" });
  telemetry.startPlayback({ id: "b", type: "template" });
  telemetry.interrupt("MAINTENANCE");
  telemetry.recover({ id: "b", type: "template" });
  telemetry.finishPlayback("ENDED");
  const events = telemetry.drainBatch(20);
  assert.equal(events.length, 4);
  assert.deepEqual(events.map((event) => event.type), ["PLAYBACK_START", "INTERRUPTED", "RECOVERED", "PLAYBACK_END"]);
});

test("authoritative playback resumption recovers the same interrupted item", () => {
  const telemetry = createPlayerActivityTelemetry({ storage: memoryStorage(), now: () => 3_500, identity: { screenId: "s1" } });
  telemetry.startPlayback({ id: "same", type: "video" });
  telemetry.interrupt("BLACKOUT");
  telemetry.startPlayback({ id: "same", type: "video" });
  assert.deepEqual(telemetry.drainBatch(20).map((event) => event.type), ["PLAYBACK_START", "INTERRUPTED", "RECOVERED"]);
});

test("acknowledge removes only confirmed ids and restart preserves the remaining journal", () => {
  const storage = memoryStorage();
  const telemetry = createPlayerActivityTelemetry({ storage, now: () => 4_000, identity: { screenId: "s1" } });
  telemetry.startPlayback({ id: "a", type: "image" });
  telemetry.finishPlayback("ENDED");
  const [first] = telemetry.drainBatch(20);
  telemetry.acknowledge([first.id]);
  const restored = createPlayerActivityTelemetry({ storage, now: () => 5_000, identity: { screenId: "s1" } });
  assert.deepEqual(restored.drainBatch(20).map((event) => event.type), ["PLAYBACK_END"]);
});

test("PlayerPage wires V2-A only to authoritative lifecycle events", () => {
  const source = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(source, /createPlayerActivityTelemetry/);
  assert.match(source, /activityTelemetryRef\.current\.startPlayback\(/);
  assert.match(source, /activityTelemetryRef\.current\.finishPlayback\("ENDED"\)/);
  assert.match(source, /activityTelemetryRef\.current\.finishPlayback\("ERROR"\)/);
  assert.match(source, /activityTelemetryRef\.current\.interrupt\(/);
  assert.match(source, /activityTelemetryRef\.current\.setConnection\("ONLINE"\)/);
  assert.match(source, /activityTelemetryRef\.current\.setConnection\("OFFLINE"\)/);
  const heartbeatBody = source.slice(source.indexOf("async function sendHeartbeat"), source.indexOf("sendHeartbeat();", source.indexOf("async function sendHeartbeat")));
  assert.match(heartbeatBody, /syncPlayerActivityBatch/);
  assert.match(heartbeatBody, /activityTelemetryRef\.current\.acknowledge/);
});

test("connection transitions are explicit and remain separate from playback", () => {
  let nowMs = 6_000;
  const telemetry = createPlayerActivityTelemetry({ storage: memoryStorage(), now: () => nowMs++, identity: { screenId:"s1" } });
  telemetry.startPlayback({ id:"v1", type:"video" });
  telemetry.setConnection("OFFLINE");
  telemetry.setConnection("ONLINE");
  const events = telemetry.drainBatch(20);
  assert.deepEqual(events.map(({ domain,state }) => ({ domain,state })), [
    { domain:"playback", state:"ACTIVE" },
    { domain:"connection", state:"OFFLINE" },
    { domain:"connection", state:"ONLINE" },
  ]);
});
