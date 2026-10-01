import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createTrafficTelemetry,
  isTrafficInstrumented,
  TRAFFIC_TELEMETRY_SCHEMA_VERSION,
  TRAFFIC_TELEMETRY_STORAGE_KEY,
} from "../src/traffic-telemetry.js";
import { formatBytes } from "../src/format-bytes.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem:(key) => values.get(key) || null,
    setItem:(key, value) => values.set(key, value),
  };
}

test("A-C: native baseline, normal delta and counter reset never become negative", () => {
  const telemetry = createTrafficTelemetry({ storage:memoryStorage() });
  telemetry.recordNetworkStats({ supported:true, uidRxBytes:1000, uidTxBytes:200 });
  assert.equal(telemetry.snapshot().appInternetReceivedBytes, 0);
  telemetry.recordNetworkStats({ supported:true, uidRxBytes:1250, uidTxBytes:260 });
  assert.equal(telemetry.snapshot().appInternetReceivedBytes, 250);
  assert.equal(telemetry.snapshot().appInternetSentBytes, 60);
  telemetry.recordNetworkStats({ supported:true, uidRxBytes:20, uidTxBytes:10 });
  assert.equal(telemetry.snapshot().appInternetReceivedBytes, 250);
  assert.equal(telemetry.snapshot().appInternetSentBytes, 60);
});

test("D: unsupported TrafficStats is explicit and never reported as zero", () => {
  const telemetry = createTrafficTelemetry({ storage:memoryStorage() });
  telemetry.recordNetworkStats({ supported:false });
  assert.equal(telemetry.snapshot().networkMeasurementSupported, false);
  assert.equal(telemetry.snapshot().appInternetReceivedBytes, null);
  assert.equal(telemetry.snapshot().appInternetSentBytes, null);
});

test("E-G: only a completed unique download is counted", () => {
  const telemetry = createTrafficTelemetry({ storage:memoryStorage() });
  const playlistMedia = { classification:"playlistMedia", status:"complete" };
  assert.equal(telemetry.recordDownloadComplete({ operationId:"studio-fire", bytes:11_366_669, ...playlistMedia }), true);
  assert.equal(telemetry.recordDownloadComplete({ operationId:"studio-fire", bytes:11_366_669, ...playlistMedia }), false, "duplicate completion is ignored");
  assert.equal(telemetry.recordDownloadComplete({ operationId:"client-logo", bytes:277_173, classification:"clientAsset", status:"complete" }), false);
  assert.equal(telemetry.recordDownloadComplete({ operationId:"auxiliary", bytes:90_000, classification:"auxiliary", status:"complete" }), false);
  assert.equal(telemetry.recordDownloadComplete({ operationId:"cache-hit", bytes:11_366_669, classification:"playlistMedia", status:"cacheHit" }), false);
  assert.equal(telemetry.recordDownloadComplete({ operationId:"partial", bytes:500_000, classification:"playlistMedia", status:"failed" }), false);
  assert.equal(telemetry.snapshot().mediaDownloadedBytes, 11_366_669);
  telemetry.recordNetworkStats({ supported:true, uidRxBytes:1_000_000, uidTxBytes:100 });
  telemetry.recordNetworkStats({ supported:true, uidRxBytes:1_277_173, uidTxBytes:150 });
  assert.equal(telemetry.snapshot().appInternetReceivedBytes, 277_173, "TrafficStats still includes general app traffic");
  assert.equal(telemetry.snapshot().mediaDownloadedBytes, 11_366_669, "general traffic does not become a media download");
});

