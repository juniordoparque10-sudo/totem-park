import test from "node:test";
import assert from "node:assert/strict";
import { createPortalScreenOrderTracker, sortClientsAlphabetically } from "../src/portal-status.js";

const now = Date.parse("2026-10-15T12:00:00Z");
const screen = (id, ageMs, extra = {}) => ({ id, name: id, connectedDeviceId: `device-${id}`, lastSeenAt: now - ageMs, ...extra });

test("keeps online screens stable when heartbeat, media or cache data changes", () => {
  const tracker = createPortalScreenOrderTracker({ sortOfflineByLastSignal: true });
  const first = tracker.sort([screen("Bravo", 10_000), screen("Alpha", 20_000)], now);
  assert.deepEqual(first.map((item) => item.id), ["Alpha", "Bravo"]);
  const refreshed = tracker.sort([
    screen("Bravo", 1_000, { cachedItems: 99, nowPlayingTitle: "Nova mídia" }),
    screen("Alpha", 15_000, { cachedItems: 1, nowPlayingTitle: "Outra mídia" }),
  ], now);
  assert.deepEqual(refreshed.map((item) => item.id), ["Alpha", "Bravo"]);
});

test("a screen returning online joins after screens that remained online", () => {
  const tracker = createPortalScreenOrderTracker({ sortOfflineByLastSignal: true });
  tracker.sort([screen("Alpha", 10_000), screen("Bravo", 120_000)], now);
  const returned = tracker.sort([screen("Alpha", 20_000), screen("Bravo", 2_000)], now);
  assert.deepEqual(returned.map((item) => item.id), ["Alpha", "Bravo"]);
});

test("offline screens follow latest real feedback descending", () => {
  const tracker = createPortalScreenOrderTracker({ sortOfflineByLastSignal: true });
  const ordered = tracker.sort([screen("Old", 900_000), screen("Recent", 120_000), screen("Older", 500_000)], now);
  assert.deepEqual(ordered.map((item) => item.id), ["Recent", "Older", "Old"]);
});

test("clients remain alphabetically ordered without mutating source", () => {
  const clients = [{ id:"z", name:"Zulu" }, { id:"a", name:"Ágata" }, { id:"b", name:"Beta" }];
  assert.deepEqual(sortClientsAlphabetically(clients).map((item) => item.id), ["a", "b", "z"]);
  assert.deepEqual(clients.map((item) => item.id), ["z", "a", "b"]);
});
