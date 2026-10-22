const EDITABLE_PLAYLIST_FIELDS = [
  "name",
  "transition",
  "transitionSpeed",
  "orientation",
  "scheduleEnabled",
  "startDate",
  "endDate",
  "startTime",
  "endTime",
];

export function createPlaylistEditSnapshot(playlistId, form = {}) {
  const values = Object.fromEntries(
    EDITABLE_PLAYLIST_FIELDS.map((field) => [field, form[field] ?? ""])
  );

  return JSON.stringify({
    playlistId:String(playlistId || ""),
    ...values,
    selectedMediaIds:[...(form.selectedMediaIds || [])],
    targetScreenIds:[...(form.targetScreenIds || [])].sort(),
  });
}

export function hasPlaylistEditChanges(baseline, playlistId, form = {}) {
  if (!baseline) return false;
  return baseline !== createPlaylistEditSnapshot(playlistId, form);
}

export function isPlaylistEditSnapshotFor(baseline, playlistId) {
  if (!baseline) return false;
  try {
    return JSON.parse(baseline).playlistId === String(playlistId || "");
  } catch {
    return false;
  }
}
