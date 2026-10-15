import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTelemetryActivityPeriods,
  normalizeTelemetryActivityEvents,
  summarizeTelemetryActivity,
} from "../src/telemetry-activity-history.js";

const range = { startMs: Date.parse("2026-10-15T00:00:00Z"), endMs: Date.parse("2026-10-16T00:00:00Z") };

test("normalizes only valid V2-A events for the selected screen and interval", () => {
  const screen = {
    id: "screen-a",
    telemetry: { activity: { events: [
      { id: "b", screenId: "screen-a", state: "OFFLINE", at: "2026-10-15T10:30:00Z", description: "desligada" },
      { id: "a", screenId: "screen-a", state: "active", at: "2026-10-15T08:00:00Z" },
      { id: "c", screenId: "screen-a", state: "ATTENTION", atMs: Date.parse("2026-10-15T09:00:00Z") },
      { id: "d", screenId: "screen-a", state: "IDLE", timestamp: { toMillis: () => Date.parse("2026-10-15T09:30:00Z") } },
      { id: "e", screenId: "screen-a", state: "INTERRUPTED", occurredAt: "2026-10-15T10:00:00Z" },
      { id: "f", screenId: "screen-a", state: "RECOVERED", at: "2026-10-15T11:00:00Z" },
      { id: "wrong-screen", screenId: "screen-b", state: "ACTIVE", at: "2026-10-15T08:00:00Z" },
      { id: "wrong-state", screenId: "screen-a", state: "PLAYING", at: "2026-10-15T08:00:00Z" },
      { id: "wrong-date", screenId: "screen-a", state: "ACTIVE", at: "not-a-date" },
      { id: "outside", screenId: "screen-a", state: "ACTIVE", at: "2026-10-14T23:59:59Z" },
    ] } },
  };

  const events = normalizeTelemetryActivityEvents(screen, range);
  assert.deepEqual(events.map(({ id, state }) => ({ id, state })), [
    { id: "a", state: "ACTIVE" },
    { id: "c", state: "ATTENTION" },
    { id: "d", state: "IDLE" },
    { id: "e", state: "INTERRUPTED" },
    { id: "b", state: "OFFLINE" },
    { id: "f", state: "RECOVERED" },
  ]);
  assert.deepEqual(Object.keys(events[0]), ["id", "screenId", "state", "atMs", "description"]);
  assert.equal(events[0].description, "");
});

test("uses timestamp then identifier for deterministic ordering and caps results", () => {
  const at = "2026-10-15T12:00:00Z";
  const events = Array.from({ length: 520 }, (_, index) => ({ id: String(519 - index).padStart(3, "0"), screenId: "screen-a", state: "ACTIVE", at }));
  const normalized = normalizeTelemetryActivityEvents({ id: "screen-a", telemetry: { activity: { events } } }, range);
  assert.equal(normalized.length, 500);
  assert.equal(normalized[0].id, "000");
  assert.equal(normalized.at(-1).id, "499");
});

test("builds only closed periods and never extends the last event", () => {
  const events = normalizeTelemetryActivityEvents({ id: "screen-a", telemetry: { activity: { events: [
    { id: "1", screenId: "screen-a", state: "ACTIVE", at: "2026-10-15T07:00:00Z" },
    { id: "2", screenId: "screen-a", state: "OFFLINE", at: "2026-10-15T11:00:00Z" },
    { id: "3", screenId: "screen-a", state: "ACTIVE", at: "2026-10-15T14:00:00Z" },
    { id: "4", screenId: "screen-a", state: "OFFLINE", at: "2026-10-15T18:00:00Z" },
  ] } } }, range);
  const periods = buildTelemetryActivityPeriods(events, range);
  assert.equal(periods.length, 3);
  assert.deepEqual(periods.map((period) => period.durationMs), [4, 3, 4].map((hours) => hours * 3600000));
  assert.equal(periods.at(-1).endMs, Date.parse("2026-10-15T18:00:00Z"));
});

test("summarizes proved durations and activation/deactivation marks", () => {
  const periods = [
    { state: "ACTIVE", startMs: 1000, endMs: 5000, durationMs: 4000 },
    { state: "ATTENTION", startMs: 5000, endMs: 7000, durationMs: 2000 },
    { state: "OFFLINE", startMs: 7000, endMs: 10000, durationMs: 3000 },
    { state: "RECOVERED", startMs: 10000, endMs: 11000, durationMs: 1000 },
    { state: "INTERRUPTED", startMs: 11000, endMs: 12000, durationMs: 1000 },
  ];
  assert.deepEqual(summarizeTelemetryActivity(periods), {
    totalActiveMs: 5000,
    totalOfflineMs: 4000,
    totalAttentionMs: 2000,
    totalKnownMs: 11000,
    activePeriods: 2,
    offlinePeriods: 2,
    attentionPeriods: 1,
    firstActivationAtMs: 1000,
    lastDeactivationAtMs: 11000,
  });
});

test("never infers history from heartbeat, session or uptime fields", () => {
  const screen = { id: "screen-a", lastSeenAt: "2026-10-15T08:00:00Z", sessionStartedAt: "2026-10-15T07:00:00Z", lastHeartbeatAt: "2026-10-15T08:00:00Z", uptimeSeconds: 3600 };
  const events = normalizeTelemetryActivityEvents(screen, range);
  assert.deepEqual(events, []);
  assert.deepEqual(buildTelemetryActivityPeriods(events, range), []);
  assert.equal(summarizeTelemetryActivity([]).totalKnownMs, 0);
});

test("a single event or equal timestamps cannot create inferred or negative duration", () => {
  const one = [{ id: "a", screenId: "screen-a", state: "ACTIVE", atMs: 1000, description: "" }];
  assert.deepEqual(buildTelemetryActivityPeriods(one, { startMs: 0, endMs: 5000 }), []);
  const equal = [...one, { id: "b", screenId: "screen-a", state: "OFFLINE", atMs: 1000, description: "" }];
  assert.deepEqual(buildTelemetryActivityPeriods(equal, { startMs: 0, endMs: 5000 }), []);
});