test("G2: V29 traffic storage is isolated without touching binding or media cache", () => {
  const storage = memoryStorage();
  const v1Key = "totempark-player-traffic-v1";
  const v2Key = "totempark-player-traffic-v2";
  const pollutedV1 = JSON.stringify({ version:1, daily:{ mediaDownloadedBytes:11_366_669 } });
  const pollutedV29 = JSON.stringify({
    version:1,
    daily:{
      dateKey:"2026-10-01",
      mediaDownloadedBytes:277_173,
      localMediaReusedBytes:261_409_997,
      cachePlaybackHits:23,
      remotePlaybackCount:4,
      fallbackPlaybackCount:2,
    },
  });
  const binding = JSON.stringify({ clientId:"client-1", screenId:"screen-1" });
  const mediaCache = JSON.stringify({ "studio-fire":{ sizeBytes:11_366_669 } });
  storage.setItem(v1Key, pollutedV1);
  storage.setItem(v2Key, pollutedV29);
  storage.setItem("totempark-tv-connection", binding);
  storage.setItem("totempark-player-media-cache-meta", mediaCache);

  const telemetry = createTrafficTelemetry({ storage, now:() => Date.parse("2026-10-01T15:00:00.000Z") });
  const snapshot = telemetry.snapshot();
  assert.equal(TRAFFIC_TELEMETRY_STORAGE_KEY, "totempark-player-traffic-v3");
  assert.equal(snapshot.measurementStartedAt, "2026-10-01T15:00:00.000Z");
  assert.equal(snapshot.mediaDownloadedBytes, 0);
  assert.equal(snapshot.localMediaReusedBytes, 0);
  assert.equal(snapshot.cachePlaybackHits, 0);
  assert.equal(snapshot.remotePlaybackCount, 0);
  assert.equal(snapshot.fallbackPlaybackCount, 0);
  assert.equal(storage.getItem(v1Key), pollutedV1);
  assert.equal(storage.getItem(v2Key), pollutedV29);
  assert.equal(storage.getItem("totempark-tv-connection"), binding);
  assert.equal(storage.getItem("totempark-player-media-cache-meta"), mediaCache);

  telemetry.recordNetworkStats({ supported:true, uidRxBytes:900_000, uidTxBytes:20_000 });
  assert.equal(telemetry.snapshot().appInternetReceivedBytes, 0, "first V29 TrafficStats sample is a fresh baseline");
  telemetry.recordNetworkStats({ supported:true, uidRxBytes:901_500, uidTxBytes:20_100 });
  assert.equal(telemetry.snapshot().appInternetReceivedBytes, 1_500);
});

test("H-L: local completion counts bytes once while interruption and preload do not", () => {
  const telemetry = createTrafficTelemetry({ storage:memoryStorage() });
  const video = { playbackExecutionId:1, itemId:"video", source:"LOCAL", mediaType:"VIDEO" };
  const occurrenceId = telemetry.observePlaybackStart(video);
  assert.ok(occurrenceId);
  assert.equal(telemetry.recordLocalPlaybackComplete({ ...video, bytes:8000, occurrenceId }), true);
  assert.equal(telemetry.recordLocalPlaybackComplete({ ...video, bytes:8000, occurrenceId }), false);
  telemetry.observePlaybackStart({ playbackExecutionId:2, itemId:"interrupted", source:"LOCAL", mediaType:"VIDEO" });
  telemetry.closeOccurrence({ playbackExecutionId:2, itemId:"interrupted", source:"LOCAL" });
  assert.equal(telemetry.snapshot().localMediaReusedBytes, 8000);
  assert.equal(telemetry.observePlaybackStart({ playbackExecutionId:3, itemId:"preload", source:"LOCAL", mediaType:"IMAGE", isCurrent:false }), null);
});

test("M-N: single-item video and image loops receive distinct telemetry occurrences", () => {
  const telemetry = createTrafficTelemetry({ storage:memoryStorage() });
  for (const mediaType of ["VIDEO", "IMAGE"]) {
    const input = { playbackExecutionId:1, itemId:mediaType, source:"LOCAL", mediaType };
    const first = telemetry.observePlaybackStart(input);
    telemetry.recordLocalPlaybackComplete({ ...input, bytes:100, occurrenceId:first });
    const second = telemetry.observePlaybackStart(input);
    telemetry.recordLocalPlaybackComplete({ ...input, bytes:100, occurrenceId:second });
    assert.notEqual(first, second);
  }
  assert.equal(telemetry.snapshot().cachePlaybackHits, 4);
  assert.equal(telemetry.snapshot().localMediaReusedBytes, 400);
});

test("M2: repeated events, stale layers and remounts cannot close or multiply a physical cycle", () => {
  const telemetry = createTrafficTelemetry({ storage:memoryStorage() });
  const bytes = 11_366_669;
  const video = { playbackExecutionId:28, itemId:"single-video", source:"LOCAL", mediaType:"VIDEO" };

  const first = telemetry.observePlaybackStart(video);
  assert.equal(telemetry.observePlaybackStart(video), first, "repeated playing/render/remount reuses the open occurrence");
  assert.equal(telemetry.observePlaybackStart({ ...video, isCurrent:false }), null, "previous/hidden layer cannot start");
  assert.equal(telemetry.snapshot().cachePlaybackHits, 1);

  assert.equal(telemetry.recordLocalPlaybackComplete({ ...video, bytes, occurrenceId:first }), true);
  assert.equal(telemetry.recordLocalPlaybackComplete({ ...video, bytes, occurrenceId:first }), false, "repeated ended is ignored");

  const second = telemetry.observePlaybackStart(video);
  assert.notEqual(second, first, "the next physical loop receives a new immutable occurrence");
  assert.equal(telemetry.recordLocalPlaybackComplete({ ...video, bytes, occurrenceId:first }), false, "stale ended cannot close the new loop");
  assert.equal(telemetry.recordLocalPlaybackComplete({ ...video, bytes }), false, "ended without its immutable occurrence is ignored");
  assert.equal(telemetry.observePlaybackStart(video), second, "the new loop remains open after stale ended");
  assert.equal(telemetry.recordLocalPlaybackComplete({ ...video, bytes, occurrenceId:second }), true);

  assert.equal(telemetry.snapshot().cachePlaybackHits, 2);
  assert.equal(telemetry.snapshot().localMediaReusedBytes, bytes * 2);
});

