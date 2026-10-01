import test from "node:test";
import assert from "node:assert/strict";
import { comparePortalScreens, compareTelemetryScreens, getPortalLastSignalMs, getPortalScreenStatus, getTelemetryVisualState } from "./portal-status.js";

const v5Screen = (now, overrides = {}) => ({
  id: "screen", clientId: "client", connectedDeviceId: "device", lastSeenAt: now - 200_000,
  telemetryUpdatedAt: now - 10_000,
  telemetry: { schemaVersion: 3, current: { networkStatus: "ONLINE" }, session: { screenId: "screen", clientId: "client", deviceId: "device", lastHeartbeatAt:new Date(now - 10_000).toISOString() } },
  ...overrides,
});

test("stale telemetry cannot make a connected screen offline", () => {
  const now = 1_000_000;
  const screen = { id: "screen", clientId: "client", lastSeenAt: now - 10_000, telemetryUpdatedAt: now - 29 * 60_000, telemetry: { schemaVersion: 3 } };
  const config = { enabled: true, screenIds: ["screen"], clientIds: [], deviceIds: [] };
  assert.equal(getPortalScreenStatus(screen, now), "ONLINE");
  assert.equal(getTelemetryVisualState({ screen, config, now }), "STALE");
});

test("first matching V5 checkpoint makes a screen online without waiting for Player heartbeat", () => {
  const now = 1_000_000;
  const screen = v5Screen(now);
  assert.equal(getPortalLastSignalMs(screen), now - 10_000);
  assert.equal(getPortalScreenStatus(screen, now), "ONLINE");
  assert.equal(getTelemetryVisualState({ screen, config: { enabled: true, screenIds: ["screen"] }, now }), "ACTIVE");
});

test("V5 checkpoint uses 45-second attention and 90-second offline boundaries", () => {
  const now = 1_000_000;
  const screen = v5Screen(now);
  assert.equal(getPortalScreenStatus(screen, now + 34_000), "ONLINE");
  assert.equal(getPortalScreenStatus(screen, now + 35_000), "ATTENTION");
  assert.equal(getPortalScreenStatus(screen, now + 79_000), "ATTENTION");
  assert.equal(getPortalScreenStatus(screen, now + 80_000), "OFFLINE");
  screen.telemetry.session.lastHeartbeatAt = new Date(now + 80_000).toISOString();
  assert.equal(getPortalScreenStatus(screen, now + 80_000), "ONLINE");
});

test("old, unmatched or legacy telemetry cannot replace Player presence", () => {
  const now = 1_000_000;
  assert.equal(getPortalScreenStatus(v5Screen(now, { telemetryUpdatedAt: now - 200_000, telemetry: { schemaVersion:3, current:{ networkStatus:"ONLINE" }, session:{ screenId:"screen", clientId:"client", deviceId:"device", lastHeartbeatAt:new Date(now - 200_000).toISOString() } } }), now), "OFFLINE");
  assert.equal(getPortalScreenStatus(v5Screen(now, { telemetry: { schemaVersion: 3, current: { connectionStatus: "ONLINE" }, session: { screenId: "other", clientId: "client", deviceId: "device" } } }), now), "OFFLINE");
  assert.equal(getPortalScreenStatus(v5Screen(now, { telemetry: { schemaVersion: 2 }, lastSeenAt: now - 10_000 }), now), "ONLINE");
  assert.equal(getPortalScreenStatus(v5Screen(now, { telemetry: { schemaVersion: 2 } }), now), "OFFLINE");
  const legacy = v5Screen(now, { telemetry: { schemaVersion: 2 }, lastSeenAt: now - 44_000 });
  assert.equal(getPortalScreenStatus(legacy, now), "ONLINE");
  legacy.lastSeenAt = now - 45_000;
  assert.equal(getPortalScreenStatus(legacy, now), "ATTENTION");
  legacy.lastSeenAt = now - 89_000;
  assert.equal(getPortalScreenStatus(legacy, now), "ATTENTION");
  legacy.lastSeenAt = now - 90_000;
  assert.equal(getPortalScreenStatus(legacy, now), "OFFLINE");
});

test("V5 checkpoints change presence without reordering screens that remain online", () => {
  const now = 1_000_000;
  const first = v5Screen(now, { id: "a", name: "TV A", clientName: "ECO", telemetry: { schemaVersion: 3, current: { connectionStatus: "ONLINE" }, session: { screenId: "a", clientId: "client", deviceId: "device" } } });
  const second = v5Screen(now, { id: "b", name: "TV B", clientName: "ECO", telemetry: { schemaVersion: 3, current: { connectionStatus: "ONLINE" }, session: { screenId: "b", clientId: "client", deviceId: "device" } } });
  const order = () => [second, first].sort((left, right) => comparePortalScreens(left, right, now)).map((screen) => screen.id);
  assert.deepEqual(order(), ["a", "b"]);
  second.telemetryUpdatedAt = now - 1_000;
  first.telemetryUpdatedAt = now - 5_000;
  assert.deepEqual(order(), ["a", "b"]);
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
