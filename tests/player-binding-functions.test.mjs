import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInAnonymously } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

const projectId = "demo-totem-identity";
let env;
let app;
const extraApps = [];

function emulatorApp(name) {
  const instance = initializeApp({ projectId, apiKey: "demo-key", authDomain: "demo.local" }, name);
  connectAuthEmulator(getAuth(instance), "http://127.0.0.1:9198", { disableWarnings: true });
  connectFunctionsEmulator(getFunctions(instance), "127.0.0.1", 5002);
  extraApps.push(instance);
  return instance;
}

async function assertCallableCode(action, expectedCode) {
  await assert.rejects(action, (error) => {
    assert.match(String(error?.code || ""), new RegExp(`${expectedCode}$`));
    return true;
  });
}

before(async () => {
  env = await initializeTestEnvironment({ projectId });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "tv_codes/SECURE1"), { clientId: "client-a", screenId: "screen-a" });
    await setDoc(doc(db, "clients/client-a/screens/screen-a"), { name: "Screen A", status: "offline" });
  });
  app = initializeApp({ projectId, apiKey: "demo-key", authDomain: "demo.local" }, "binding-functions-test");
  connectAuthEmulator(getAuth(app), "http://127.0.0.1:9198", { disableWarnings: true });
  connectFunctionsEmulator(getFunctions(app), "127.0.0.1", 5002);
});

after(async () => {
  await Promise.all(extraApps.map((instance) => deleteApp(instance)));
  await deleteApp(app);
  await env.cleanup();
});

test("master authorization permits one secure rebind and revokes the old UID", async () => {
  const oldPlayer = emulatorApp("binding-old-player");
  const nextPlayer = emulatorApp("binding-next-player");
  const thirdPlayer = emulatorApp("binding-third-player");
  const master = emulatorApp("binding-master");
  const oldCredential = await signInAnonymously(getAuth(oldPlayer));
  const nextCredential = await signInAnonymously(getAuth(nextPlayer));
  await signInAnonymously(getAuth(thirdPlayer));
  await createUserWithEmailAndPassword(getAuth(master), "master@example.com", "secure-test-password");

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "settings/masterAccess"), { emails: ["master@example.com"] });
    await setDoc(doc(db, "tv_codes/REBIND1"), { clientId: "client-a", screenId: "screen-rebind" });
    await setDoc(doc(db, "clients/client-a/screens/screen-rebind"), {
      name: "Rebind", connectedAuthUid: oldCredential.user.uid, connectedDeviceId: "device-rebind",
    });
    await setDoc(doc(db, `playerDeviceBindings/${oldCredential.user.uid}`), {
      uid: oldCredential.user.uid, clientId: "client-a", screenId: "screen-rebind", deviceId: "device-rebind", status: "ACTIVE",
    });
  });

  const nextClaim = httpsCallable(getFunctions(nextPlayer), "claimPlayerBinding");
  await assertCallableCode(() => nextClaim({ code: "REBIND1", deviceId: "device-rebind", appVersion: "test" }), "already-exists");
  const unauthorized = httpsCallable(getFunctions(nextPlayer), "authorizePlayerRebind");
  await assertCallableCode(() => unauthorized({ clientId: "client-a", screenId: "screen-rebind" }), "permission-denied");

  const authorize = httpsCallable(getFunctions(master), "authorizePlayerRebind");
  const authorization = await authorize({ clientId: "client-a", screenId: "screen-rebind" });
  assert.equal(authorization.data.status, "ACTIVE");
  const rebound = await nextClaim({ code: "REBIND1", deviceId: "device-rebind", appVersion: "test" });
  assert.equal(rebound.data.status, "ACTIVE");

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const screen = (await getDoc(doc(db, "clients/client-a/screens/screen-rebind"))).data();
    const oldBinding = (await getDoc(doc(db, `playerDeviceBindings/${oldCredential.user.uid}`))).data();
    const currentBinding = (await getDoc(doc(db, `playerDeviceBindings/${nextCredential.user.uid}`))).data();
    const consumed = (await getDoc(doc(db, "clients/client-a/screens/screen-rebind/system/rebindAuthorization"))).data();
    const audit = (await getDoc(doc(db, `playerRebindAuthorizations/${consumed.authorizationId}`))).data();
    assert.equal(screen.connectedAuthUid, nextCredential.user.uid);
    assert.equal(oldBinding.status, "REVOKED");
    assert.equal(currentBinding.status, "ACTIVE");
    assert.equal(consumed.status, "CONSUMED");
    assert.equal(consumed.consumedBy, nextCredential.user.uid);
    assert.equal(audit.status, "CONSUMED");
    assert.equal(audit.screenId, "screen-rebind");
  });

  const thirdClaim = httpsCallable(getFunctions(thirdPlayer), "claimPlayerBinding");
  await assertCallableCode(() => thirdClaim({ code: "REBIND1", deviceId: "device-rebind", appVersion: "test" }), "already-exists");
});

test("authenticated backend claim creates an authoritative binding", async () => {
  const credential = await signInAnonymously(getAuth(app));
  const claim = httpsCallable(getFunctions(app), "claimPlayerBinding");
  const response = await claim({ code: "SECURE1", deviceId: "device-a", appVersion: "test" });
  assert.equal(response.data.status, "ACTIVE");
  assert.equal(response.data.screenId, "screen-a");

  await env.withSecurityRulesDisabled(async (context) => {
    const snapshot = await getDoc(doc(context.firestore(), `playerDeviceBindings/${credential.user.uid}`));
    assert.equal(snapshot.data().uid, credential.user.uid);
    assert.equal(snapshot.data().clientId, "client-a");
    assert.equal(snapshot.data().deviceId, "device-a");
    assert.ok(snapshot.data().linkedAt?.toMillis());
    const screen = await getDoc(doc(context.firestore(), "clients/client-a/screens/screen-a"));
    assert.equal(screen.data().linkedAt.toMillis(), snapshot.data().linkedAt.toMillis());
  });

  let original;
  await env.withSecurityRulesDisabled(async (context) => {
    original = (await getDoc(doc(context.firestore(), `playerDeviceBindings/${credential.user.uid}`))).data().linkedAt.toMillis();
  });
  await claim({ code: "SECURE1", deviceId: "device-a", appVersion: "test-reopen" });
  let unchanged;
  await env.withSecurityRulesDisabled(async (context) => {
    unchanged = (await getDoc(doc(context.firestore(), `playerDeviceBindings/${credential.user.uid}`))).data().linkedAt.toMillis();
  });
  assert.equal(unchanged, original, "revalidation must preserve the original link time");

  const revoke = httpsCallable(getFunctions(app), "revokePlayerBinding");
  await revoke({ reason: "TEST_REPAIR" });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await claim({ code: "SECURE1", deviceId: "device-b", appVersion: "test-relink" });
  await env.withSecurityRulesDisabled(async (context) => {
    const binding = (await getDoc(doc(context.firestore(), `playerDeviceBindings/${credential.user.uid}`))).data();
    const screen = (await getDoc(doc(context.firestore(), "clients/client-a/screens/screen-a"))).data();
    assert.equal(binding.deviceId, "device-b");
    assert.ok(binding.linkedAt.toMillis() > original,
      `new binding must get a new server timestamp: original=${original}, next=${binding.linkedAt.toMillis()}, previousStatus=${binding.status}`);
    assert.equal(screen.linkedAt.toMillis(), binding.linkedAt.toMillis());
  });
});
