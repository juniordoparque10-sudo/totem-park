const FIRESTORE_PERSISTENCE_KEY = "firestore/[DEFAULT]/totem-park/";

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

function waitWithTimeout(promise, timeoutMs, code, message) {
  let timer = null;
  return Promise.race([
    Promise.resolve(promise).finally(() => {
      if (timer !== null) clearTimeout(timer);
    }),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(message);
        error.code = code;
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
  heartbeatTimeoutMs = 15000,
} = {}) {
  if (!online) {
    scheduleRetry();
    return { status:"deferred-offline", removed:[] };
  }

  if (listLegacyFirestoreCoordinationKeys(storage).length === 0) {
    return { status:"not-needed", removed:[] };
  }

  try {
    await waitWithTimeout(
      waitForPendingWrites(),
      timeoutMs,
      "firestore-recovery-timeout",
      "Firestore pending writes recovery timed out",
    );
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
    await waitWithTimeout(
      requestHeartbeat(),
      heartbeatTimeoutMs,
      "firestore-heartbeat-timeout",
      "Firestore heartbeat recovery timed out",
    );
    return { status:"recovered", removed };
  } catch (error) {
    onError(error);
    scheduleRetry();
    return {
      status:error?.code === "firestore-heartbeat-timeout"
        ? "recovered-heartbeat-timeout"
        : "recovered-heartbeat-error",
      removed,
      error,
    };
  }
}

export function createFirestoreRecoveryController({
  storage = globalThis.localStorage,
  isOnline = () => globalThis.navigator?.onLine !== false,
  waitForPendingWrites,
  requestHeartbeat,
  onError = () => {},
  retryDelayMs = 60000,
  pendingWritesTimeoutMs = 15000,
  heartbeatTimeoutMs = 15000,
  scheduleDelay = (callback, delay) => setTimeout(callback, delay),
  clearDelay = (timer) => clearTimeout(timer),
} = {}) {
  let stopped = false;
  let inFlight = null;
  let retryTimer = null;
  let needsHeartbeat = false;

  function scheduleRetry() {
    if (stopped || retryTimer !== null) return;
    retryTimer = scheduleDelay(() => {
      retryTimer = null;
      attempt();
    }, retryDelayMs);
  }

  function verifyHeartbeat() {
    return waitWithTimeout(
      Promise.resolve(requestHeartbeat()).then((confirmed) => {
        if (confirmed !== true) throw new Error("Firestore heartbeat was not confirmed after recovery");
        return true;
      }),
      heartbeatTimeoutMs,
      "firestore-heartbeat-timeout",
      "Firestore heartbeat recovery timed out",
    );
  }

  function attempt() {
    if (stopped) return Promise.resolve(null);
    if (inFlight) return inFlight;

    const operation = needsHeartbeat
      ? verifyHeartbeat()
      : recoverLegacyFirestoreCoordination({
          storage,
          online:isOnline(),
          waitForPendingWrites,
          requestHeartbeat:verifyHeartbeat,
          scheduleRetry,
          onError,
          timeoutMs:pendingWritesTimeoutMs,
          heartbeatTimeoutMs,
        });

    inFlight = Promise.resolve(operation).then((result) => {
      if (needsHeartbeat) {
        needsHeartbeat = false;
        stopped = true;
        return { status:"heartbeat-recovered", removed:[] };
      }
      if (result.status === "recovered" || result.status === "not-needed") stopped = true;
      if (result.status === "recovered-heartbeat-error" || result.status === "recovered-heartbeat-timeout") {
        needsHeartbeat = true;
      }
      return result;
    }).catch((error) => {
      onError(error);
      scheduleRetry();
      return { status:"heartbeat-retry-deferred", removed:[], error };
    }).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return {
    attempt,
    stop() {
      stopped = true;
      if (retryTimer !== null) clearDelay(retryTimer);
      retryTimer = null;
    },
    state:() => ({ stopped, needsHeartbeat, retryScheduled:retryTimer !== null }),
  };
}
