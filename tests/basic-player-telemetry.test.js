import test from "node:test";
import assert from "node:assert/strict";
import {
  BASIC_TELEMETRY_SCHEMA_VERSION,
  buildBasicTelemetryUpdate,
  createBasicPlayerTelemetry,
} from "../src/basic-player-telemetry.js";

function createStorage() {
  const values = new Map();
  return {
    getItem:key => values.has(key) ? values.get(key) : null,
    setItem:(key, value) => values.set(key, String(value)),
  };
}

const appV73 = {
  packageName:"br.com.parksolutions.totempark",
  versionCode:73,
  versionName:"1.0.0-v71-firestore-traffic-hotfix-test",
  buildId:"5c818bd2-playerRc",
  buildTimestamp:"2026-11-17T12:00:00.000Z",
};

test("schema 5 BASIC mantém instalação e cria nova sessão por execução", () => {
  const storage = createStorage();
  const ids = ["install-1", "session-1", "session-2"];
  const first = createBasicPlayerTelemetry({ storage, randomId:() => ids.shift(), now:() => Date.parse("2026-11-17T12:00:00.000Z") });
  first.setAppInfo(appV73);
  const firstSnapshot = first.snapshot();

  const second = createBasicPlayerTelemetry({ storage, randomId:() => ids.shift(), now:() => Date.parse("2026-11-17T12:05:00.000Z") });
  second.setAppInfo(appV73);
  const secondSnapshot = second.snapshot();

  assert.equal(BASIC_TELEMETRY_SCHEMA_VERSION, 5);
  assert.equal(firstSnapshot.schemaVersion, 5);
  assert.equal(firstSnapshot.profile, "BASIC");
  assert.equal(firstSnapshot.installation.installationId, "install-1");
  assert.equal(secondSnapshot.installation.installationId, "install-1");
  assert.equal(firstSnapshot.installation.installationEpoch, 1);
  assert.equal(secondSnapshot.installation.installationEpoch, 1);
  assert.equal(firstSnapshot.session.sessionId, "session-1");
  assert.equal(secondSnapshot.session.sessionId, "session-2");
});

test("upgrade ou downgrade incrementa epoch sem reutilizar identidade do build anterior", () => {
  const storage = createStorage();
  const ids = ["install-1", "session-1", "session-2", "session-3"];
  const v73 = createBasicPlayerTelemetry({ storage, randomId:() => ids.shift() });
  v73.setAppInfo(appV73);

  const v74 = createBasicPlayerTelemetry({ storage, randomId:() => ids.shift() });
  v74.setAppInfo({ ...appV73, versionCode:74, versionName:"1.0.0-v74", buildId:"release-74" });
  const upgraded = v74.snapshot();

  const downgradedRuntime = createBasicPlayerTelemetry({ storage, randomId:() => ids.shift() });
  downgradedRuntime.setAppInfo(appV73);
  const downgraded = downgradedRuntime.snapshot();

  assert.equal(upgraded.installation.installationId, "install-1");
  assert.equal(upgraded.installation.installationEpoch, 2);
  assert.equal(upgraded.installation.versionCode, 74);
  assert.equal(downgraded.installation.installationEpoch, 3);
  assert.equal(downgraded.installation.versionCode, 73);
  assert.notEqual(upgraded.session.sessionId, downgraded.session.sessionId);
});

test("snapshot básico consolida comunicação e reprodução sem métricas avançadas", () => {
  const telemetry = createBasicPlayerTelemetry({ randomId:(() => { const ids=["install-1","session-1"]; return () => ids.shift(); })(), now:() => Date.parse("2026-11-17T12:10:00.000Z") });
  telemetry.setAppInfo(appV73);
  telemetry.setIdentity({ clientId:"client-1", screenId:"screen-1", deviceId:"device-1" });
  telemetry.setConnection("OFFLINE");
  telemetry.setPlayback({ state:"PLAYING", activeType:"PLAYLIST", activeId:"playlist-1", activeName:"Principal", itemId:"media-1" });
  const snapshot = telemetry.heartbeat();
  const update = buildBasicTelemetryUpdate(snapshot);

  assert.deepEqual(Object.keys(update), ["telemetry"]);
  assert.equal(update.telemetry.schemaVersion, 5);
  assert.equal(update.telemetry.connection.state, "OFFLINE");
  assert.equal(update.telemetry.session.lastHeartbeatAt, "2026-11-17T12:10:00.000Z");
  assert.equal(update.telemetry.session.sequence, 1);
  assert.deepEqual(update.telemetry.playback, {
    state:"PLAYING",
    activeType:"PLAYLIST",
    activeId:"playlist-1",
    activeName:"Principal",
    itemId:"media-1",
    updatedAt:"2026-11-17T12:10:00.000Z",
  });
  for (const advanced of ["traffic", "cache", "activity", "history", "metrics", "outbox"]) {
    assert.equal(Object.hasOwn(update.telemetry, advanced), false);
  }
});

test("documento legado não é mesclado no envelope BASIC", () => {
  const telemetry = createBasicPlayerTelemetry({ randomId:(() => { const ids=["install-1","session-1"]; return () => ids.shift(); })() });
  telemetry.setAppInfo(appV73);
  const legacy = { schemaVersion:4, traffic:{ appInternetReceivedBytes:99 }, cache:{ cacheStatus:"pronto" } };
  const update = buildBasicTelemetryUpdate(telemetry.heartbeat(), legacy);

  assert.equal(update.telemetry.schemaVersion, 5);
  assert.equal(Object.hasOwn(update.telemetry, "traffic"), false);
  assert.equal(Object.hasOwn(update.telemetry, "cache"), false);
});
