import fs from "node:fs/promises";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-totem-identity";
let env;

const screenPath = (screen = "screen-a") => `clients/client-a/screens/${screen}`;
const bindingPath = (uid) => `playerDeviceBindings/${uid}`;
const sessionPath = (screen = "screen-a") => `${screenPath(screen)}/telemetrySessions/session-1`;
const dailyPath = (day = "2026-10-28", screen = "screen-a") => `${screenPath(screen)}/telemetryDaily/${day}`;
const eventPath = (event = "event-1", screen = "screen-a") => `${screenPath(screen)}/telemetryEvents/${event}`;

function telemetry({ clientId = "client-a", screenId = "screen-a", deviceId = "device-a" } = {}) {
  return {
    schemaVersion: 1,
    session: { sessionId: "session-1", clientId, screenId, deviceId },
    current: {}, counters: {}, lastPlayerEvents: [], transitions: [], sequence: 1,
  };
}

function daily({ clientId = "client-a", screenId = "screen-a", deviceId = "device-a", sequence = 1, rx = 100 } = {}) {
  return {
    schemaVersion:1, dateKey:"2026-10-28", clientId, screenId, deviceId, sequence,
    internetRxBytes:rx, internetTxBytes:20, mediaDownloadedBytes:10, cacheReusedBytes:30,
    trafficAvoidedBytes:30, cachePlaybackHits:2, remotePlaybackCount:1, fallbackPlaybackCount:0,
    cacheablePlaybackCount:3, cacheHitRate:2 / 3, observedUptimeSeconds:60,
    provedPlaybackSeconds:30, provedOnlineSeconds:20, provedOfflineSeconds:10,
    sessionIds:["session-1"], sessionCount:1, restartCount:0, failureCount:0,
    unknownInterruptionCount:0, packageName:"pkg", versionCode:69, versionName:"V69",
    lastCommunicationAt:"2026-10-28T12:00:00.000Z",
  };
}

function activityEvent({ clientId = "client-a", screenId = "screen-a", deviceId = "device-a", reason = "" } = {}) {
  return {
    schemaVersion:1, id:"event-1", clientId, screenId, deviceId, sessionId:"session-1",
    type:"PLAYBACK_START", state:"ACTIVE", domain:"playback", atMs:1,
    mediaId:"m1", mediaType:"video", reason, expiresAtMs:2, expiresAt:new Date(2),
  };
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await fs.readFile("firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "settings/masterAccess"), { emails: ["master@example.com"] });
    await setDoc(doc(db, "clients/client-a"), { uid: "client-owner", accountStatus: "active" });
    await setDoc(doc(db, screenPath("screen-a")), { name: "A", status: "online", connectedDeviceId: "device-a" });
    await setDoc(doc(db, screenPath("screen-b")), { name: "B", status: "online" });
    await setDoc(doc(db, bindingPath("player-a")), {
      uid: "player-a", clientId: "client-a", screenId: "screen-a", deviceId: "device-a", status: "ACTIVE",
    });
    await setDoc(doc(db, bindingPath("revoked")), {
      uid: "revoked", clientId: "client-a", screenId: "screen-a", deviceId: "device-r", status: "REVOKED",
    });
  });
});

after(async () => env?.cleanup());

test("unauthenticated telemetry write is denied", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(updateDoc(doc(db, screenPath()), { telemetry: telemetry(), telemetryUpdatedAt: new Date() }));
});

test("authenticated UID without binding is denied", async () => {
  const db = env.authenticatedContext("unbound").firestore();
  await assertFails(setDoc(doc(db, sessionPath()), telemetry()));
});

test("active binding can write its own screen", async () => {
  const db = env.authenticatedContext("player-a").firestore();
  await assertSucceeds(updateDoc(doc(db, screenPath()), { telemetry: telemetry(), telemetryUpdatedAt: new Date() }));
  await assertSucceeds(setDoc(doc(db, sessionPath()), telemetry()));
});

test("active binding can announce only supported Web or rcsecurelink Android capabilities", async () => {
  const bound = env.authenticatedContext("player-a").firestore();
  const unbound = env.authenticatedContext("unbound").firestore();
  const revoked = env.authenticatedContext("revoked").firestore();
  const capability = {
    playlistItemNavigation: true,
    templatesV2: true,
    templatesV2DynamicPhase1: true,
    deviceId: "device-a",
    platform: "WEB",
  };
  const legacyCapability = { playlistItemNavigation: true, deviceId: "device-a", platform: "WEB" };

  await assertFails(updateDoc(doc(unbound, screenPath()), { capabilities: capability }));
  await assertFails(updateDoc(doc(revoked, screenPath()), { capabilities: capability }));
  await assertFails(updateDoc(doc(bound, screenPath("screen-b")), { capabilities: capability }));
  await assertSucceeds(updateDoc(doc(bound, screenPath()), {
    activeDeviceId: null,
    capabilities: capability,
    connectedDeviceId: "device-a",
    lastConnection: "agora",
    lastSeenAt: new Date(),
    status: "online",
  }));
  await assertSucceeds(updateDoc(doc(bound, screenPath()), {
    capabilities: legacyCapability,
  }));
  await assertFails(updateDoc(doc(bound, screenPath()), {
    capabilities: { ...capability, deviceId: "other-device" },
  }));
  await assertSucceeds(updateDoc(doc(bound, screenPath()), {
    capabilities: { ...capability, platform:"ANDROID", packageName:"br.com.parksolutions.totempark.player.rcsecurelink", versionCode:69 },
  }));
  await assertFails(updateDoc(doc(bound, screenPath()), {
    capabilities: { ...capability, platform:"ANDROID", packageName:"br.com.parksolutions.totempark", versionCode:69 },
  }));
  await assertFails(updateDoc(doc(bound, screenPath()), {
    capabilities: { ...capability, arbitraryCapability: true },
  }));
  await assertFails(updateDoc(doc(bound, screenPath()), {
    capabilities: { ...capability, templatesV2DynamicPhase1: false },
  }));
  await assertFails(updateDoc(doc(bound, screenPath()), {
    capabilities: capability,
    name: "alteração indevida",
  }));
});

