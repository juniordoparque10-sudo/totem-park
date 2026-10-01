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

function telemetry({ clientId = "client-a", screenId = "screen-a", deviceId = "device-a" } = {}) {
  return {
    schemaVersion: 1,
    session: { sessionId: "session-1", clientId, screenId, deviceId },
    current: {}, counters: {}, lastPlayerEvents: [], transitions: [], sequence: 1,
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
