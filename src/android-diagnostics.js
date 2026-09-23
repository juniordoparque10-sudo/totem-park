const APP_MODE = import.meta.env.VITE_APP_MODE;
const LAB_MODE = APP_MODE === "playerLab";
const CANARY_MODE = APP_MODE === "playerCanary";
const RC_MODE = APP_MODE === "playerRc";
const PHASE_B_MODE = APP_MODE === "playerPhaseB";
const TELEMETRY_MODE = APP_MODE === "playerTelemetry";
const JUMP_MODE = ["playerJumpDiag", "playerDecoderExperiment"].includes(APP_MODE);
const DECODER_EXPERIMENT_MODE = APP_MODE === "playerDecoderExperiment";
const DIAGNOSTIC_MODE = LAB_MODE || CANARY_MODE || RC_MODE || PHASE_B_MODE || TELEMETRY_MODE || JUMP_MODE;
const STORAGE_KEY = PHASE_B_MODE
  ? "totempark-player-diagnostics-2a2-b"
  : TELEMETRY_MODE
  ? "totempark-player-diagnostics-2a2-c"
  : DECODER_EXPERIMENT_MODE
  ? "totempark-player-decoder-experiment-diagnostics"
  : JUMP_MODE
  ? "totempark-player-jump-diagnostics"
  : RC_MODE
  ? "totempark-player-rc-diagnostics-2a2-a"
  : CANARY_MODE
    ? "totempark-player-canary-diagnostics-2a2-a"
    : "totempark-player-lab-diagnostics-2a2-a";
const APP_VERSION = PHASE_B_MODE
  ? "1.0-player-2a2-b-audit2"
  : TELEMETRY_MODE
  ? "1.0-player-2a2-c-telemetry-pilot"
  : DECODER_EXPERIMENT_MODE
  ? "1.0-player-decoder-experiment"
  : JUMP_MODE
  ? "1.0-player-jump-diagnostic"
  : RC_MODE
  ? "1.0.0-2a2-rebaseline-rc5"
  : CANARY_MODE
    ? "1.0-player-canary-2a2-a"
    : "1.0-player-lab-2a2-a";
const MAX_EVENTS = 1000;
const MAX_STORAGE_BYTES = 1024 * 1024;
const activeDownloads = new Map();
const resolvedMedia = new Set();
const assignedSources = new Set();
const currentSources = new Map();