test("screen A binding cannot write screen B", async () => {
  const db = env.authenticatedContext("player-a").firestore();
  await assertFails(updateDoc(doc(db, screenPath("screen-b")), {
    telemetry: telemetry({ screenId: "screen-b" }), telemetryUpdatedAt: new Date(),
  }));
});

test("payload cannot alter clientId, screenId, or deviceId", async () => {
  const db = env.authenticatedContext("player-a").firestore();
  await assertFails(setDoc(doc(db, sessionPath()), telemetry({ clientId: "client-b" })));
  await assertFails(setDoc(doc(db, sessionPath()), telemetry({ screenId: "screen-b" })));
  await assertFails(setDoc(doc(db, sessionPath()), telemetry({ deviceId: "device-b" })));
});

test("revoked binding is denied", async () => {
  const db = env.authenticatedContext("revoked").firestore();
  await assertFails(updateDoc(doc(db, screenPath()), {
    telemetry: telemetry({ deviceId: "device-r" }), telemetryUpdatedAt: new Date(),
  }));
});

test("player cannot create or edit a binding", async () => {
  const player = env.authenticatedContext("player-a").firestore();
  await assertFails(setDoc(doc(player, bindingPath("new-player")), { uid: "new-player", status: "ACTIVE" }));
  await assertFails(updateDoc(doc(player, bindingPath("player-a")), { screenId: "screen-b" }));
  await assertFails(updateDoc(doc(player, screenPath()), { linkedAt: new Date() }));
  await assertFails(setDoc(doc(player, `${screenPath()}/system/rebindAuthorization`), {
    status: "ACTIVE", expiresAtMs: Date.now() + 600000,
  }));
});

test("master can manage bindings and owner cannot", async () => {
  const master = env.authenticatedContext("master", { email: "master@example.com" }).firestore();
  const owner = env.authenticatedContext("client-owner", { email: "owner@example.com" }).firestore();
  await assertSucceeds(setDoc(doc(master, bindingPath("new-player")), {
    uid: "new-player", clientId: "client-a", screenId: "screen-a", deviceId: "new-device", status: "ACTIVE",
  }));
  assert.equal((await getDoc(doc(master, bindingPath("new-player")))).data().status, "ACTIVE");
  await assertFails(updateDoc(doc(owner, bindingPath("new-player")), { status: "REVOKED" }));
});

test("only master can change the per-screen Templates V2 test mode", async () => {
  const master = env.authenticatedContext("master", { email: "master@example.com" }).firestore();
  const owner = env.authenticatedContext("client-owner", { email: "owner@example.com" }).firestore();
  const player = env.authenticatedContext("player-a").firestore();

  await assertFails(updateDoc(doc(owner, screenPath()), { templatesV2TestMode: true }));
  await assertFails(updateDoc(doc(player, screenPath()), { templatesV2TestMode: true }));
  await assertSucceeds(updateDoc(doc(master, screenPath()), {
    templatesV2TestMode: true,
    templatesV2TestModeUpdatedBy: "master@example.com",
  }));
  assert.equal((await getDoc(doc(master, screenPath()))).data().templatesV2TestMode, true);
});

test("sequence cannot move backwards", async () => {
  const db = env.authenticatedContext("player-a").firestore();
  await assertSucceeds(setDoc(doc(db, sessionPath()), { ...telemetry(), sequence: 5 }));
  await assertFails(setDoc(doc(db, sessionPath()), { ...telemetry(), sequence: 4 }));
});

test("bound player writes only its own monotonic UTC daily checkpoint", async () => {
  const bound = env.authenticatedContext("player-a").firestore();
  const unbound = env.authenticatedContext("unbound").firestore();
  await assertFails(setDoc(doc(unbound, dailyPath()), daily()));
  await assertFails(setDoc(doc(bound, dailyPath("2026-10-28", "screen-b")), daily({ screenId:"screen-b" })));
  await assertSucceeds(setDoc(doc(bound, dailyPath()), daily()));
  await assertSucceeds(setDoc(doc(bound, dailyPath()), daily({ sequence:2, rx:150 }), { merge:true }));
  await assertFails(setDoc(doc(bound, dailyPath()), daily({ sequence:3, rx:99 }), { merge:true }));
});

test("event retry is idempotent while mutation and foreign identity are denied", async () => {
  const bound = env.authenticatedContext("player-a").firestore();
  await assertSucceeds(setDoc(doc(bound, eventPath()), activityEvent(), { merge:true }));
  await assertSucceeds(setDoc(doc(bound, eventPath()), activityEvent(), { merge:true }));
  await assertFails(setDoc(doc(bound, eventPath()), activityEvent({ reason:"changed" }), { merge:true }));
  await assertFails(setDoc(doc(bound, eventPath("event-1", "screen-b")), activityEvent({ screenId:"screen-b" }), { merge:true }));
});
