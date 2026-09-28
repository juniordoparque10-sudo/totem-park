import test from "node:test";
import assert from "node:assert/strict";
import { compareTelemetryScreens, getPortalScreenStatus, getTelemetryVisualState } from "./portal-status.js";

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

test("telemetry screen order stays alphabetical when status and heartbeat change", () => {
  const screens = [
    { id: "b", clientName: "Flluxo", name: "TV Zebra", portalStatus: "ONLINE", lastSeenAt: 900 },
    { id: "a", clientName: "Árvore", name: "TV A", portalStatus: "OFFLINE", lastSeenAt: 100 },
    { id: "c", clientName: "Flluxo", name: "TV Alfa", portalStatus: "ATTENTION", lastSeenAt: 500 },
  ];
  assert.deepEqual([...screens].sort(compareTelemetryScreens).map((screen) => screen.id), ["a", "c", "b"]);
  screens[0].portalStatus = "OFFLINE";
  screens[1].portalStatus = "ONLINE";
  screens[2].lastSeenAt = 1_000;
  assert.deepEqual([...screens].sort(compareTelemetryScreens).map((screen) => screen.id), ["a", "c", "b"]);
});
