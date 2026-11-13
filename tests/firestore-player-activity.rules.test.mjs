import fs from "node:fs/promises";
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { arrayUnion, deleteField, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { buildOperationalTelemetryUpdate } from "../src/player-telemetry.js";
import { createTelemetryHistory } from "../src/telemetry-history.js";
import { syncTelemetryHistory } from "../src/telemetry-history-sync.js";

const projectId = "demo-totem-v56-telemetry";
let env;
const screenPath = (screen = "screen-a") => `clients/client-a/screens/${screen}`;
const activity = (screenId = "screen-a", atMs = 1) => ({ schemaVersion:1, events:[{ id:`${screenId}:${atMs}:1`, screenId, type:"PLAYBACK_START", state:"ACTIVE", atMs, mediaId:"m1", mediaType:"video", reason:"", domain:"playback" }] });
const telemetry = (screenId = "screen-a", deviceId = "device-a") => ({ schemaVersion:4, session:{ sessionId:"session-1", clientId:"client-a", screenId, deviceId }, activity:activity(screenId) });

before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore:{ rules:await fs.readFile("firestore.rules", "utf8") } });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "settings/masterAccess"), { emails:["master@example.com"] });
    await setDoc(doc(db, "clients/client-a"), { uid:"client-owner", accountStatus:"active" });
    await setDoc(doc(db, screenPath()), { name:"A", connectedDeviceId:"device-a", telemetry:telemetry() });
    await setDoc(doc(db, screenPath("screen-b")), { name:"B", connectedDeviceId:"device-b", telemetry:telemetry("screen-b", "device-b") });
    await setDoc(doc(db, "playerDeviceBindings/player-a"), { uid:"player-a", clientId:"client-a", screenId:"screen-a", deviceId:"device-a", status:"ACTIVE" });
    await setDoc(doc(db, "playerDeviceBindings/revoked"), { uid:"revoked", clientId:"client-a", screenId:"screen-a", deviceId:"device-r", status:"REVOKED" });
  });
});

after(async () => env?.cleanup());

test("active bound player can append its own activity batch", async () => {
  const db = env.authenticatedContext("player-a").firestore();
  await assertSucceeds(updateDoc(doc(db, screenPath()), { "telemetry.activity":activity("screen-a", 2) }));
});

test("active bound player can append only new activity events with arrayUnion", async () => {
  const db = env.authenticatedContext("player-a").firestore();
  const next = activity("screen-a", 3).events[0];
  await assertSucceeds(updateDoc(doc(db, screenPath()), {
    "telemetry.activity.schemaVersion":1,
    "telemetry.activity.events":arrayUnion(next),
  }));
  const stored = (await getDoc(doc(db, screenPath()))).data().telemetry.activity.events;
  assert.deepEqual(stored.map((event) => event.id), ["screen-a:2:1", "screen-a:3:1"]);
});

test("activity writes require the active binding for the exact screen", async () => {
  const unbound = env.authenticatedContext("unbound").firestore();
  const revoked = env.authenticatedContext("revoked").firestore();
  const bound = env.authenticatedContext("player-a").firestore();
  await assertFails(updateDoc(doc(unbound, screenPath()), { "telemetry.activity":activity("screen-a", 3) }));
  await assertFails(updateDoc(doc(revoked, screenPath()), { "telemetry.activity":activity("screen-a", 3) }));
  await assertFails(updateDoc(doc(bound, screenPath("screen-b")), { "telemetry.activity":activity("screen-b", 3) }));
});

