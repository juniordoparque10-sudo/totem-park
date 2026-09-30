export function getTemplatePlaylistUsage(playlists = [], templateId = "") {
  if (!templateId) return [];
  return playlists.filter((playlist) => (playlist.items || []).some((item) => (
    item?.templateId === templateId
    || item?.sourceTemplateId === templateId
    || (item?.playerItemType === "template" && item?.id === templateId)
  )));
}
