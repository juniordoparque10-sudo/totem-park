import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

export const PLAYER_IDENTITY_STATES = Object.freeze({
  UNAVAILABLE: "UNAVAILABLE",
  AUTHENTICATED: "AUTHENTICATED",
  BOUND: "BOUND",
  TEMPORARILY_UNVERIFIED: "TEMPORARILY_UNVERIFIED",
  REVOKED: "REVOKED",
});

function waitForAuth(auth) {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function ensurePlayerAuth(auth) {
  const existing = auth.currentUser || await waitForAuth(auth);
  if (existing) return existing;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export async function claimPlayerBinding({ app, auth, code, deviceId, appVersion }) {
  const user = await ensurePlayerAuth(auth);
  const claim = httpsCallable(getFunctions(app), "claimPlayerBinding");
  const result = await claim({ code, deviceId, appVersion });
  return { uid: user.uid, ...result.data };
}

export async function validatePlayerBinding({ app, auth }) {
  const user = await ensurePlayerAuth(auth);
  const validate = httpsCallable(getFunctions(app), "validatePlayerBinding");
  const result = await validate({});
  return { uid: user.uid, ...result.data };
}

export async function revokeOwnPlayerBinding({ app, auth, reason = "PLAYER_RELEASE" }) {
  const user = await ensurePlayerAuth(auth);
  const revoke = httpsCallable(getFunctions(app), "revokePlayerBinding");
  const result = await revoke({ uid: user.uid, reason });
  return result.data;
}

export function classifyPlayerIdentityFailure(error, online = globalThis.navigator?.onLine !== false) {
  const code = String(error?.code || "").toLowerCase();
  if (code.includes("permission-denied") || code.includes("failed-precondition")) {
    return PLAYER_IDENTITY_STATES.REVOKED;
  }
  if (!online || code.includes("unavailable") || code.includes("network")) {
    return PLAYER_IDENTITY_STATES.TEMPORARILY_UNVERIFIED;
  }
  return PLAYER_IDENTITY_STATES.UNAVAILABLE;
}
