const FIRESTORE_PERSISTENCE_KEY = "firestore/[DEFAULT]/totem-park/main";

export const FIRESTORE_COORDINATION_PREFIX = Object.freeze({
  clients: `firestore_clients_${FIRESTORE_PERSISTENCE_KEY}_`,
  mutations: `firestore_mutations_${FIRESTORE_PERSISTENCE_KEY}_`,
  targets: `firestore_targets_${FIRESTORE_PERSISTENCE_KEY}_`,
  onlineState: `firestore_online_state_${FIRESTORE_PERSISTENCE_KEY}`,
  bundleLoaded: `firestore_bundle_loaded_v2_${FIRESTORE_PERSISTENCE_KEY}`,
  sequenceNumber: `firestore_sequence_number_${FIRESTORE_PERSISTENCE_KEY}`,
});

const PREFIX_KEYS = [
  FIRESTORE_COORDINATION_PREFIX.clients,
  FIRESTORE_COORDINATION_PREFIX.mutations,
  FIRESTORE_COORDINATION_PREFIX.targets,
];

const EXACT_KEYS = new Set([
  FIRESTORE_COORDINATION_PREFIX.onlineState,
  FIRESTORE_COORDINATION_PREFIX.bundleLoaded,
  FIRESTORE_COORDINATION_PREFIX.sequenceNumber,
]);

export function isLegacyFirestoreCoordinationKey(key) {
  const normalized = String(key || "");
  return EXACT_KEYS.has(normalized) || PREFIX_KEYS.some((prefix) => normalized.startsWith(prefix));
}

export function listLegacyFirestoreCoordinationKeys(storage = globalThis.localStorage) {
  const keys = [];
  for (let index = 0; index < Number(storage?.length || 0); index += 1) {
    const key = storage.key(index);
    if (isLegacyFirestoreCoordinationKey(key)) keys.push(key);
  }
  return keys;
}

function waitWithTimeout(promise, timeoutMs) {
  let timer = null;
  return Promise.race([
    Promise.resolve(promise).finally(() => {
      if (timer !== null) clearTimeout(timer);
    }),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error("Firestore pending writes recovery timed out");
        error.code = "firestore-recovery-timeout";
        reject(error);
      }, timeoutMs);
    }),
  ]);
}

export async function recoverLegacyFirestoreCoordination({
  storage = globalThis.localStorage,
  online = globalThis.navigator?.onLine !== false,
  waitForPendingWrites,
  requestHeartbeat = async () => {},
  scheduleRetry = () => {},
  onError = () => {},
  timeoutMs = 15000,
} = {}) {
  if (!online) {
    scheduleRetry();
    return { status:"deferred-offline", removed:[] };
  }

  if (listLegacyFirestoreCoordinationKeys(storage).length === 0) {
    return { status:"not-needed", removed:[] };
  }

  try {
    await waitWithTimeout(waitForPendingWrites(), timeoutMs);
  } catch (error) {
    onError(error);
    scheduleRetry();
    return {
      status:error?.code === "firestore-recovery-timeout" ? "deferred-timeout" : "deferred-error",
      removed:[],
      error,
    };
  }

  const removed = listLegacyFirestoreCoordinationKeys(storage);
  for (const key of removed) storage.removeItem(key);

  try {
    await requestHeartbeat();
    return { status:"recovered", removed };
  } catch (error) {
    onError(error);
    scheduleRetry();
    return { status:"recovered-heartbeat-error", removed, error };
  }
}
