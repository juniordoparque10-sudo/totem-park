import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { deleteUser, getAuth, signInAnonymously } from "firebase/auth";
import { deleteField, doc, getDoc, getFirestore, setDoc, updateDoc } from "firebase/firestore";

const config = {
  apiKey: "AIzaSyBk775KTH959oIIEqnWiJRFW7Fo-1AX5AY",
  authDomain: "totem-park.firebaseapp.com",
  projectId: "totem-park",
  storageBucket: "totem-park.firebasestorage.app",
  messagingSenderId: "442546117681",
  appId: "1:442546117681:web:10106346df8cd91d198910",
};

async function denied(action, name) {
  try {
    await action();
    throw new Error(`${name}: unexpectedly allowed`);
  } catch (error) {
    const code = String(error?.code || "");
    if (code.includes("permission-denied")) return true;
    throw error;
  }
}

const unauthApp = initializeApp(config, "negative-unauth");
const unauthDb = getFirestore(unauthApp);
const codeSnapshot = await getDoc(doc(unauthDb, "tv_codes", "KEYFRK"));
assert.equal(codeSnapshot.exists(), true, "Known TV code must remain readable");
const { clientId, screenId } = codeSnapshot.data();
assert.ok(clientId && screenId, "TV code must still resolve to client and screen");
const screenRef = doc(unauthDb, "clients", clientId, "screens", screenId);
assert.equal((await getDoc(screenRef)).exists(), true, "Existing screen read must remain available");
await denied(() => updateDoc(screenRef, { telemetry: { probe: true } }), "unauthenticated telemetry");

const authApp = initializeApp(config, "negative-auth");
const auth = getAuth(authApp);
const authDb = getFirestore(authApp);
const credential = await signInAnonymously(auth);
const uid = credential.user.uid;

await denied(
  () => updateDoc(doc(authDb, "clients", clientId, "screens", screenId), {
    telemetry: { session: { clientId, screenId, deviceId: "negative-probe" } },
  }),
  "unbound authenticated telemetry"
);
await denied(
  () => setDoc(doc(authDb, "playerDeviceBindings", uid), {
    uid, clientId, screenId, deviceId: "negative-probe", status: "ACTIVE",
  }),
  "binding create"
);
await denied(
  () => updateDoc(doc(authDb, "playerDeviceBindings", uid), { screenId: "other", revokedAt: deleteField() }),
  "binding update"
);

await deleteUser(credential.user);
await Promise.all([deleteApp(unauthApp), deleteApp(authApp)]);
console.log(JSON.stringify({
  projectId: config.projectId,
  target: { clientId, screenId },
  unauthenticatedTelemetry: "DENIED",
  authenticatedWithoutBinding: "DENIED",
  directBindingCreate: "DENIED",
  directBindingUpdate: "DENIED",
  existingPublicReads: "PRESERVED",
  temporaryAnonymousUserDeleted: true,
}));