test("O-S: remote, fallback, templates and cache hit rate follow the contract", () => {
  const telemetry = createTrafficTelemetry({ storage:memoryStorage() });
  telemetry.observePlaybackStart({ playbackExecutionId:1, itemId:"remote", source:"REMOTE", mediaType:"VIDEO" });
  // Merely deciding to try fallback causes no count; only observed start does.
  assert.equal(telemetry.snapshot().fallbackPlaybackCount, 0);
  telemetry.observePlaybackStart({ playbackExecutionId:2, itemId:"fallback", source:"FALLBACK", mediaType:"VIDEO" });
  telemetry.observePlaybackStart({ playbackExecutionId:3, itemId:"local", source:"LOCAL", mediaType:"IMAGE" });
  telemetry.observePlaybackStart({ playbackExecutionId:4, itemId:"template", source:"TEMPLATE", mediaType:"TEMPLATE_V2" });
  const snapshot = telemetry.snapshot();
  assert.equal(snapshot.remotePlaybackCount, 1);
  assert.equal(snapshot.fallbackPlaybackCount, 1);
  assert.equal(snapshot.cachePlaybackHits, 1);
  assert.equal(snapshot.cacheablePlaybackCount, 3);
  assert.equal(snapshot.cacheHitRate, 1 / 3);
  assert.equal(createTrafficTelemetry({ storage:memoryStorage() }).snapshot().cacheHitRate, null);
});

test("T-W: restart preserves UTC daily totals, resets session baseline and keeps offline reuse", () => {
  const storage = memoryStorage();
  let clock = Date.parse("2026-10-01T12:00:00.000Z");
  const first = createTrafficTelemetry({ storage, now:() => clock });
  first.recordNetworkStats({ supported:true, uidRxBytes:100, uidTxBytes:20 });
  first.recordNetworkStats({ supported:true, uidRxBytes:180, uidTxBytes:30 });
  const local = { playbackExecutionId:1, itemId:"offline", source:"LOCAL", mediaType:"VIDEO" };
  const occurrenceId = first.observePlaybackStart(local);
  first.recordLocalPlaybackComplete({ ...local, bytes:500, occurrenceId });

  clock += 60_000;
  const restarted = createTrafficTelemetry({ storage, now:() => clock });
  restarted.recordNetworkStats({ supported:true, uidRxBytes:200, uidTxBytes:35 });
  assert.equal(restarted.snapshot().appInternetReceivedBytes, 0);
  assert.equal(restarted.dailySnapshot().appInternetReceivedBytes, 100);
  assert.equal(restarted.dailySnapshot().localMediaReusedBytes, 500);
  restarted.recordNetworkStats({ supported:true, uidRxBytes:5, uidTxBytes:2 });
  assert.equal(restarted.snapshot().appInternetReceivedBytes, 0);
  assert.equal(restarted.dailySnapshot().appInternetReceivedBytes, 100);
});

test("X-Z: schema 3 is not instrumented, schema 4 requires traffic, and zero remains measured", () => {
  assert.equal(TRAFFIC_TELEMETRY_SCHEMA_VERSION, 4);
  assert.equal(isTrafficInstrumented({ schemaVersion:3 }), false);
  assert.equal(isTrafficInstrumented({ schemaVersion:4 }), false);
  assert.equal(isTrafficInstrumented({ schemaVersion:4, traffic:{ mediaDownloadedBytes:0 } }), true);
  assert.equal(formatBytes(undefined, { unavailable:"Não instrumentado" }), "Não instrumentado");
  assert.equal(formatBytes(0), "0 B");
});

test("AA-AB: integration reuses the one heartbeat and does not write Firestore per playback", () => {
  const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(source, /TotemDevice\.getNetworkStats\(\)/);
  assert.match(source, /setInterval\(\(\) => \{\s*sendHeartbeat\(\);\s*\}, OPERATIONAL_HEARTBEAT_INTERVAL_MS\)/);
  assert.doesNotMatch(source, /recordLocalPlaybackComplete[\s\S]{0,300}(updateDoc|setDoc)\(/);
});
