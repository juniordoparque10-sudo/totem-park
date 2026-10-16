import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { getPlaybackRemainingAfterWake, subscribePlayerRuntimeWake } from "../src/player-runtime-recovery.js";
import { getActivePlaylistListenerDependencies } from "../src/active-playlist-listener.js";
import { selectFallbackTemplates } from "../src/player-playlist-boundary.js";

test("runtime wake reconciles elapsed playback without erasing valid remaining state", () => {
  assert.equal(getPlaybackRemainingAfterWake({ remainingMs: 15_000, startedAtMs: 1_000, nowMs: 7_000 }), 9_000);
  assert.equal(getPlaybackRemainingAfterWake({ remainingMs: 10_000, startedAtMs: 0, nowMs: 20_000 }), 10_000);
  const listeners = new Map();
  let wakes = 0;
  const stop = subscribePlayerRuntimeWake(() => { wakes += 1; }, {
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
  }, null);
  listeners.get("resume")();
  assert.equal(wakes, 1);
  stop();
  assert.equal(listeners.size, 0);
});

test("heartbeat snapshots do not resubscribe the active playlist", () => {
  const first = getActivePlaylistListenerDependencies({ appBuildMode: "playerRc", clientId: "c1", screen: { id: "s1", playlistId: "p1", lastSeenAt: 1 } });
  const heartbeat = getActivePlaylistListenerDependencies({ appBuildMode: "playerRc", clientId: "c1", screen: { id: "s1", playlistId: "p1", lastSeenAt: 2 } });
  assert.deepEqual(first, heartbeat);
  assert.equal(first[2], null);
});

test("strict experimental playlist never substitutes the template library", () => {
  assert.deepEqual(selectFallbackTemplates([], [{ id: "clock" }], true), []);
  assert.deepEqual(selectFallbackTemplates([{ id: "media" }], [{ id: "clock" }], false), []);
});

test("Player restores cached playlist, reconciles wake and cancels superseded cache runs", () => {
  const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const cache = fs.readFileSync(new URL("../src/offline-player-cache.js", import.meta.url), "utf8");
  assert.match(app, /subscribePlayerRuntimeWake\([\s\S]*?setRuntimeWakeRevision/);
  assert.match(app, /readCachedPlayerDocument\([\s\S]*?expectedId:\s*activePlaylistId/);
  assert.match(app, /selectFallbackTemplates\(activePlaylistItems, screenTemplates, IS_STRICT_PLAYLIST_EXPERIMENT\)/);
  assert.match(app, /getPlaybackRemainingAfterWake\(/);
  assert.match(app, /useState\(\(\) => !IS_SECURE_LINK_SPLASH_BUILD\)/);
  assert.match(cache, /options\.shouldContinue\?\.\(\) === false[\s\S]*?superseded = true/);
});

test("network loss does not clear link, cache or playback state", () => {
  const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /addEventListener\(["']offline["'][\s\S]{0,300}(clearTvConnection|clearScreenMediaCache|setMediaIndex\(0\))/);
  assert.match(app, /setMaintenanceMode\(/);
  assert.match(app, /setBlackoutMode\(/);
  assert.match(app, /setPauseMode\(/);
});
