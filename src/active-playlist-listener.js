export function getActivePlaylistListenerDependencies({ appBuildMode, clientId, screen }) {
  const playlistId = screen?.playlistId || "";
  const legacyScreenDependency = (appBuildMode === "playerDecoderExperiment" || appBuildMode === "playerRc") ? null : screen;
  return [clientId || "", playlistId, legacyScreenDependency];
}
