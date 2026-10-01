import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildOperationalSnapshot,
  getPortalCurrentMediaSource,
  isOperationalHeartbeatFresh,
  normalizeOperationalMediaSource,
  OPERATIONAL_HEARTBEAT_INTERVAL_MS,
} from "../src/operational-telemetry.js";

test("media source normalization represents the effective playback source", () => {
  assert.equal(normalizeOperationalMediaSource("local"), "LOCAL");
  assert.equal(normalizeOperationalMediaSource("cache"), "LOCAL");
  assert.equal(normalizeOperationalMediaSource("remote"), "REMOTE");
  assert.equal(normalizeOperationalMediaSource("internet"), "REMOTE");
  assert.equal(normalizeOperationalMediaSource("INTERNET_FALLBACK"), "FALLBACK");
  assert.equal(normalizeOperationalMediaSource("fallback"), "FALLBACK");
  assert.equal(normalizeOperationalMediaSource("mixed"), "MIXED");
  assert.equal(normalizeOperationalMediaSource("remote", { template:true }), "TEMPLATE");
});

test("cache status never invents current media source", () => {
  const snapshot = buildOperationalSnapshot({ currentItem:{ id:"A", type:"Imagem", currentMediaSource:"remote" }, cache:{ cacheStatus:"pronto", cachedItems:10, totalCacheableItems:10 } });
  assert.equal(snapshot.currentMediaSource, "REMOTE");
});

test("a real local failure is reported as FALLBACK at the telemetry boundary", () => {
  const snapshot = buildOperationalSnapshot({ currentItem:{ id:"A", type:"Vídeo", currentMediaSource:"fallback" } });
  assert.equal(snapshot.currentMediaSource, "FALLBACK");
});

test("portal prioritizes screen source while heartbeat is fresh and hides it when stale", () => {
  const now = Date.parse("2026-10-01T12:00:30.000Z");
  const screen = { currentMediaSource:"LOCAL", telemetry:{ schemaVersion:3, session:{ lastHeartbeatAt:"2026-10-01T12:00:15.000Z" }, current:{ currentMediaSource:"REMOTE" } } };
  assert.equal(getPortalCurrentMediaSource(screen, now), "LOCAL");
  assert.equal(isOperationalHeartbeatFresh(screen.telemetry, now), true);
  assert.equal(getPortalCurrentMediaSource(screen, now + 46_000), "");
});

test("player RC uses one 15 second operational heartbeat constant", () => {
  assert.equal(OPERATIONAL_HEARTBEAT_INTERVAL_MS, 15_000);
  const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(source, /setInterval\(\(\) => \{\s*sendHeartbeat\(\);\s*\}, OPERATIONAL_HEARTBEAT_INTERVAL_MS\)/);
});

test("Android app version comes from PackageManager instead of a version string", () => {
  const source = fs.readFileSync(new URL("../android/app/src/main/java/br/com/parksolutions/totempark/TotemDevicePlugin.java", import.meta.url), "utf8");
  assert.match(source, /getPackageManager\(\)\.getPackageInfo/);
  assert.match(source, /getLongVersionCode\(\)/);
  assert.doesNotMatch(source, /v26-template-layout-stability/);
});

test("binding conflict protection remains in place", () => {
  const source = fs.readFileSync(new URL("../functions/index.js", import.meta.url), "utf8");
  assert.match(source, /isUidConflict = Boolean\(previousConnectedUid && previousConnectedUid !== uid\)/);
  assert.match(source, /evaluateRebindAuthorization/);
  assert.match(source, /HttpsError\("already-exists"/);
});
