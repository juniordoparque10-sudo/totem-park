import assert from "node:assert/strict";
import test from "node:test";

import { createTelemetryHistory } from "../src/telemetry-history.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

const identity = { clientId:"client-a", screenId:"screen-a", deviceId:"device-a" };
const operational = (overrides = {}) => ({
  session:{ sessionId:"session-1", sessionStartedAt:"2026-10-28T10:00:00.000Z", uptimeSeconds:0, ...identity, ...(overrides.session || {}) },
  app:{ packageName:"br.com.parksolutions.totempark.player.rcsecurelink", versionCode:69, versionName:"V69" },
  current:{ networkStatus:"ONLINE", playerState:"playing" },
});
const traffic = (overrides = {}) => ({
  dateKey:"2026-10-28",
  appInternetReceivedBytes:100,
  appInternetSentBytes:20,
  mediaDownloadedBytes:50,
  localMediaReusedBytes:200,
  cachePlaybackHits:2,
  remotePlaybackCount:1,
  fallbackPlaybackCount:0,
  ...overrides,
});

test("daily checkpoint reuses absolute traffic counters and remains idempotent after restart", () => {
  const storage = memoryStorage();
  let nowMs = Date.parse("2026-10-28T10:15:00.000Z");
  const history = createTelemetryHistory({ storage, now:() => nowMs, identity });
  history.checkpoint({ trafficDaily:traffic(), operational:operational({ session:{ uptimeSeconds:900 } }) });
  history.checkpoint({ trafficDaily:traffic(), operational:operational({ session:{ uptimeSeconds:900 } }) });

  const restored = createTelemetryHistory({ storage, now:() => nowMs, identity });
  const [day] = restored.pending().days;
  assert.equal(day.data.internetRxBytes, 100);
  assert.equal(day.data.internetTxBytes, 20);
  assert.equal(day.data.mediaDownloadedBytes, 50);
  assert.equal(day.data.cacheReusedBytes, 200);
  assert.equal(day.data.observedUptimeSeconds, 900);
  assert.equal(day.data.cacheHitRate, 2 / 3);
});

test("counter reset or unavailable sample never reduces an accumulated UTC day", () => {
  const history = createTelemetryHistory({ storage:memoryStorage(), now:() => Date.parse("2026-10-28T12:00:00.000Z"), identity });
  history.checkpoint({ trafficDaily:traffic({ appInternetReceivedBytes:500 }), operational:operational() });
  history.checkpoint({ trafficDaily:traffic({ appInternetReceivedBytes:5, appInternetSentBytes:null }), operational:operational() });
  const [day] = history.pending().days;
  assert.equal(day.data.internetRxBytes, 500);
  assert.equal(day.data.internetTxBytes, 20);
});

test("UTC day rotation isolates traffic and splits only explicitly closed playback", () => {
  const storage = memoryStorage();
  const history = createTelemetryHistory({ storage, now:() => Date.parse("2026-10-29T00:01:00.000Z"), identity });
  history.checkpoint({ trafficDaily:traffic({ dateKey:"2026-10-29", appInternetReceivedBytes:7 }), operational:operational({ session:{ uptimeSeconds:3600 } }) });
  history.recordEvents([
    { id:"start", screenId:"screen-a", sessionId:"session-1", type:"PLAYBACK_START", state:"ACTIVE", domain:"playback", atMs:Date.parse("2026-10-28T23:59:30.000Z"), mediaId:"m1", mediaType:"video" },
    { id:"end", screenId:"screen-a", sessionId:"session-1", type:"PLAYBACK_END", state:"IDLE", domain:"playback", atMs:Date.parse("2026-10-29T00:00:30.000Z"), mediaId:"m1", mediaType:"video" },
  ]);
  const byDate = Object.fromEntries(history.pending().days.map((item) => [item.id, item.data]));
  assert.equal(byDate["2026-10-28"].provedPlaybackSeconds, 30);
  assert.equal(byDate["2026-10-29"].provedPlaybackSeconds, 30);
  assert.equal(byDate["2026-10-29"].internetRxBytes, 7);
});

