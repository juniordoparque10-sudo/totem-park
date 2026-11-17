import { safeSetStorageItem } from "./safe-storage.js";

export const BASIC_TELEMETRY_SCHEMA_VERSION = 5;
export const BASIC_TELEMETRY_PROFILE = "BASIC";
export const BASIC_TELEMETRY_STORAGE_KEY = "totempark-player-basic-telemetry-v1";

const fallbackId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const iso = value => new Date(value).toISOString();

function readInstallation(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(BASIC_TELEMETRY_STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeAppInfo(value = {}) {
  return {
    packageName:String(value.packageName || "").trim(),
    versionCode:Number.isFinite(Number(value.versionCode)) ? Number(value.versionCode) : null,
    versionName:String(value.versionName || "").trim(),
    buildId:String(value.buildId || "").trim(),
    buildTimestamp:String(value.buildTimestamp || "").trim(),
  };
}

function appFingerprint(app) {
  return [app.packageName, app.versionCode ?? "", app.versionName, app.buildId, app.buildTimestamp].join("|");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createBasicPlayerTelemetry({
  storage = globalThis.localStorage,
  now = () => Date.now(),
  randomId = fallbackId,
} = {}) {
  const stored = readInstallation(storage);
  const installation = {
    installationId:String(stored?.installationId || randomId()),
    installationEpoch:Math.max(0, Number(stored?.installationEpoch || 0)),
    appFingerprint:String(stored?.appFingerprint || ""),
    ...normalizeAppInfo(stored?.app || {}),
  };
  const sessionStartedAt = iso(now());
  const session = {
    sessionId:String(randomId()),
    startedAt:sessionStartedAt,
    lastHeartbeatAt:null,
    sequence:0,
  };
  let identity = { clientId:"", screenId:"", deviceId:"" };
  let connection = { state:globalThis.navigator?.onLine === false ? "OFFLINE" : "ONLINE", changedAt:sessionStartedAt };
  let playback = { state:"IDLE", activeType:"NONE", activeId:"", activeName:"", itemId:"", updatedAt:sessionStartedAt };

  function persistInstallation() {
    safeSetStorageItem(storage, BASIC_TELEMETRY_STORAGE_KEY, JSON.stringify({
      installationId:installation.installationId,
      installationEpoch:installation.installationEpoch,
      appFingerprint:installation.appFingerprint,
      app:normalizeAppInfo(installation),
    }));
  }

  function snapshot() {
    const publicInstallation = { ...installation };
    delete publicInstallation.appFingerprint;
    return clone({
      schemaVersion:BASIC_TELEMETRY_SCHEMA_VERSION,
      profile:BASIC_TELEMETRY_PROFILE,
      installation:publicInstallation,
      identity,
      session,
      connection,
      playback,
    });
  }

  return {
    setAppInfo(value = {}) {
      const app = normalizeAppInfo(value);
      const fingerprint = appFingerprint(app);
      if (fingerprint !== installation.appFingerprint) {
        installation.installationEpoch += 1;
        installation.appFingerprint = fingerprint;
      }
      Object.assign(installation, app);
      persistInstallation();
      return snapshot();
    },
    setIdentity(value = {}) {
      identity = {
        clientId:String(value.clientId || ""),
        screenId:String(value.screenId || ""),
        deviceId:String(value.deviceId || ""),
      };
    },
    setConnection(value) {
      const state = value === "OFFLINE" ? "OFFLINE" : "ONLINE";
      if (state !== connection.state) connection = { state, changedAt:iso(now()) };
    },
    setPlayback(value = {}) {
      const activeType = ["PLAYLIST", "TEMPLATE"].includes(value.activeType) ? value.activeType : "NONE";
      playback = {
        state:["LOADING", "PLAYING", "IDLE", "ERROR"].includes(value.state) ? value.state : "IDLE",
        activeType,
        activeId:String(value.activeId || ""),
        activeName:String(value.activeName || ""),
        itemId:String(value.itemId || ""),
        updatedAt:iso(now()),
      };
    },
    heartbeat() {
      session.sequence += 1;
      session.lastHeartbeatAt = iso(now());
      return snapshot();
    },
    snapshot,
  };
}

export function buildBasicTelemetryUpdate(snapshot) {
  return { telemetry:clone(snapshot) };
}
