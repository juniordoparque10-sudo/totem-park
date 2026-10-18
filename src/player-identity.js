import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

export const PLAYER_IDENTITY_STATES = Object.freeze({
  UNAVAILABLE: "UNAVAILABLE",
  AUTHENTICATED: "AUTHENTICATED",
  BOUND: "BOUND",
  TEMPORARILY_UNVERIFIED: "TEMPORARILY_UNVERIFIED",
  REVOKED: "REVOKED",
});

export const PLAYER_BINDING_CLAIM_FAILURES = Object.freeze({
  SCREEN_ALREADY_CONNECTED: "SCREEN_ALREADY_CONNECTED",
  INVALID_CODE: "INVALID_CODE",
  PERMISSION: "PERMISSION",
  CONNECTION: "CONNECTION",
  UNKNOWN: "UNKNOWN",
});

export function classifyPlayerBindingClaimFailure(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  if (code.includes("already-exists")) return PLAYER_BINDING_CLAIM_FAILURES.SCREEN_ALREADY_CONNECTED;
  if (code.includes("failed-precondition") && message.includes("already bound")) return PLAYER_BINDING_CLAIM_FAILURES.SCREEN_ALREADY_CONNECTED;
  if (code.includes("not-found") || code.includes("invalid-argument") || code.includes("failed-precondition")) return PLAYER_BINDING_CLAIM_FAILURES.INVALID_CODE;
  if (code.includes("permission-denied") || code.includes("unauthenticated")) return PLAYER_BINDING_CLAIM_FAILURES.PERMISSION;
  if (code.includes("unavailable") || code.includes("network") || code.includes("deadline-exceeded")) return PLAYER_BINDING_CLAIM_FAILURES.CONNECTION;
  return PLAYER_BINDING_CLAIM_FAILURES.UNKNOWN;
}

export function shouldRevokeSecureBindingOnRelease({
  isPlayerTelemetryBuild = false,
  isSecureLinkExperiment = false,
  bindingStatus = "",
} = {}) {
  return bindingStatus === "ACTIVE" && (isPlayerTelemetryBuild || isSecureLinkExperiment);
}

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

export async function authorizePlayerRebind({ app, clientId, screenId }) {
  const authorize = httpsCallable(getFunctions(app), "authorizePlayerRebind");
  const result = await authorize({ clientId, screenId });
  return result.data;
}

export async function releasePlayerBindingForScreen({ app, clientId, screenId }) {
  const release = httpsCallable(getFunctions(app), "releasePlayerBindingForScreen");
  const result = await release({ clientId, screenId });
  return result.data;
}

export function getPlayerBindingClaimMessage(failure) {
  if (failure === PLAYER_BINDING_CLAIM_FAILURES.SCREEN_ALREADY_CONNECTED) {
    return "Esta tela possui um vínculo ativo com outro dispositivo. Use a reautorização explícita no Portal para liberar a troca.";
  }
  if (failure === PLAYER_BINDING_CLAIM_FAILURES.INVALID_CODE) {
    return "Código inválido ou tela não encontrada. Confira o código e tente novamente.";
  }
  if (failure === PLAYER_BINDING_CLAIM_FAILURES.PERMISSION) {
    return "A autenticação deste Player não tem permissão para concluir o vínculo.";
  }
  if (failure === PLAYER_BINDING_CLAIM_FAILURES.CONNECTION) {
    return "O serviço de vínculo está temporariamente indisponível. Tente novamente.";
  }
  return "Não foi possível consultar o vínculo desta tela. Tente novamente.";
}

export async function uploadTransitionDiagnosticRescue({ app, auth, payload }) {
  await ensurePlayerAuth(auth);
  const upload = httpsCallable(getFunctions(app), "uploadTransitionDiagnosticRescue");
  const result = await upload(payload);
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
