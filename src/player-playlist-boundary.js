export function selectFallbackTemplates(activePlaylistItems, screenTemplates, strictPlaylist = false) {
  if (strictPlaylist || (activePlaylistItems || []).length > 0) return [];
  return Array.isArray(screenTemplates) ? screenTemplates : [];
}
