import { getApps, initializeApp } from "firebase/app";
import { registerPlugin } from "@capacitor/core";
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
import { createObserver, HISTORY_MS, isAllowed } from "./observer-core.js";
import { createPerfTrace, observeLongTasks, publicMediaSrc } from "./perf-trace.js";

const PACKAGE_NAME = "br.com.parksolutions.totempark.player.telemetryperfdiag";
const APP_VERSION = "1.0-player-2a2-c-sidecar-perf-diag";
const PLAYER_BUNDLE_SHA256 = "E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB";
const DiagnosticExport = registerPlugin("DiagnosticExport");
const perfTrace = createPerfTrace();
const trace = (type, details) => perfTrace.record(type, details);
observeLongTasks(perfTrace);

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
const HISTORY_AT_KEY = "totempark-sealed-telemetry-history-at";

function previousHistoryAt() {
  try { return Number(localStorage.getItem(HISTORY_AT_KEY)) || 0; } catch { return 0; }
}

let observer;
let identity;
let verified = false;
let verifiedUid = "";
let configCurrent = false;
let lastHistoryAt = previousHistoryAt();
let syncBusy = false;
let configUnsubscribe;
let establishing;
let lastCurrentKey = "";
let telemetryEnabled = false;
let exportedFile = "";

function savedConnection() {
  try {
    const value = JSON.parse(localStorage.getItem("totempark-tv-connection") || "null");
    const deviceId = localStorage.getItem("totempark-device-id");
    if (!value?.clientId || !value?.code || !deviceId || value.deviceId !== deviceId) return null;
    return { ...value, deviceId };
  } catch { return null; }
}

function sanitizedSnapshot(payload) {
  const started = performance.now();
  trace("SERIALIZE_START", { purpose: "checkpoint-sanitize" });
  const json = JSON.stringify(payload);
  const copy = JSON.parse(json);
  trace("SERIALIZE_END", {
    purpose: "checkpoint-sanitize",
    durationMs: performance.now() - started,
    approximateBytes: json.length * 2,
  });
  const raw = copy.current.currentSrc;
  try {
    const url = new URL(raw);
    url.search = "";
    url.hash = "";
    copy.current.currentSrc = url.href;
  } catch { copy.current.currentSrc = ""; }
  return copy;
}

async function sync() {
  if (syncBusy || !verified || !configCurrent || !navigator.onLine || !observer) return;
  const pending = observer.pending();
  if (!pending.length) return;
  syncBusy = true;
  try {
    const latest = pending.at(-1);
    const payload = sanitizedSnapshot(latest.payload);
    const screen = doc(db, "clients", identity.clientId, "screens", identity.screenId);
    const currentKey = `${payload.session.sessionId}:${latest.sequence}`;
    if (currentKey !== lastCurrentKey) {
      const started = performance.now();
      trace("FIRESTORE_UPDATE_START", { sequence: latest.sequence });
      try {
        await updateDoc(screen, { telemetry: payload, telemetryUpdatedAt: serverTimestamp() });
        trace("FIRESTORE_UPDATE_END", { sequence: latest.sequence, durationMs: performance.now() - started, success: true });
      } catch (error) {
        trace("FIRESTORE_UPDATE_END", { sequence: latest.sequence, durationMs: performance.now() - started, success: false, errorCode: error?.code || null });
        throw error;
      }
      lastCurrentKey = currentKey;
    }
    if (Date.now() - lastHistoryAt >= HISTORY_MS) {
      const olderSession = pending.find((item) => item.payload?.session?.sessionId !== payload.session.sessionId);
      const historyItem = olderSession
        ? pending.filter((item) => item.payload?.session?.sessionId === olderSession.payload.session.sessionId).at(-1)
        : latest;
      const historyPayload = sanitizedSnapshot(historyItem.payload);
      const history = doc(db, "clients", identity.clientId, "screens", identity.screenId,
        "telemetrySessions", historyPayload.session.sessionId);
      const started = performance.now();
      trace("HISTORY_WRITE_START", { sequence: historyItem.sequence });
      try {
        await setDoc(history, { ...historyPayload, sequence: historyItem.sequence, updatedAt: serverTimestamp() }, { merge: true });
        trace("HISTORY_WRITE_END", { sequence: historyItem.sequence, durationMs: performance.now() - started, success: true });
      } catch (error) {
        trace("HISTORY_WRITE_END", { sequence: historyItem.sequence, durationMs: performance.now() - started, success: false, errorCode: error?.code || null });
        throw error;
      }
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
    telemetryEnabled = allowed;
    try { localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config)); } catch { /* Optional cache. */ }
    if (configCurrent) sync();
  }, (error) => {
    // A failed read cannot authorize any remote transmission. Local collection
    // may continue during transient connectivity loss under the cached flag.
    configCurrent = false;
    if (error?.code === "permission-denied") {
      observer.setEnabled(false);
      telemetryEnabled = false;
    }
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
    observer = createObserver({ onCheckpoint: sync, onTrace: trace });
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
      telemetryEnabled = false;
    }
    console.warn("[SealedTelemetry] identity unavailable:", error?.code || error?.message || error);
  }).finally(() => { establishing = null; });
}

