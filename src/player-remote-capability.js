export function getPlaylistNavigationCapability(screen = {}) {
  const supported = screen.capabilities?.playlistItemNavigation === true;
  return { supported, reason:supported ? "" : "Requer atualização do Player" };
}

export function getPlaylistNavigationCommand(direction, screen = {}) {
  if (!getPlaylistNavigationCapability(screen).supported) return null;
  if (direction === "previous") return { type:"previousMedia" };
  if (direction === "next") return { type:"nextMedia" };
  return null;
}