function nowIso() { return new Date().toISOString(); }
function id() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function deviceFromUserAgent() {
  const userAgent = navigator.userAgent || "";
  const android = userAgent.match(/Android\s+([^;)]+)/i)?.[1]?.trim() || "UNKNOWN";
  const model = userAgent.match(/Android[^;)]*;\s*([^;)]+?)(?:\s+Build\/[^;)]*)?[;)]/i)?.[1]?.trim() || "UNKNOWN";
  return { model, android, userAgent };
}
function blank() {
  return {
    schemaVersion: 2,
    session: { id: id(), startedAt: nowIso(), endedAt: null, appVersion: APP_VERSION, device: deviceFromUserAgent() },
    totals: { fileTransferStarts: 0, fileTransferCompleted: 0, fileTransferFailed: 0, fileTransferTimeouts: 0, bytesDownloaded: 0, cacheHits: 0, cacheMisses: 0, localPlaybackCount: 0, remotePlaybackCount: 0 },
    media: {}, events: [],
  };
}
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || blank(); } catch { return blank(); } }
function maskUrl(value = "") { try { const u = new URL(value); u.search = u.search ? "?redacted" : ""; u.hash = ""; return u.toString(); } catch { return String(value); } }
function sanitize(data = {}) {
  return {
    ...data,
    remoteUrl: maskUrl(data.remoteUrl),
    src: /^https?:\/\//i.test(data.src || "") ? maskUrl(data.src) : data.src,
  };
}
function mediaKey(data = {}) { return String(data.remoteUrl || data.mediaId || data.fileName || "unknown"); }
function save(report) {
  while (report.events.length > MAX_EVENTS) report.events.shift();
  let json = JSON.stringify(report);
  while (json.length > MAX_STORAGE_BYTES && report.events.length > 1) { report.events.shift(); json = JSON.stringify(report); }
  localStorage.setItem(STORAGE_KEY, json);
  window.dispatchEvent(new CustomEvent("totempark-lab-diagnostic"));
}
function emitOperationalEvent(type, data = {}) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("totempark-operational-event", { detail: { type, ...sanitize(data) } }));
}
function ensureMedia(report, data) {
  const key = mediaKey(data);
  report.media[key] ||= { mediaId: data.mediaId || "", mediaName: data.mediaName || "", remoteUrl: maskUrl(data.remoteUrl), localPath: data.localPath || "", fileName: data.fileName || "", sizeBytes: Number(data.sizeBytes || 0), playlistId: data.playlistId || "", screenId: data.screenId || "", fileTransferStarts: 0, fileTransferCompleted: 0, retries: 0, cacheHits: 0, cacheMisses: 0, localPlaybackCount: 0, remotePlaybackCount: 0, finalFileSizeBytes: 0, firstDownloadAt: null, lastDownloadAt: null, lastPlaybackAt: null, currentSource: "UNKNOWN", lastError: "" };
  const media = report.media[key];
  media.mediaId ||= data.mediaId || "";
  media.mediaName ||= data.mediaName || "";
  media.fileName ||= data.fileName || "";
  media.sizeBytes ||= Number(data.sizeBytes || 0);
  media.playlistId ||= data.playlistId || "";
  media.screenId ||= data.screenId || "";
  media.localPath = data.localPath || media.localPath || "";
  return media;
}
export function labEnabled() { return DIAGNOSTIC_MODE; }
export function recordLabEvent(type, data = {}) {
  if (!DIAGNOSTIC_MODE) return;
  const report = load(); const clean = sanitize(data);
  report.events.push({ id: id(), type, at: nowIso(), ...clean }); ensureMedia(report, clean); save(report); emitOperationalEvent(type, clean);
}
export function recordMediaResolve(data = {}) {
  if (!LAB_MODE && !PHASE_B_MODE) return;
  const key = mediaKey(data); if (resolvedMedia.has(key)) return; resolvedMedia.add(key);
  recordLabEvent("MEDIA_RESOLVE_START", data);
}
export function recordCacheResult(hit, data = {}) {
  if (!DIAGNOSTIC_MODE) return;
  const report = load(), media = ensureMedia(report, data), field = hit ? "cacheHits" : "cacheMisses";
  report.totals[field] += 1; media[field] += 1; report.events.push({ id: id(), type: hit ? "LOCAL_FILE_FOUND" : "LOCAL_FILE_NOT_FOUND", at: nowIso(), ...sanitize(data) }); save(report); emitOperationalEvent(hit ? "CACHE_HIT" : "CACHE_MISS", data);
}
export function startFileTransfer(data = {}) {
  if (!DIAGNOSTIC_MODE) return "";
  const downloadId = id(), key = mediaKey(data), count = (activeDownloads.get(key) || 0) + 1; activeDownloads.set(key, count);
  const report = load(), media = ensureMedia(report, data); report.totals.fileTransferStarts += 1; media.fileTransferStarts += 1; media.retries = Math.max(0, media.fileTransferStarts - 1);
  media.firstDownloadAt ||= nowIso();
  report.events.push({ id: id(), type: "FILETRANSFER_START", at: nowIso(), downloadId, attempt: media.fileTransferStarts, activeDownloadCount: count, ...sanitize(data) });
  if (currentSources.get(key) === "REMOTE") report.events.push({ id: id(), type: "POSSIBLE_PARALLEL_REMOTE_PLAYBACK", at: nowIso(), downloadId, mediaId: data.mediaId || "", remoteUrl: maskUrl(data.remoteUrl), remotePlaybackBytes: "UNKNOWN" });
  if (count > 1) report.events.push({ id: id(), type: "DUPLICATE_FILETRANSFER", at: nowIso(), downloadId, activeDownloadCount: count, mediaId: data.mediaId || "", remoteUrl: maskUrl(data.remoteUrl) });
  save(report); emitOperationalEvent("DOWNLOAD_START", { ...data, downloadId, attempt: media.fileTransferStarts }); return downloadId;
}
export function finishFileTransfer(downloadId, status, data = {}) {
  if (!DIAGNOSTIC_MODE) return;
  const key = mediaKey(data), count = Math.max(0, (activeDownloads.get(key) || 1) - 1); count ? activeDownloads.set(key, count) : activeDownloads.delete(key);
  const report = load(), media = ensureMedia(report, data), bytes = Number(data.finalFileSizeBytes || 0);
  if (status === "complete") { report.totals.fileTransferCompleted += 1; report.totals.bytesDownloaded += bytes; media.fileTransferCompleted += 1; media.finalFileSizeBytes = bytes; media.lastDownloadAt = nowIso(); }
  else { report.totals.fileTransferFailed += 1; media.lastError = data.message || status; if (status === "timeout") report.totals.fileTransferTimeouts += 1; }
  report.events.push({ id: id(), type: status === "complete" ? "FILETRANSFER_COMPLETE" : status === "timeout" ? "FILETRANSFER_TIMEOUT" : "FILETRANSFER_FAILED", at: nowIso(), downloadId, status, ...sanitize(data) }); save(report); emitOperationalEvent(status === "complete" ? "DOWNLOAD_COMPLETE" : status === "timeout" ? "DOWNLOAD_TIMEOUT" : "DOWNLOAD_FAILED", { ...data, downloadId, status });
}
export function recordSourceAssigned(source, data = {}) {
  if (!DIAGNOSTIC_MODE) return;
  const assignmentKey = `${mediaKey(data)}|${source}|${data.src || ""}`;
  if (assignedSources.has(assignmentKey)) return;
  assignedSources.add(assignmentKey);
  const report = load(), media = ensureMedia(report, data); media.currentSource = source;
  currentSources.set(mediaKey(data), source);
  report.events.push({ id: id(), type: source === "LOCAL" ? "LOCAL_SRC_ASSIGNED" : "REMOTE_SRC_ASSIGNED", at: nowIso(), ...sanitize(data), remotePlaybackBytes: source === "REMOTE" ? "UNKNOWN" : undefined }); save(report);
  if (source === "REMOTE" && (activeDownloads.get(mediaKey(data)) || 0) > 0) recordLabEvent("POSSIBLE_PARALLEL_REMOTE_PLAYBACK", { ...data, activeDownloadCount: activeDownloads.get(mediaKey(data)), remotePlaybackBytes: "UNKNOWN" });
}
export function recordPlayback(type, source, data = {}) {
  if (!DIAGNOSTIC_MODE) return;
  if ((CANARY_MODE || RC_MODE) && type === "PLAYBACK_END") return;
  const report = load(), media = ensureMedia(report, data);
  if (type === "PLAYBACK_START") { const field = source === "LOCAL" ? "localPlaybackCount" : "remotePlaybackCount"; report.totals[field] += 1; media[field] += 1; media.lastPlaybackAt = nowIso(); }
  if (type === "PLAYBACK_ERROR") media.lastError = data.message || "playback error";
  report.events.push({ id: id(), type, at: nowIso(), source, ...sanitize(data) }); save(report);
}
export function getLabReport() { return DIAGNOSTIC_MODE ? load() : null; }
export async function shareLastDecoderDiagnostic() {
  if (!DECODER_EXPERIMENT_MODE) throw new Error("Compartilhamento experimental indisponível neste build");
  return PublicDiagnosticExport.shareLast();
}
export async function exportLabReport() {
  if (!DIAGNOSTIC_MODE) return;
  if (DECODER_EXPERIMENT_MODE) {
    try {
      const report = load();
      const nonce = globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(16).slice(2, 10);
      const exportFile = makeDecoderDiagnosticExport(report, getJumpEvents(), new Date(), nonce);
      const result = await PublicDiagnosticExport.save({ fileName: exportFile.fileName, data: exportFile.data });
      if (result.fileName !== exportFile.fileName || result.packageName !== DECODER_EXPERIMENT_PACKAGE || Number(result.sizeBytes) <= 0) {
        throw new Error("Confirmação do arquivo público não corresponde à exportação atual");
      }
      recordLabEvent("DIAGNOSTIC_EXPORTED", { localPath: result.uri, fileName: result.fileName, sizeBytes: result.sizeBytes });
      return { ...result, sessionId: report.session.id, appVersion: APP_VERSION };
    } catch (error) {
      recordLabEvent("DIAGNOSTIC_EXPORT_FAILED", { message: error?.message || "Falha ao exportar" });
      throw error;
    }
  }
  const data = JSON.stringify({ diagnostic: load(), jumpEvents: getJumpEvents(), operationalTelemetry: JUMP_MODE ? null : readPlayerTelemetryReport() }, null, 2);
  try {
    const fileName = JUMP_MODE ? "totempark-jump-diagnostic.json" : PHASE_B_MODE ? "totempark-android-2a2-b-diagnostic.json" : RC_MODE ? "totempark-android-rc-diagnostic.json" : CANARY_MODE ? "totempark-android-canary-diagnostic.json" : "totempark-android-diagnostic.json";
    let result;
    try {
      result = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
    } catch (error) {
      if (!JUMP_MODE) throw error;
      result = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Data, encoding: Encoding.UTF8, recursive: true });
    }
    recordLabEvent("DIAGNOSTIC_EXPORTED", { localPath: result.uri });
    return result.uri;
  } catch (error) {
    recordLabEvent("DIAGNOSTIC_EXPORT_FAILED", { message: error?.message || "Falha ao exportar" });
    throw error;
  }
}
if (DIAGNOSTIC_MODE && typeof window !== "undefined") {
  const prior = load(); prior.session = { ...prior.session, id: id(), startedAt: nowIso(), endedAt: null, appVersion: APP_VERSION, device: deviceFromUserAgent() }; prior.events.push({ id: id(), type: prior.events.length ? "APP_RESTART" : "SESSION_START", at: nowIso() }); save(prior);
  if (LAB_MODE) {
    window.addEventListener("online", () => recordLabEvent("NETWORK_ONLINE")); window.addEventListener("offline", () => recordLabEvent("NETWORK_OFFLINE"));
  }
}
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { readPlayerTelemetryReport } from "./player-telemetry";
import { getJumpEvents } from "./jump-diagnostics";
import { registerPlugin } from "@capacitor/core";
import { DECODER_EXPERIMENT_PACKAGE, makeDecoderDiagnosticExport } from "./diagnostic-export";

const PublicDiagnosticExport = DECODER_EXPERIMENT_MODE ? registerPlugin("DiagnosticExport") : null;
