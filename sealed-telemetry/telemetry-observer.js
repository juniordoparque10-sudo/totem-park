import { getApps, initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  doc,
  getDoc,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { APP_VERSION, createObserver, currentSessionCheckpoint, CURRENT_KEY_STORAGE_KEY, HISTORY_AT_KEY, HISTORY_MS, isAllowed, migrateTelemetryStorage } from "./observer-core.js";

const firebaseConfig = {
  apiKey: "AIzaSyBk775KTH959oIIEqnWiJRFW7Fo-1AX5AY",
  authDomain: "totem-park.firebaseapp.com",
  projectId: "totem-park",
  storageBucket: "totem-park.firebasestorage.app",
  messagingSenderId: "442546117681",
  appId: "1:442546117681:web:10106346df8cd91d198910",
};
const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
let db;
try {
  db = initializeFirestore(app, { localCache: memoryLocalCache() });
} catch {
  db = getFirestore(app);
}
const functions = getFunctions(app);
const validate = httpsCallable(functions, "validatePlayerBinding");
const claim = httpsCallable(functions, "claimPlayerBinding");
const CONFIG_STORAGE_KEY = "totempark-sealed-telemetry-config";
migrateTelemetryStorage(localStorage);

function previousHistoryAt() {
  try { return Number(localStorage.getItem(HISTORY_AT_KEY)) || 0; } catch { return 0; }
}

let observer;
let identity;
let verified = false;
let verifiedUid = "";
let configCurrent = false;
let lastHistoryAt = previousHistoryAt() || Date.now();
let syncBusy = false;
let configUnsubscribe;
let establishing;
let lastCurrentKey = (() => {
  try { return localStorage.getItem(CURRENT_KEY_STORAGE_KEY) || ""; } catch { return ""; }
})();

function savedConnection() {
  try {
    const value = JSON.parse(localStorage.getItem("totempark-tv-connection") || "null");
    const deviceId = localStorage.getItem("totempark-device-id");
    if (!value?.clientId || !value?.code || !deviceId || value.deviceId !== deviceId) return null;
    return { ...value, deviceId };
  } catch { return null; }
}

async function sync() {
  if (syncBusy || !verified || !configCurrent || !navigator.onLine || !observer?.canSync()) return;
  const pending = observer.pending();
  const latest = currentSessionCheckpoint(pending, observer.currentSessionId());
  if (!latest) return;
  syncBusy = true;
  try {
    const payload = latest.payload;
    const screen = doc(db, "clients", identity.clientId, "screens", identity.screenId);
    const currentKey = `${payload.session.sessionId}:${latest.sequence}`;
    if (currentKey !== lastCurrentKey) {
      await updateDoc(screen, { telemetry: payload, telemetryUpdatedAt: serverTimestamp() });
      lastCurrentKey = currentKey;
      try { localStorage.setItem(CURRENT_KEY_STORAGE_KEY, currentKey); } catch { /* Optional replay guard. */ }
    }
    if (latest.sequence > 1 && Date.now() - lastHistoryAt >= HISTORY_MS) {
      const olderSession = pending.find((item) => item.payload?.session?.sessionId !== payload.session.sessionId);
      const historyItem = olderSession
        ? pending.filter((item) => item.payload?.session?.sessionId === olderSession.payload.session.sessionId).at(-1)
        : latest;
      const historyPayload = historyItem.payload;
      const history = doc(db, "clients", identity.clientId, "screens", identity.screenId,
        "telemetrySessions", historyPayload.session.sessionId);
      await setDoc(history, { ...historyPayload, sequence: historyItem.sequence, updatedAt: serverTimestamp() }, { merge: true });
      observer.acknowledge(historyPayload.session.sessionId, historyItem.sequence);
      lastHistoryAt = Date.now();
      try { localStorage.setItem(HISTORY_AT_KEY, String(lastHistoryAt)); } catch { /* Optional throttle persistence. */ }
    }
  } catch (error) {
    console.warn("[SealedTelemetry] checkpoint deferred:", error?.code || error?.message || error);
  } finally {
    syncBusy = false;
  }
}

function startConfigListener() {
  configUnsubscribe?.();
  configUnsubscribe = onSnapshot(doc(db, "settings", "telemetry2a2c"), (snapshot) => {
    const config = snapshot.exists() ? snapshot.data() : { enabled: false };
    const allowed = isAllowed(config, identity);
    configCurrent = allowed && !snapshot.metadata.fromCache && navigator.onLine;
    observer.setEnabled(allowed);
    const saveConfig = () => {
      try { localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config)); } catch { /* Optional cache. */ }
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(saveConfig, { timeout: 2000 });
    else setTimeout(saveConfig, 1500);
  }, (error) => {
    // A failed read cannot authorize any remote transmission. Local collection
    // may continue during transient connectivity loss under the cached flag.
    configCurrent = false;
    if (error?.code === "permission-denied") observer.setEnabled(false);
  });
}

