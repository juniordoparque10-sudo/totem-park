export function getTemplatePlaylistUsage(playlists = [], templateId = "") {
  if (!templateId) return [];
  return playlists.filter((playlist) => (playlist.items || []).some((item) => (
    item?.templateId === templateId
    || item?.sourceTemplateId === templateId
    || (item?.playerItemType === "template" && item?.id === templateId)
  )));
}

export function isPlaylistTemplateReference(item = {}, templateId = "") {
  return Boolean(templateId) && (
    item?.templateId === templateId
    || item?.sourceTemplateId === templateId
    || (item?.playerItemType === "template" && item?.id === templateId)
  );
}

export function removeTemplateReferences(items = [], templateId = "") {
  return (Array.isArray(items) ? items : []).filter((item) => !isPlaylistTemplateReference(item, templateId));
}
