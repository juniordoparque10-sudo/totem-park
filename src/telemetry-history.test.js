import test from "node:test";
import assert from "node:assert/strict";
import { aggregateHistoricalDaily, classifyHistoryReadError, historicalDateRange, normalizeHistoricalDaily } from "./telemetry-history-dashboard.js";

test("builds today, rolling and custom ranges in UTC", () => {
  const now = Date.parse("2026-10-28T23:30:00-03:00");
  assert.deepEqual(historicalDateRange("today", { now }).keys, ["2026-10-29"]);
  assert.equal(historicalDateRange("7d", { now }).keys.length, 7);
  assert.deepEqual(historicalDateRange("custom", { now, customStart:"2026-10-03", customEnd:"2026-10-01" }).keys, ["2026-10-01", "2026-10-02", "2026-10-03"]);
});

test("normalizes partial legacy documents without inventing measurements", () => {
  const row = normalizeHistoricalDaily({ dateKey:"2026-10-28", internetRxBytes:12, internetTxBytes:null, failureCount:-1 });
  assert.equal(row.networkMeasurementSupported, false);
  assert.equal(row.internetTxBytes, null);
  assert.equal(row.failureCount, null);
  assert.equal(row.cacheHitRate, null);
});

test("aggregates history independently from current screen snapshots and reports missing days", () => {
  const result = aggregateHistoricalDaily([
    { dateKey:"2026-10-01", internetRxBytes:10, internetTxBytes:2, mediaDownloadedBytes:4, cacheReusedBytes:9, cacheablePlaybackCount:2, cachePlaybackHits:1, observedUptimeSeconds:60, provedPlaybackSeconds:30, sessionCount:1 },
    { dateKey:"2026-10-03", internetRxBytes:20, internetTxBytes:3, failureCount:1, unknownInterruptionCount:2 },
  ], ["2026-10-01", "2026-10-02", "2026-10-03"]);
  assert.equal(result.totals.internetRxBytes, 30);
  assert.equal(result.totals.internetTxBytes, 5);
  assert.equal(result.totals.internetTotalBytes, 35);
  assert.equal(result.totals.cacheHitRate, 0.5);
  assert.deepEqual(result.missingDateKeys, ["2026-10-02"]);
});

test("classifies Firestore permission errors", () => {
  assert.equal(classifyHistoryReadError({ code:"firestore/permission-denied" }), "permission-denied");
  assert.equal(classifyHistoryReadError({ code:"unavailable" }), "error");
});
