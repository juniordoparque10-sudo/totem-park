import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

const projectId = "demo-totem-identity";
let env;
let app;

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
  await deleteApp(app);
  await env.cleanup();
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
