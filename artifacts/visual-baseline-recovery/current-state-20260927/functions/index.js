const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

function requireUid(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Player authentication is required.");
  return request.auth.uid;
}

function clean(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

async function isMaster(request) {
  const email = clean(request.auth?.token?.email).toLowerCase();
  if (!email) return false;
  const access = await db.doc("settings/masterAccess").get();
  const fallback = ["admin@parksolutions.com", "juniordoparque10@gmail.com"];
  const emails = access.exists ? access.get("emails") || [] : fallback;
  return emails.map((item) => clean(item).toLowerCase()).includes(email);
}

exports.claimPlayerBinding = onCall(async (request) => {
  const uid = requireUid(request);
  const code = clean(request.data?.code, 16).toUpperCase();
  const deviceId = clean(request.data?.deviceId);
  const appVersion = clean(request.data?.appVersion, 80);
  if (!code || !deviceId) throw new HttpsError("invalid-argument", "Code and deviceId are required.");

  return db.runTransaction(async (transaction) => {
    const codeRef = db.doc(`tv_codes/${code}`);
    const codeSnapshot = await transaction.get(codeRef);
    if (!codeSnapshot.exists) throw new HttpsError("not-found", "Pairing code was not found.");
    const codeData = codeSnapshot.data() || {};
    const clientId = clean(codeData.clientId);
    const screenId = clean(codeData.screenId);
    if (!clientId || !screenId) throw new HttpsError("failed-precondition", "Pairing code is incomplete.");

    const screenRef = db.doc(`clients/${clientId}/screens/${screenId}`);
    const bindingRef = db.doc(`playerDeviceBindings/${uid}`);
    const [screenSnapshot, bindingSnapshot] = await Promise.all([
      transaction.get(screenRef),
      transaction.get(bindingRef),
    ]);
    if (!screenSnapshot.exists) throw new HttpsError("not-found", "Screen was not found.");

    const previous = bindingSnapshot.data() || {};
    if (previous.status === "ACTIVE" && (previous.clientId !== clientId || previous.screenId !== screenId)) {
      throw new HttpsError("failed-precondition", "This identity is already bound to another screen.");
    }
    const screen = screenSnapshot.data() || {};
    if (screen.connectedAuthUid && screen.connectedAuthUid !== uid) {
      throw new HttpsError("already-exists", "Screen is bound to another authenticated player.");
    }

    const now = FieldValue.serverTimestamp();
    const sameCurrentLink = previous.status === "ACTIVE"
      && previous.clientId === clientId
      && previous.screenId === screenId
      && previous.deviceId === deviceId;
    // Legacy pairedAt/createdAt can predate a later relink. Do not turn either
    // into a claimed current-link timestamp without independent evidence.
    const linkedAt = sameCurrentLink ? (previous.linkedAt || null) : now;
    transaction.set(bindingRef, {
      uid, clientId, screenId, deviceId, appVersion,
      status: "ACTIVE",
      createdAt: previous.createdAt || now,
      pairedAt: sameCurrentLink ? (previous.pairedAt || null) : now,
      linkedAt,
      updatedAt: now,
      revokedAt: null,
    }, { merge: false });
    transaction.update(screenRef, {
      connectedAuthUid: uid,
      connectedDeviceId: deviceId,
      linkedAt,
      status: "online",
      lastSeenAt: now,
    });
    return { status: "ACTIVE", clientId, screenId, deviceId };
  });
});

exports.validatePlayerBinding = onCall(async (request) => {
  const uid = requireUid(request);
  const snapshot = await db.doc(`playerDeviceBindings/${uid}`).get();
  if (!snapshot.exists || snapshot.get("status") !== "ACTIVE") {
    throw new HttpsError("permission-denied", "Player binding is not active.");
  }
  const binding = snapshot.data();
  return { status: binding.status, clientId: binding.clientId, screenId: binding.screenId, deviceId: binding.deviceId };
});

exports.revokePlayerBinding = onCall(async (request) => {
  const callerUid = requireUid(request);
  const requestedUid = clean(request.data?.uid) || callerUid;
  if (requestedUid !== callerUid && !(await isMaster(request))) {
    throw new HttpsError("permission-denied", "Only a master can revoke another player.");
  }
  const bindingRef = db.doc(`playerDeviceBindings/${requestedUid}`);
  return db.runTransaction(async (transaction) => {
    const bindingSnapshot = await transaction.get(bindingRef);
    if (!bindingSnapshot.exists) return { status: "NOT_FOUND" };
    const binding = bindingSnapshot.data();
    const screenRef = db.doc(`clients/${binding.clientId}/screens/${binding.screenId}`);
    const screenSnapshot = await transaction.get(screenRef);
    transaction.update(bindingRef, {
      status: "REVOKED",
      revokedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      revokeReason: clean(request.data?.reason, 80) || "REVOKED",
    });
    if (screenSnapshot.exists && screenSnapshot.get("connectedAuthUid") === requestedUid) {
      transaction.update(screenRef, {
        connectedAuthUid: FieldValue.delete(),
        connectedDeviceId: FieldValue.delete(),
        status: "offline",
        lastSeenAt: null,
      });
    }
    return { status: "REVOKED" };
  });
});
