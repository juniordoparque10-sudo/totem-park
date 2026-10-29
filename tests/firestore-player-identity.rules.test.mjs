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

function daily({ clientId = "client-a", screenId = "screen-a", deviceId = "device-a", sequence = 1, rx = 100, dateKey = "2026-10-28", ...overrides } = {}) {
  return {
    schemaVersion:1, dateKey, clientId, screenId, deviceId, sequence,
    internetRxBytes:rx, internetTxBytes:20, mediaDownloadedBytes:10, cacheReusedBytes:30,
    trafficAvoidedBytes:30, cachePlaybackHits:2, remotePlaybackCount:1, fallbackPlaybackCount:0,
    cacheablePlaybackCount:3, cacheHitRate:2 / 3, observedUptimeSeconds:60,
    provedPlaybackSeconds:30, provedOnlineSeconds:20, provedOfflineSeconds:10,
    sessionIds:["session-1"], sessionCount:1, restartCount:0, failureCount:0,
    unknownInterruptionCount:0, packageName:"pkg", versionCode:69, versionName:"V69",
    lastCommunicationAt:"2026-10-28T12:00:00.000Z", ...overrides,
  };
}

function activityEvent({ clientId = "client-a", screenId = "screen-a", deviceId = "device-a", reason = "", atMs = 1, expiresAtMs = atMs + 180 * 24 * 60 * 60 * 1000, ...overrides } = {}) {
  return {
    schemaVersion:1, id:"event-1", clientId, screenId, deviceId, sessionId:"session-1",
    type:"PLAYBACK_START", state:"ACTIVE", domain:"playback", atMs,
    mediaId:"m1", mediaType:"video", reason, expiresAtMs, expiresAt:new Date(expiresAtMs), ...overrides,
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
    await setDoc(doc(db, "clients/client-deleting"), {
      uid: "deleting-owner", accountStatus: "active", lifecycleStatus: "deletion_pending",
    });
    await setDoc(doc(db, screenPath("screen-a")), { name: "A", status: "online", connectedDeviceId: "device-a" });
    await setDoc(doc(db, screenPath("screen-b")), { name: "B", status: "online" });
    await setDoc(doc(db, bindingPath("player-a")), {
      uid: "player-a", clientId: "client-a", screenId: "screen-a", deviceId: "device-a", status: "ACTIVE",
    });
    await setDoc(doc(db, bindingPath("revoked")), {
      uid: "revoked", clientId: "client-a", screenId: "screen-a", deviceId: "device-r", status: "REVOKED",
    });
    await setDoc(doc(db, "clients/client-deleting/screens/screen-a"), { name: "Deleting" });
    await setDoc(doc(db, "clients/client-deleting/media/media-a"), { name: "Deleting media" });
    await setDoc(doc(db, "clients/client-deleting/playlists/playlist-a"), { name: "Deleting playlist" });
    await setDoc(doc(db, bindingPath("deleting-player")), {
      uid: "deleting-player", clientId: "client-deleting", screenId: "screen-a", deviceId: "device-d", status: "ACTIVE",
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
  await assertSucceeds(updateDoc(doc(bound, screenPath()), {
    capabilities: { ...capability, platform:"ANDROID", packageName:"br.com.parksolutions.totempark.player.rcsecurelink", versionCode:70 },
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

test("daily checkpoint rejects malformed dates, field types, and inconsistent aggregates", async () => {
  const bound = env.authenticatedContext("player-a").firestore();

  await assertFails(setDoc(doc(bound, dailyPath("2026-1-28")), daily({ dateKey:"2026-1-28" })));
  await assertFails(setDoc(doc(bound, dailyPath("2026-02-31")), daily({ dateKey:"2026-02-31" })));
  await assertFails(setDoc(doc(bound, dailyPath("2025-02-29")), daily({ dateKey:"2025-02-29" })));
  await assertSucceeds(setDoc(doc(bound, dailyPath("2024-02-29")), daily({ dateKey:"2024-02-29" })));
  await assertFails(setDoc(doc(bound, dailyPath()), daily({ cachePlaybackHits:"2" })));
  await assertFails(setDoc(doc(bound, dailyPath()), daily({ provedOnlineSeconds:-1 })));
  await assertFails(setDoc(doc(bound, dailyPath()), daily({ cacheHitRate:1.1 })));
  await assertFails(setDoc(doc(bound, dailyPath()), daily({ sessionCount:2 })));
  await assertFails(setDoc(doc(bound, dailyPath()), daily({ versionCode:"69" })));
});

test("daily checkpoint requires a strictly newer sequence for changed counters", async () => {
  const bound = env.authenticatedContext("player-a").firestore();
  const path = dailyPath("2026-10-29");
  await assertSucceeds(setDoc(doc(bound, path), daily({ dateKey:"2026-10-29", sequence:5, rx:200 })));
  await assertFails(setDoc(doc(bound, path), daily({ dateKey:"2026-10-29", sequence:5, rx:201 })));
  await assertFails(setDoc(doc(bound, path), daily({ dateKey:"2026-10-29", sequence:6, rx:200, cachePlaybackHits:1 })));
  await assertSucceeds(setDoc(doc(bound, path), daily({ dateKey:"2026-10-29", sequence:5, rx:200 })));
});

test("historical event enforces exact 180-day retention and timestamp coherence", async () => {
  const bound = env.authenticatedContext("player-a").firestore();
  await assertFails(setDoc(doc(bound, eventPath("short-retention")), activityEvent({
    expiresAtMs:1 + 179 * 24 * 60 * 60 * 1000,
    id:"short-retention",
  })));
  await assertFails(setDoc(doc(bound, eventPath("long-retention")), activityEvent({
    expiresAtMs:1 + 181 * 24 * 60 * 60 * 1000,
    id:"long-retention",
  })));
  await assertFails(setDoc(doc(bound, eventPath("timestamp-mismatch")), activityEvent({
    id:"timestamp-mismatch",
    expiresAt:new Date(1 + 179 * 24 * 60 * 60 * 1000),
  })));
  await assertFails(setDoc(doc(bound, eventPath("invalid-time")), activityEvent({
    id:"invalid-time", atMs:-1,
  })));
});

test("deletion-pending clients cannot update screens or write historical telemetry", async () => {
  const owner = env.authenticatedContext("deleting-owner", { email:"deleting@example.com" }).firestore();
  const player = env.authenticatedContext("deleting-player").firestore();
  const base = "clients/client-deleting/screens/screen-a";

  await assertFails(updateDoc(doc(owner, base), { name:"Must stay unchanged" }));
  await assertFails(setDoc(doc(player, `${base}/telemetryDaily/2026-10-28`), daily({
    clientId:"client-deleting", deviceId:"device-d",
  })));
  await assertFails(setDoc(doc(player, `${base}/telemetryEvents/event-1`), activityEvent({
    clientId:"client-deleting", deviceId:"device-d",
  })));
});

test("deployed lifecycle protections remain enforced outside telemetry", async () => {
  const deletingOwner = env.authenticatedContext("deleting-owner", { email:"deleting@example.com" }).firestore();
  const activeOwner = env.authenticatedContext("client-owner", { email:"owner@example.com" }).firestore();

  await assertFails(updateDoc(doc(deletingOwner, "clients/client-deleting/media/media-a"), { name:"blocked" }));
  await assertFails(updateDoc(doc(deletingOwner, "clients/client-deleting/playlists/playlist-a"), { name:"blocked" }));
  await assertFails(setDoc(doc(deletingOwner, "clients/client-deleting/custom/item-a"), { value:1 }));
  await assertFails(setDoc(doc(deletingOwner, "tv_codes/deleting-code"), { clientId:"client-deleting" }));

  await assertSucceeds(setDoc(doc(activeOwner, "clients/client-a/media/media-active"), { name:"allowed" }));
  await assertSucceeds(setDoc(doc(activeOwner, "clients/client-a/playlists/playlist-active"), { name:"allowed" }));
  await assertSucceeds(setDoc(doc(activeOwner, "clients/client-a/custom/item-active"), { value:1 }));
  await assertSucceeds(setDoc(doc(activeOwner, "tv_codes/active-code"), { clientId:"client-a" }));
});