async function establish() {
  const connection = savedConnection();
  if (!connection || !navigator.onLine) return;
  if (identity?.clientId === connection.clientId && identity?.deviceId === connection.deviceId
      && verified && verifiedUid === auth.currentUser?.uid) return;
  let user = auth.currentUser;
  if (!user) user = (await signInAnonymously(auth)).user;
  let binding;
  try {
    binding = (await validate()).data;
  } catch (error) {
    if (error?.code !== "functions/permission-denied") throw error;
    const existing = await getDoc(doc(db, "playerDeviceBindings", user.uid));
    if (existing.exists()) throw new Error("Existing binding is not active; explicit re-pairing required", { cause: error });
    binding = (await claim({
      code: connection.code,
      deviceId: connection.deviceId,
      appVersion: APP_VERSION,
    })).data;
  }
  if (binding?.status !== "ACTIVE" || binding.clientId !== connection.clientId
      || binding.deviceId !== connection.deviceId
      || (connection.screenId && binding.screenId !== connection.screenId)) {
    throw new Error("Binding does not match the local Player connection");
  }
  const nextIdentity = {
    clientId: binding.clientId,
    screenId: binding.screenId,
    deviceId: binding.deviceId,
  };
  if (identity && (identity.clientId !== nextIdentity.clientId || identity.screenId !== nextIdentity.screenId
      || identity.deviceId !== nextIdentity.deviceId)) {
    observer?.stop();
    observer = null;
    verified = false;
  }
  identity = nextIdentity;
  if (!observer) {
    observer = createObserver({ onCheckpoint: sync });
    observer.start(identity);
  }
  verified = true;
  verifiedUid = user.uid;
  startConfigListener();
}

function tryEstablish() {
  if (establishing) return;
  establishing = establish().catch((error) => {
    verified = false;
    verifiedUid = "";
    configCurrent = false;
    if (error?.message?.includes("not active") || error?.message?.includes("does not match")) {
      observer?.setEnabled(false);
    }
    console.warn("[SealedTelemetry] identity unavailable:", error?.code || error?.message || error);
  }).finally(() => { establishing = null; });
}

function bootstrapLocal() {
  const connection = savedConnection();
  if (!connection?.screenId || observer) return;
  identity = { clientId: connection.clientId, screenId: connection.screenId, deviceId: connection.deviceId };
  observer = createObserver({ onCheckpoint: sync });
  observer.start(identity);
  try {
    const cached = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || "null");
    observer.setEnabled(isAllowed(cached, identity));
  } catch { observer.setEnabled(false); }
}

bootstrapLocal();
onAuthStateChanged(auth, tryEstablish);
window.addEventListener("online", () => { tryEstablish(); }, { passive: true });
window.addEventListener("offline", () => { verified = false; verifiedUid = ""; configCurrent = false; }, { passive: true });
setInterval(() => { tryEstablish(); sync(); }, 15000);
tryEstablish();
