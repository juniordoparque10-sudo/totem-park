export function shouldShowPlayerEmptyState({
  loading = true,
  clientLoading = true,
  playlistResolved = false,
  templatesResolved = false,
  activePlaylist = null,
  screenTemplates = [],
} = {}) {
  if (loading || clientLoading || !playlistResolved || !templatesResolved) return false;
  return (!Array.isArray(activePlaylist?.items) || activePlaylist.items.length === 0)
    && screenTemplates.length === 0;
}
