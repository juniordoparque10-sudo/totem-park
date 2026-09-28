import test from "node:test";
import assert from "node:assert/strict";
import { comparePortalScreens, compareTelemetryScreens, getPortalScreenStatus, getTelemetryVisualState } from "./portal-status.js";

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

test("online screens stay alphabetical as heartbeats change", () => {
  const screens = [
    { id: "b", clientName: "Flluxo", name: "TV Zebra", portalStatus: "ONLINE", lastSeenAt: 900 },
    { id: "a", clientName: "Árvore", name: "TV A", portalStatus: "ONLINE", lastSeenAt: 100 },
    { id: "c", clientName: "Flluxo", name: "TV Alfa", portalStatus: "ONLINE", lastSeenAt: 500 },
  ];
  assert.deepEqual([...screens].sort(compareTelemetryScreens).map((screen) => screen.id), ["a", "c", "b"]);
  screens[0].lastSeenAt = 2_000;
  screens[1].lastSeenAt = 3_000;
  screens[2].lastSeenAt = 1_000;
  assert.deepEqual([...screens].sort(compareTelemetryScreens).map((screen) => screen.id), ["a", "c", "b"]);
});

test("offline screens follow online and sort by last communication", () => {
  const now = 1_000_000;
  const screens = [
    { id: "old", clientName: "Árvore", name: "TV A", connectedDeviceId: "a", lastSeenAt: now - 300_000 },
    { id: "online-b", clientName: "Flluxo", name: "TV B", connectedDeviceId: "b", lastSeenAt: now - 5_000 },
    { id: "tie-b", clientName: "Flluxo", name: "TV B", connectedDeviceId: "c", lastSeenAt: now - 200_000 },
    { id: "tie-a", clientName: "Flluxo", name: "TV A", connectedDeviceId: "d", lastSeenAt: now - 200_000 },
    { id: "recent", clientName: "Zebra", name: "TV Z", connectedDeviceId: "e", lastSeenAt: now - 150_000 },
    { id: "online-a", clientName: "Árvore", name: "TV A", connectedDeviceId: "f", lastSeenAt: now - 10_000 },
  ];
  const order = () => [...screens].sort((left, right) => comparePortalScreens(left, right, now)).map((screen) => screen.id);
  assert.deepEqual(order(), ["online-a", "online-b", "recent", "tie-a", "tie-b", "old"]);
  screens[0].lastSeenAt += 5_000;
  screens[1].lastSeenAt += 4_000;
  assert.deepEqual(order(), ["online-a", "online-b", "recent", "tie-a", "tie-b", "old"]);
  screens[0].lastSeenAt = now - 180_000;
  assert.deepEqual(order(), ["online-a", "online-b", "recent", "old", "tie-a", "tie-b"]);
  screens[0].lastSeenAt = now - 1_000;
  assert.deepEqual(order(), ["old", "online-a", "online-b", "recent", "tie-a", "tie-b"]);
});
