function formatCivilDateBr(value = "") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || "—");
}

export function formatScheduledPlaylistSummary(playlist = {}) {
  const startDate = formatCivilDateBr(playlist.startDate);
  const endDate = formatCivilDateBr(playlist.endDate);
  const count = Array.isArray(playlist.targetScreenIds) ? playlist.targetScreenIds.length : 0;
  const screens = `${count} ${count === 1 ? "tela" : "telas"}`;
  const period = playlist.startDate === playlist.endDate
    ? `${startDate}, das ${playlist.startTime} às ${playlist.endTime}`
    : `De ${startDate} a ${endDate}, das ${playlist.startTime} às ${playlist.endTime}`;
  return `${period} • ${screens}`;
}
