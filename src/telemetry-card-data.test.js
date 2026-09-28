import test from "node:test";
import assert from "node:assert/strict";
import { getTelemetryCardData, reportedAppVersion } from "./telemetry-card-data.js";

test("V5 active time follows checkpoints without treating legacy display time as active time", () => {
  const v5 = { telemetry: { schemaVersion: 3, counters: { activeTimeMs: 60_000 } } };
  const legacy = { telemetry: { schemaVersion: 2, counters: { displayTimeMs: 900_000 } } };
  assert.equal(getTelemetryCardData([v5, legacy]).activeTimeMs, 60_000);
  v5.telemetry.counters.activeTimeMs = 120_000;
  assert.equal(getTelemetryCardData([v5, legacy]).activeTimeMs, 120_000);
  assert.equal(getTelemetryCardData([legacy]).activeScreens, 0);
});

test("latest transfer includes V5 screens and requires actual download fields", () => {
  const old = { id: "old", lastMediaDownloadAt: "2026-09-17T19:40:12Z", lastMediaDownloadBytes: 16_001_051 };
  const v5 = { id: "v5", telemetry: { schemaVersion: 3 }, lastMediaDownloadAt: "2026-09-28T01:25:27Z", lastMediaDownloadBytes: 1_848_135 };
  assert.equal(getTelemetryCardData([old, v5]).latestTransfer?.id, "v5");
  assert.equal(getTelemetryCardData([{ ...v5, lastMediaDownloadBytes: 0 }]).latestTransfer, null);
});

test("cache reports item count without inferring byte size", () => {
  const screens = [
    { cacheStatus: "pronto", cachedItems: 13, cacheSizeBytes: 0 },
    { cacheStatus: "pronto", cachedItems: 16, cacheSizeBytes: 0 },
    { cacheStatus: "pronto", cachedItems: 2, cacheSizeBytes: 0 },
    { cacheStatus: "pronto", cachedItems: 2, cacheSizeBytes: 0 },
    { cacheStatus: "pronto", cachedItems: 4, cacheSizeBytes: 0 },
    { cacheStatus: "pronto", cachedItems: 4, cacheSizeBytes: 0 },
  ];
  assert.equal(getTelemetryCardData(screens).cacheItems, 41);
  assert.equal(getTelemetryCardData(screens.slice(0, 2)).cacheItems, 29);
  assert.equal(getTelemetryCardData([{ cachedItems: 99 }]).cacheScreens, 0);
});

test("version uses newest checkpoint and ignores heartbeat for ranking", () => {
  const old = { id: "old", clientId: "a", telemetryUpdatedAt: "2026-09-28T01:00:00Z", lastSeenAt: "2026-09-28T02:00:00Z", telemetry: { session: { appVersion: "old" } } };
  const fresh = { id: "fresh", clientId: "b", telemetryUpdatedAt: "2026-09-28T01:30:00Z", lastSeenAt: "2026-09-28T01:31:00Z", telemetry: { session: { appVersion: "new" } } };
  const same = { id: "same", clientId: "c", telemetryUpdatedAt: "2026-09-28T01:20:00Z", telemetry: { session: { appVersion: "new" } } };
  assert.equal(getTelemetryCardData([old, fresh, same]).latestVersionScreen?.id, "fresh");
  assert.equal(getTelemetryCardData([old, fresh, same]).versionCount, 2);
  assert.equal(getTelemetryCardData([old]).latestVersionScreen?.id, "old");
  assert.equal(reportedAppVersion({ telemetry: { session: { appVersion: "v5" } }, appVersion: "fallback" }), "v5");
  assert.equal(reportedAppVersion({ appVersion: "fallback", playerAppVersion: "older" }), "fallback");
  assert.equal(reportedAppVersion({ playerAppVersion: "older" }), "older");
  assert.equal(getTelemetryCardData([{}]).latestVersionScreen, null);
});
