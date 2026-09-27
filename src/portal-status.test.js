import test from "node:test";
import assert from "node:assert/strict";
import { getPortalScreenStatus, getTelemetryVisualState } from "./portal-status.js";

test("stale telemetry cannot make a connected screen offline", () => {
  const now = 1_000_000;
  const screen = { id: "screen", clientId: "client", lastSeenAt: now - 10_000, telemetryUpdatedAt: now - 29 * 60_000, telemetry: { schemaVersion: 3 } };
  const config = { enabled: true, screenIds: ["screen"], clientIds: [], deviceIds: [] };
  assert.equal(getPortalScreenStatus(screen, now), "ONLINE");
  assert.equal(getTelemetryVisualState({ screen, config, now }), "STALE");
});

test("recent telemetry does not hide a missing Player heartbeat", () => {
  const now = 1_000_000;
  const screen = { id: "screen", clientId: "client", lastSeenAt: now - 200_000, telemetryUpdatedAt: now - 10_000, telemetry: { schemaVersion: 3 } };
  assert.equal(getPortalScreenStatus(screen, now), "OFFLINE");
  assert.equal(getTelemetryVisualState({ screen, config: { enabled: true, screenIds: ["screen"] }, now }), "ACTIVE");
});