function bootstrapLocal() {
  const connection = savedConnection();
  if (!connection?.screenId || observer) return;
  identity = { clientId: connection.clientId, screenId: connection.screenId, deviceId: connection.deviceId };
  observer = createObserver({ onCheckpoint: sync, onTrace: trace });
  observer.start(identity);
  try {
    const cached = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || "null");
    telemetryEnabled = isAllowed(cached, identity);
    observer.setEnabled(telemetryEnabled);
  } catch { observer.setEnabled(false); telemetryEnabled = false; }
}

async function exportPerformanceTrace(status, button) {
  if (exportedFile) {
    await DiagnosticExport.shareLast();
    return;
  }
  const report = observer?.report();
  const screenId = identity?.screenId || savedConnection()?.screenId;
  if (!report?.session?.sessionId || !screenId) throw new Error("Sessão ou tela ainda indisponível");
  const now = new Date();
  const stamp = now.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-");
  const fileName = `totempark-sidecar-perf-${stamp}.json`;
  trace("EXPORT_REQUESTED");
  const payload = {
    appVersion: APP_VERSION,
    packageName: PACKAGE_NAME,
    sessionId: report.session.sessionId,
    screenId,
    exportedAt: now.toISOString(),
    telemetryEnabled,
    playerBundleSha256: PLAYER_BUNDLE_SHA256,
    performanceTimeOrigin: performance.timeOrigin,
    current: { ...report.current, currentSrc: publicMediaSrc(report.current?.currentSrc) },
    counters: report.counters,
    events: perfTrace.snapshot(),
  };
  const result = await DiagnosticExport.save({ fileName, data: JSON.stringify(payload, null, 2) });
  if (result.folder !== "Documents/TotemPark/" || result.fileName !== fileName || result.packageName !== PACKAGE_NAME) {
    throw new Error("A exportação pública não corresponde ao pacote ou caminho esperado");
  }
  exportedFile = fileName;
  status.textContent = `Salvo: ${fileName}`;
  button.textContent = "Compartilhar PERF";
}

function installExportControl() {
  if (document.getElementById("totempark-sidecar-perf-export")) return;
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;top:12px;right:12px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:4px;max-width:48vw";
  const button = document.createElement("button");
  button.id = "totempark-sidecar-perf-export";
  button.type = "button";
  button.textContent = "Exportar PERF";
  button.style.cssText = "padding:10px 16px;border:2px solid white;border-radius:10px;background:#10358a;color:white;font:700 17px Arial,sans-serif";
  const status = document.createElement("span");
  status.style.cssText = "color:white;background:#10234d;padding:3px 6px;font:12px Arial,sans-serif;overflow-wrap:anywhere";
  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = exportedFile ? "Abrindo compartilhamento…" : "Salvando diagnóstico…";
    try { await exportPerformanceTrace(status, button); }
    catch (error) { status.textContent = `Falha: ${error?.message || error}`; }
    finally { button.disabled = false; }
  });
  container.append(button, status);
  document.body.append(container);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installExportControl, { once: true });
else installExportControl();

bootstrapLocal();
onAuthStateChanged(auth, tryEstablish);
window.addEventListener("online", () => { tryEstablish(); sync(); }, { passive: true });
window.addEventListener("offline", () => { verified = false; verifiedUid = ""; configCurrent = false; }, { passive: true });
setInterval(tryEstablish, 15000);
tryEstablish();