test("V70 heartbeat preserves legacy activity before history synchronization", async () => {
  const db = env.authenticatedContext("player-a").firestore();
  const legacyActivity = (await getDoc(doc(db, screenPath()))).data().telemetry.activity;
  const operational = {
    schemaVersion:4,
    session:{ sessionId:"session-v70", clientId:"client-a", screenId:"screen-a", deviceId:"device-a" },
    app:{ packageName:"br.com.parksolutions.totempark.player.rcsecurelink", versionCode:70, versionName:"1.0.0-v70-experimental" },
    player:{ state:"playing" }, current:{ playerState:"playing" }, cache:{ cacheStatus:"pronto" },
  };
  await assertSucceeds(updateDoc(doc(db, screenPath()), {
    ...buildOperationalTelemetryUpdate(operational),
    telemetryUpdatedAt:new Date(), connectedDeviceId:"device-a", activeDeviceId:deleteField(), status:"online", lastConnection:"29/10/2026, 21:00:00", lastSeenAt:new Date(),
  }));
  const updated = (await getDoc(doc(db, screenPath()))).data();
  assert.deepEqual(updated.telemetry.activity, legacyActivity);
  assert.equal(updated.telemetry.app.versionCode, 70);
  const atMs = Date.parse("2026-10-29T21:00:00.000Z");
  const memory = new Map();
  const history = createTelemetryHistory({
    identity:{ clientId:"client-a", screenId:"screen-a", deviceId:"device-a" }, now:() => atMs,
    storage:{ getItem:(key) => memory.get(key) ?? null, setItem:(key, value) => memory.set(key, value) },
  });
  history.checkpoint({
    trafficDaily:{ dateKey:"2026-10-29", appInternetReceivedBytes:100, appInternetSentBytes:20, mediaDownloadedBytes:10, localMediaReusedBytes:30, cachePlaybackHits:1, remotePlaybackCount:0, fallbackPlaybackCount:0 },
    operational:{ ...operational, session:{ ...operational.session, sessionStartedAt:"2026-10-29T20:59:00.000Z", uptimeSeconds:60 }, current:{ networkStatus:"ONLINE", playerState:"playing" } },
  });
  history.recordEvents([{ id:"event-v70", screenId:"screen-a", sessionId:"session-v70", type:"PLAYBACK_START", state:"ACTIVE", domain:"playback", atMs, mediaId:"media-v70", mediaType:"video" }]);
  const historyResult = await syncTelemetryHistory({
    history,
    refs:{
      daily:(id) => doc(db, `${screenPath()}/telemetryDaily/${id}`),
      session:(id) => doc(db, `${screenPath()}/telemetrySessions/${id}`),
      event:(id) => doc(db, `${screenPath()}/telemetryEvents/${id}`),
    },
    setDoc,
  });
  assert.equal(historyResult.status, "synced");
  assert.deepEqual(historyResult.acknowledged, { days:["2026-10-29"], sessions:["session-v70"], events:["event-v70"] });
});

test("V70 heartbeat accepts screens without legacy activity", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), screenPath("screen-empty")), { name:"Empty", connectedDeviceId:"device-empty", telemetry:{ schemaVersion:4 } });
    await setDoc(doc(context.firestore(), "playerDeviceBindings/player-empty"), { uid:"player-empty", clientId:"client-a", screenId:"screen-empty", deviceId:"device-empty", status:"ACTIVE" });
  });
  const db = env.authenticatedContext("player-empty").firestore();
  const operational = {
    schemaVersion:4,
    session:{ sessionId:"session-empty", clientId:"client-a", screenId:"screen-empty", deviceId:"device-empty" },
    app:{ packageName:"br.com.parksolutions.totempark.player.rcsecurelink", versionCode:70, versionName:"1.0.0-v70-experimental" },
    player:{ state:"playing" }, current:{ playerState:"playing" }, cache:{ cacheStatus:"pronto" },
  };
  await assertSucceeds(updateDoc(doc(db, screenPath("screen-empty")), {
    ...buildOperationalTelemetryUpdate(operational),
    telemetryUpdatedAt:new Date(), connectedDeviceId:"device-empty", activeDeviceId:deleteField(), status:"online", lastConnection:"29/10/2026, 21:00:00", lastSeenAt:new Date(),
  }));
  assert.equal((await getDoc(doc(db, screenPath("screen-empty")))).data().telemetry.activity, undefined);
});

test("V70 heartbeat cannot alter legacy activity through an operational field-path update", async () => {
  const db = env.authenticatedContext("player-a").firestore();
  const before = (await getDoc(doc(db, screenPath()))).data().telemetry.activity;
  const operational = {
    schemaVersion:4,
    session:{ sessionId:"session-v70-safe", clientId:"client-a", screenId:"screen-a", deviceId:"device-a" },
    app:{ packageName:"br.com.parksolutions.totempark.player.rcsecurelink", versionCode:70, versionName:"1.0.0-v70-experimental" },
    player:{ state:"playing" }, current:{ playerState:"playing" }, cache:{ cacheStatus:"pronto" },
  };
  await assertSucceeds(updateDoc(doc(db, screenPath()), {
    ...buildOperationalTelemetryUpdate(operational),
    telemetryUpdatedAt:new Date(), connectedDeviceId:"device-a", activeDeviceId:deleteField(), status:"online", lastConnection:"30/10/2026, 21:00:00", lastSeenAt:new Date(),
  }));
  const after = (await getDoc(doc(db, screenPath()))).data().telemetry.activity;
  assert.deepEqual(after, before);
});
