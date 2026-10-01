import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

export const PLAYER_IDENTITY_STATES = Object.freeze({ UNAVAILABLE: 'UNAVAILABLE', BOUND: 'BOUND', REVOKED: 'REVOKED' });
export const claimPlayerBinding = async () => { throw new Error('Identity pilot is disabled in the official player'); };
export const revokeOwnPlayerBinding = async () => { throw new Error('Identity pilot is disabled in the official player'); };
export const classifyPlayerIdentityFailure = () => PLAYER_IDENTITY_STATES.UNAVAILABLE;

async function ensureRescueAuth(auth) {
  if (auth.currentUser) return auth.currentUser;
  const existing = await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
  if (existing) return existing;
  return (await signInAnonymously(auth)).user;
}

export async function uploadTransitionDiagnosticRescue({ app, auth, payload }) {
  await ensureRescueAuth(auth);
  const upload = httpsCallable(getFunctions(app), "uploadTransitionDiagnosticRescue");
  return (await upload(payload)).data;
}
