import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { deleteUser, getAuth, signInAnonymously } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

const app = initializeApp({
  apiKey: "AIzaSyBk775KTH959oIIEqnWiJRFW7Fo-1AX5AY",
  authDomain: "totem-park.firebaseapp.com",
  projectId: "totem-park",
  appId: "1:442546117681:web:10106346df8cd91d198910",
}, "production-function-smoke");
const auth = getAuth(app);
const credential = await signInAnonymously(auth);
let outcome = "";
try {
  await httpsCallable(getFunctions(app), "claimPlayerBinding")({
    code: "INVALID-SMOKE-CODE",
    deviceId: "smoke-device",
    appVersion: "production-smoke",
  });
  throw new Error("Invalid pairing code was unexpectedly accepted");
} catch (error) {
  assert.equal(error.code, "functions/not-found");
  outcome = "AUTHENTICATED_REQUEST_VALIDATED_AND_INVALID_CODE_REJECTED";
}
await deleteUser(credential.user);
await deleteApp(app);
console.log(JSON.stringify({ projectId: "totem-park", outcome, temporaryAnonymousUserDeleted: true }));
