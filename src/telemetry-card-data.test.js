import test from "node:test";
import assert from "node:assert/strict";
import { aggregateSchema4Traffic, getCurrentSourceGroup, getTelemetryCardData, isSchema4Traffic, reportedAppVersion } from "./telemetry-card-data.js";

test("V5 active time follows checkpoints without treating legacy display time as active time", () => {
  const v5 = { telemetry: { schemaVersion: 3, session: { uptimeSeconds: 60 } } };
  const legacy = { telemetry: { schemaVersion: 2, counters: { displayTimeMs: 900_000 } } };
  assert.equal(getTelemetryCardData([v5, legacy]).activeTimeMs, 60_000);
  v5.telemetry.session.uptimeSeconds = 120;
  assert.equal(getTelemetryCardData([v5, legacy]).activeTimeMs, 120_000);
  assert.equal(getTelemetryCardData([legacy]).activeScreens, 0);
});

test("legacy transfer fields are not presented as schema 4 media downloads", () => {
  const auxiliaryAsset = { portalStatus:"ONLINE", lastMediaDownloadAt:"2026-09-28T01:25:27Z", lastMediaDownloadBytes:277_173, telemetry:{ schemaVersion:3 } };
  assert.equal(isSchema4Traffic(auxiliaryAsset), false);
  assert.equal(aggregateSchema4Traffic([auxiliaryAsset]).downloadedScreens, 0);
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

test("latest and most installed versions are independent", () => {
  const v16 = Array.from({ length:5 }, (_, index) => ({ id:`v16-${index}`, playerVersionName:"1.0.0-v16-field-release-candidate", playerVersionCode:16 }));
  const v30 = { id:"v30", playerVersionName:"1.0.0-v30-traffic-telemetry-final-rc", playerVersionCode:30 };
  const data = getTelemetryCardData([...v16, v30]);
  assert.equal(data.latestVersionScreen?.id, "v30");
  assert.equal(data.versionCount, 1);
  assert.equal(data.mostInstalledVersion, "1.0.0-v16-field-release-candidate (16)");
  assert.equal(data.mostInstalledCount, 5);
  assert.equal(reportedAppVersion({ telemetry: { session: { appVersion: "stale-v16" } }, appVersion: "v17" }), "v17");
  assert.equal(reportedAppVersion({ appVersion: "fallback", playerAppVersion: "older" }), "fallback");
  assert.equal(reportedAppVersion({ telemetry: { session: { appVersion: "stale-v16" } }, playerVersionName: "1.0.0-v17", playerVersionCode: 17 }), "1.0.0-v17 (17)");
  assert.equal(reportedAppVersion({ playerAppVersion: "older" }), "older");
  assert.equal(getTelemetryCardData([{}]).latestVersionScreen, null);
});

test("schema 4 aggregation preserves absence and excludes stale screens", () => {
  const valid = { portalStatus:"ONLINE", telemetry:{ schemaVersion:4, traffic:{ networkMeasurementSupported:true, appInternetReceivedBytes:100, mediaDownloadedBytes:20, localMediaReusedBytes:80, trafficAvoidedBytes:80, cachePlaybackHits:158, remotePlaybackCount:1, fallbackPlaybackCount:1 } } };
  const absent = { portalStatus:"ONLINE", telemetry:{ schemaVersion:4, traffic:{ networkMeasurementSupported:true, appInternetReceivedBytes:null } } };
  const schema3 = { portalStatus:"ONLINE", telemetry:{ schemaVersion:3, traffic:{ appInternetReceivedBytes:999 } } };
  const stale = { portalStatus:"OFFLINE", telemetry:{ schemaVersion:4, traffic:{ networkMeasurementSupported:true, appInternetReceivedBytes:999 } } };
  const result = aggregateSchema4Traffic([valid, absent, schema3, stale]);
  assert.equal(result.currentSchema4Screens, 2);
  assert.equal(result.networkScreens, 1);
  assert.equal(result.appInternetReceivedBytes, 100);
  assert.equal(result.cacheHits, 158);
  assert.equal(result.cacheMisses, 2);
});

test("current media source uses the complete schema 4 grouping", () => {
  for (const [source,key] of [["LOCAL","local"],["REMOTE","remote"],["FALLBACK","fallback"],["TEMPLATE","template"],["MIXED","mixed"],["UNKNOWN","unknown"]]) {
    assert.equal(getCurrentSourceGroup({ portalStatus:"ONLINE", telemetry:{ current:{ currentMediaSource:source } } }).key, key);
  }
  assert.equal(getCurrentSourceGroup({ portalStatus:"OFFLINE", telemetry:{ current:{ currentMediaSource:"LOCAL" } } }).key, "unknown");
});