test("open playback followed by a new runtime session is unknown, never proved playback", () => {
  const storage = memoryStorage();
  let nowMs = Date.parse("2026-10-28T11:00:00.000Z");
  const first = createTelemetryHistory({ storage, now:() => nowMs, identity });
  first.recordEvents([{ id:"open", screenId:"screen-a", sessionId:"session-1", type:"PLAYBACK_START", state:"ACTIVE", domain:"playback", atMs:nowMs - 60_000, mediaId:"m1", mediaType:"video" }]);
  first.checkpoint({ trafficDaily:traffic(), operational:operational({ session:{ sessionId:"session-1", uptimeSeconds:60 } }) });

  nowMs += 120_000;
  const restarted = createTelemetryHistory({ storage, now:() => nowMs, identity });
  restarted.checkpoint({ trafficDaily:traffic(), operational:operational({ session:{ sessionId:"session-2", sessionStartedAt:new Date(nowMs).toISOString(), uptimeSeconds:0 } }) });
  const day = restarted.pending().days.find((item) => item.id === "2026-10-28").data;
  assert.equal(day.provedPlaybackSeconds, 0);
  assert.equal(day.unknownInterruptionCount, 1);
  assert.equal(day.restartCount, 1);
});

test("explicit session close remains confirmed across restart", () => {
  const storage = memoryStorage();
  let nowMs = Date.parse("2026-10-28T11:00:00.000Z");
  const first = createTelemetryHistory({ storage, now:() => nowMs, identity });
  first.checkpoint({ trafficDaily:traffic(), operational:operational({ session:{ sessionId:"session-1", uptimeSeconds:60 } }) });
  first.confirmSessionEnd();
  nowMs += 60_000;
  const restarted = createTelemetryHistory({ storage, now:() => nowMs, identity });
  restarted.checkpoint({ trafficDaily:traffic(), operational:operational({ session:{ sessionId:"session-2", sessionStartedAt:new Date(nowMs).toISOString(), uptimeSeconds:0 } }) });
  const pending = restarted.pending();
  const previous = pending.sessions.find((item) => item.id === "session-1").data;
  const day = pending.days.find((item) => item.id === "2026-10-28").data;
  assert.equal(previous.status, "CONFIRMED");
  assert.equal(day.unknownInterruptionCount, 0);
  assert.equal(day.restartCount, 1);
});

test("events retain deterministic ids, 180-day expiry and failures without duplicate replay", () => {
  const storage = memoryStorage();
  const nowMs = Date.parse("2026-10-28T12:00:00.000Z");
  const history = createTelemetryHistory({ storage, now:() => nowMs, identity });
  const failure = { id:"failure-1", screenId:"screen-a", sessionId:"session-1", type:"PLAYBACK_ERROR", state:"ATTENTION", domain:"playback", atMs:nowMs, mediaId:"m1", mediaType:"video", reason:"DECODER" };
  history.recordEvents([failure, failure]);
  const pending = history.pending();
  assert.deepEqual(pending.events.map((item) => item.id), ["failure-1"]);
  assert.equal(pending.events[0].data.expiresAtMs, nowMs + 180 * 24 * 60 * 60 * 1000);
  assert.equal(pending.days[0].data.failureCount, 1);
});

test("legacy or incomplete snapshots are accepted without inventing counters", () => {
  const history = createTelemetryHistory({ storage:memoryStorage(), now:() => Date.parse("2026-10-28T12:00:00.000Z"), identity });
  assert.doesNotThrow(() => history.checkpoint({ trafficDaily:null, operational:{ session:{ sessionId:"legacy" } } }));
  const [day] = history.pending().days;
  assert.equal(day.data.internetRxBytes, 0);
  assert.equal(day.data.provedPlaybackSeconds, 0);
});

test("acknowledge removes only confirmed outbox entries and preserves aggregates", () => {
  const storage = memoryStorage();
  const history = createTelemetryHistory({ storage, now:() => Date.parse("2026-10-28T12:00:00.000Z"), identity });
  history.checkpoint({ trafficDaily:traffic(), operational:operational() });
  history.recordEvents([{ id:"event-1", screenId:"screen-a", sessionId:"session-1", type:"CONNECTION_CHANGE", state:"OFFLINE", domain:"connection", atMs:Date.parse("2026-10-28T12:00:00.000Z") }]);
  history.acknowledge({ days:["2026-10-28"], sessions:["session-1"], events:["event-1"] });
  assert.deepEqual(history.pending(), { days:[], sessions:[], events:[] });
  const restored = createTelemetryHistory({ storage, now:() => Date.parse("2026-10-28T12:01:00.000Z"), identity });
  restored.checkpoint({ trafficDaily:traffic(), operational:operational() });
  assert.equal(restored.pending().days[0].data.internetRxBytes, 100);
});
