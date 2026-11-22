import { isApprovedAndroidNavigationPlayer } from "./templates-v2/player-capability.js";
export function getPlaylistNavigationCapability(screen = {}) {
  const capability = screen.capabilities;
  const supportedAndroid = capability?.platform === "ANDROID"
    && isApprovedAndroidNavigationPlayer(capability?.packageName, capability?.versionCode);
  const supported = capability?.playlistItemNavigation === true
    && (capability.platform === "WEB" || supportedAndroid)
    && Boolean(screen.connectedDeviceId)
    && capability.deviceId === screen.connectedDeviceId;
  return { supported, reason:supported ? "" : "Requer atualização do Player" };
}

export function getPlaylistNavigationCommand(direction, screen = {}) {
  if (!getPlaylistNavigationCapability(screen).supported) return null;
  if (direction === "previous") return { type:"previousMedia" };
  if (direction === "next") return { type:"nextMedia" };
  return null;
}

function isConnectedWebPlayer(screen = {}) {
  const capability = screen.capabilities;
  return capability?.platform === "WEB"
    && Boolean(screen.connectedDeviceId)
    && capability.deviceId === screen.connectedDeviceId;
}

export function getBlackoutToggleCommand(screen = {}) {
  const active = screen.lastCommandExecuted === "blackout";
  if (isConnectedWebPlayer(screen)) return { type:"blackout", enabled:!active };
  return active ? { type:"clear" } : { type:"blackout" };
}
