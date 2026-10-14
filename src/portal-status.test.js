import test from "node:test";
import assert from "node:assert/strict";
import { comparePortalScreens, compareTelemetryScreens, createPortalScreenOrderTracker, getPortalLastSignalMs, getPortalScreenStatus, getTelemetryVisualState } from "./portal-status.js";

const v5Screen = (now, overrides = {}) => ({
  id: "screen", clientId: "client", connectedDeviceId: "device", lastSeenAt: now - 200_000,
  telemetryUpdatedAt: now - 10_000,
  telemetry: { schemaVersion: 3, current: { networkStatus: "ONLINE" }, session: { screenId: "screen", clientId: "client", deviceId: "device", lastHeartbeatAt:new Date(now - 10_000).toISOString() } },
  ...overrides,
});

test("stale telemetry cannot make a connected screen offline", () => {
  const now = 1_000_000;
  const screen = { id: "screen", clientId: "client", connectedDeviceId:"device", lastSeenAt: now - 10_000, telemetryUpdatedAt: now - 29 * 60_000, telemetry: { schemaVersion: 3 } };
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

test("telemetry screens put online first and then sort by latest communication", () => {
  const screens = [
    { id: "offline-old", clientName: "Flluxo", name: "TV Zebra", portalStatus: "OFFLINE", lastSeenAt: 100 },
    { id: "online-old", clientName: "Árvore", name: "TV A", portalStatus: "ONLINE", lastSeenAt: 200 },
    { id: "offline-new", clientName: "Flluxo", name: "TV Alfa", portalStatus: "OFFLINE", lastSeenAt: 400 },
    { id: "online-new", clientName: "Zebra", name: "TV Z", portalStatus: "ONLINE", lastSeenAt: 300 },
  ];
  assert.deepEqual(
    [...screens].sort(compareTelemetryScreens).map((screen) => screen.id),
    ["online-new", "online-old", "offline-new", "offline-old"]
  );
});

test("legacy comparator remains deterministic while dashboard tracker owns presence order", () => {
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
  assert.deepEqual(order(), ["old", "online-a", "tie-a", "online-b", "tie-b", "recent"]);
  screens[0].lastSeenAt += 5_000;
  screens[1].lastSeenAt += 4_000;
  assert.deepEqual(order(), ["old", "online-a", "tie-a", "online-b", "tie-b", "recent"]);
  screens[0].lastSeenAt = now - 180_000;
  assert.deepEqual(order(), ["old", "online-a", "tie-a", "online-b", "tie-b", "recent"]);
  screens[0].lastSeenAt = now - 1_000;
  assert.deepEqual(order(), ["old", "online-a", "tie-a", "online-b", "tie-b", "recent"]);
});

test("dashboard screen order remains stable across heartbeats and appends reconnecting screens", () => {
  const now = 1_000_000;
  const tracker = createPortalScreenOrderTracker();
  const a = { id:"a", name:"A", connectedDeviceId:"a", lastSeenAt:now - 5_000 };
  const b = { id:"b", name:"B", connectedDeviceId:"b", lastSeenAt:now - 10_000 };
  const c = { id:"c", name:"C", connectedDeviceId:"c", lastSeenAt:now - 200_000 };
  assert.deepEqual(tracker.sort([b,c,a], now).map(({ id }) => id), ["a","b","c"]);
  a.lastSeenAt = now - 1_000;
  b.lastSeenAt = now - 2_000;
  assert.deepEqual(tracker.sort([b,a,c], now).map(({ id }) => id), ["a","b","c"]);
  a.lastSeenAt = now - 200_000;
  assert.deepEqual(tracker.sort([a,b,c], now).map(({ id }) => id), ["b","a","c"]);
  a.lastSeenAt = now + 1_000;
  assert.deepEqual(tracker.sort([a,b,c], now + 2_000).map(({ id }) => id), ["b","a","c"]);
});

test("attention interval does not count as an offline transition for stable ordering", () => {
  const now = 1_000_000;
  const tracker = createPortalScreenOrderTracker();
  const first = { id:"first", connectedDeviceId:"a", lastSeenAt:now - 5_000 };
  const second = { id:"second", connectedDeviceId:"b", lastSeenAt:now - 10_000 };
  assert.deepEqual(tracker.sort([first,second], now).map(({ id }) => id), ["first","second"]);
  first.lastSeenAt = now - 60_000;
  assert.deepEqual(tracker.sort([second,first], now).map(({ id }) => id), ["first","second"]);
  first.lastSeenAt = now + 1_000;
  assert.deepEqual(tracker.sort([second,first], now + 2_000).map(({ id }) => id), ["first","second"]);
  first.lastSeenAt = now - 100_000;
  assert.deepEqual(tracker.sort([first,second], now).map(({ id }) => id), ["second","first"]);
  first.lastSeenAt = now + 3_000;
  assert.deepEqual(tracker.sort([first,second], now + 4_000).map(({ id }) => id), ["second","first"]);
});

test("telemetry tracker keeps same-id screens from different clients stable across heartbeats", () => {
  const now = 1_000_000;
  const tracker = createPortalScreenOrderTracker({
    getKey: (screen) => `${screen.clientId}/${screen.id}`,
  });
  const eco = { id:"screen", clientId:"eco", name:"Zulu", connectedDeviceId:"eco-device", lastSeenAt:now - 5_000 };
  const kimura = { id:"screen", clientId:"kimura", name:"Alpha", connectedDeviceId:"kimura-device", lastSeenAt:now - 200_000 };

  assert.deepEqual(tracker.sort([kimura,eco], now).map(({ clientId }) => clientId), ["eco","kimura"]);
  kimura.lastSeenAt = now - 10_000;
  assert.deepEqual(tracker.sort([kimura,eco], now).map(({ clientId }) => clientId), ["eco","kimura"]);
  kimura.lastSeenAt = now - 1_000;
  eco.lastSeenAt = now - 2_000;
  assert.deepEqual(tracker.sort([kimura,eco], now).map(({ clientId }) => clientId), ["eco","kimura"]);
});
