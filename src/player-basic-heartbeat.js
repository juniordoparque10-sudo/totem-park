import { buildBasicTelemetryUpdate } from "./basic-player-telemetry.js";

export function buildBasicScreenHeartbeatUpdate({ presence = {}, snapshot, telemetryUpdatedAt } = {}) {
  return {
    ...presence,
    ...buildBasicTelemetryUpdate(snapshot),
    telemetryUpdatedAt,
  };
}

export function getPlayerTelemetryProfile(appBuildMode = "") {
  return appBuildMode === "playerRc" ? "BASIC" : "ADVANCED";
}

export function shouldCollectAdvancedTelemetry(appBuildMode = "") {
  return getPlayerTelemetryProfile(appBuildMode) === "ADVANCED";
}

export function buildBasicPlaybackState({ operational = {}, activePlaylist = null, activeTemplate = null } = {}) {
  const templateActive = Boolean(activeTemplate?.id);
  const playlistActive = !templateActive && Boolean(activePlaylist?.id);
  const state = String(operational.playerState || "idle").toUpperCase();
  return {
    state:["LOADING", "PLAYING", "IDLE", "ERROR"].includes(state) ? state : "IDLE",
    activeType:templateActive ? "TEMPLATE" : playlistActive ? "PLAYLIST" : "NONE",
    activeId:String(templateActive ? activeTemplate.id : playlistActive ? activePlaylist.id : ""),
    activeName:String(templateActive ? activeTemplate.name || activeTemplate.title || "" : playlistActive ? activePlaylist.name || activePlaylist.title || "" : ""),
    itemId:String(operational.currentItemId || ""),
  };
}

export function createDisabledActivityTelemetry() {
  return {
    updateIdentity:() => false,
    setConnection:() => false,
    startPlayback:() => false,
    finishPlayback:() => false,
    interrupt:() => false,
    recover:() => false,
    drainBatch:() => [],
    acknowledge:() => false,
    getState:() => ({ identity:{}, connectionStatus:"ONLINE", playback:{ status:"IDLE" }, events:[] }),
  };
}

export function createDisabledTrafficTelemetry() {
  return {
    recordNetworkStats:() => false,
    recordDownloadComplete:() => false,
    observePlaybackStart:() => null,
    recordLocalPlaybackComplete:() => false,
    closeOccurrence:() => null,
    snapshot:() => null,
    dailySnapshot:() => ({}),
  };
}

export function createDisabledTelemetryHistory() {
  return {
    updateIdentity:() => false,
    confirmSessionEnd:() => false,
    recordEvents:() => false,
    checkpoint:() => false,
    pending:() => ({ days:[], sessions:[], events:[] }),
  };
}
