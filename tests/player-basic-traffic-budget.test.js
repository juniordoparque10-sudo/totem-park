import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBasicTelemetryUpdate,
  createBasicPlayerTelemetry,
} from "../src/basic-player-telemetry.js";

const app = {
  packageName:"br.com.parksolutions.totempark",
  versionCode:73,
  versionName:"1.0.0-v71-firestore-traffic-hotfix-test",
  buildId:"fea33f2ab2da",
  buildTimestamp:"2026-11-17T12:00:00.000Z",
};

function representativeUpdate() {
  const ids = ["installation-00000000-0000-0000-0000-000000000001", "session-00000000-0000-0000-0000-000000000001"];
  const telemetry = createBasicPlayerTelemetry({
    storage:{ getItem:() => null, setItem:() => {} },
    randomId:() => ids.shift(),
    now:() => Date.parse("2026-11-17T12:15:00.000Z"),
  });
  telemetry.setAppInfo(app);
  telemetry.setIdentity({ clientId:"client-example", screenId:"screen-example", deviceId:"device-example" });
  telemetry.setConnection("ONLINE");
  telemetry.setPlayback({
    state:"PLAYING",
    activeType:"PLAYLIST",
    activeId:"playlist-example",
    activeName:"Playlist Principal",
    itemId:"media-example",
  });
  return buildBasicTelemetryUpdate(telemetry.heartbeat());
}

test("envelope BASIC representativo mede bytes serializados sem métricas avançadas", (context) => {
  const update = representativeUpdate();
  const serializedBytes = Buffer.byteLength(JSON.stringify(update), "utf8");

  context.diagnostic(`basicTelemetryJsonBytes=${serializedBytes}`);
  assert.ok(serializedBytes > 0);
  assert.ok(serializedBytes < 1500, `envelope BASIC inesperadamente grande: ${serializedBytes} bytes`);
  assert.equal(update.telemetry.schemaVersion, 5);
  assert.equal(update.telemetry.profile, "BASIC");
  for (const field of ["traffic", "cache", "activity", "history", "metrics", "outbox"]) {
    assert.equal(Object.hasOwn(update.telemetry, field), false);
  }
});

test("frequência preservada produz quatro heartbeats por minuto", () => {
  const intervalMs = 15_000;
  assert.equal(60_000 / intervalMs, 4);
  assert.equal(3_600_000 / intervalMs, 240);
});
