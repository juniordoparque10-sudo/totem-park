import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("flavor BASIC preserva todos os handlers de comandos remotos da V73", () => {
  const commands = [
    "exitTv",
    "reload",
    "refresh",
    "clearCache",
    "pause",
    "play",
    "blackout",
    "maintenance",
    "clear",
    "overlay",
    "takeover",
  ];

  for (const command of commands) {
    assert.match(app, new RegExp(`remoteCommand\\.type === ["']${command}["']`), `handler ausente: ${command}`);
  }
  assert.match(app, /executePlaylistNavigationCommand\(remoteCommand, playlistNavigationHandlersRef\.current\)/);
});

test("listener de comandos permanece separado do heartbeat BASIC", () => {
  const listener = app.indexOf("const unsubscribe = onSnapshot(screenDocRef, async (snapshot) =>");
  const heartbeat = app.indexOf("buildBasicScreenHeartbeatUpdate({");
  const interval = app.indexOf("OPERATIONAL_HEARTBEAT_INTERVAL_MS");

  assert.ok(listener > 0);
  assert.ok(heartbeat > 0);
  assert.ok(interval > 0);
  assert.notEqual(listener, heartbeat);
  assert.doesNotMatch(app.slice(listener, listener + 300), /setInterval|OPERATIONAL_HEARTBEAT_INTERVAL_MS/);
});
