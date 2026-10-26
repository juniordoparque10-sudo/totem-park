const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || ""));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  return hours <= 23 && minutes <= 59 && seconds <= 59 ? { hours, minutes, seconds } : null;
}

const dayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const atTime = (day, time) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.hours, time.minutes, time.seconds, 0);

function playlistWindowForDay(playlist, day) {
  const startTime = parseTime(playlist?.startTime);
  const endTime = parseTime(playlist?.endTime);
  if (!startTime || !endTime) return null;
  const firstDay = parseDate(playlist.startDate) || day;
  const lastDay = parseDate(playlist.endDate) || firstDay;
  const candidateDay = dayStart(day);
  if (candidateDay < dayStart(firstDay) || candidateDay > dayStart(lastDay)) return null;
  const start = atTime(candidateDay, startTime);
  const end = atTime(candidateDay, endTime);
  if (end <= start) end.setDate(end.getDate() + 1);
  if (end > new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1)) return null;
  return { start, end };
}

export function getPlaylistScheduleWindow(playlist, now, screenId) {
  if (!playlist?.scheduleEnabled) return null;
  if (playlist.targetScreenIds?.length && (!screenId || !playlist.targetScreenIds.includes(screenId))) return null;
  const today = dayStart(now);
  return [today, new Date(today.getTime() - DAY_MS)]
    .map((day) => playlistWindowForDay(playlist, day))
    .find((window) => window && now >= window.start && now < window.end) || null;
}

export function selectActiveScheduledPlaylist(playlists, now = new Date(), screenId = "") {
  return (playlists || [])
    .map((playlist) => ({ playlist, window:getPlaylistScheduleWindow(playlist, now, screenId) }))
    .filter(({ window }) => Boolean(window))
    .sort((a, b) => b.window.start - a.window.start)[0]?.playlist || null;
}

export function getNextScheduleBoundaryDelay(playlists, now = new Date(), screenId = "") {
  const boundaries = [];
  const today = dayStart(now);
  for (const playlist of playlists || []) {
    if (!playlist?.scheduleEnabled) continue;
    if (playlist.targetScreenIds?.length && (!screenId || !playlist.targetScreenIds.includes(screenId))) continue;
    for (let offset = -1; offset <= 370; offset += 1) {
      const window = playlistWindowForDay(playlist, new Date(today.getTime() + offset * DAY_MS));
      if (!window) continue;
      if (window.start > now) boundaries.push(window.start.getTime());
      if (window.end > now) boundaries.push(window.end.getTime());
    }
  }
  return boundaries.length ? Math.max(0, Math.min(...boundaries) - now.getTime()) : null;
}

export function getScheduleEndingDelay(playlist, now = new Date(), screenId = "", leadMs = 3000) {
  const window = getPlaylistScheduleWindow(playlist, now, screenId);
  if (!window) return null;
  const delay = window.end.getTime() - leadMs - now.getTime();
  return delay >= 0 ? delay : null;
}

export function getScheduleTransition({ previous, current, changed, endingSoon = false, bootstrapping = false } = {}) {
  if (changed) return { type:"scheduled", message:`✓ Playlist programada: ${changed.name}`, durationMs:3500 };
  if (endingSoon && current) return { type:"ending", message:`Programação encerrando: ${current.name}`, durationMs:2500 };
  if (!bootstrapping && !previous && current) return { type:"started", message:`✓ Programação ativa: ${current.name}`, durationMs:4000 };
  return null;
}

export function getScheduleNotice(type, playlist) {
  const name = String(playlist?.name || "Programação").trim() || "Programação";
  const notices = {
    created:{ type:"created", title:"Programação agendada criada", description:`Playlist "${name}" adicionada com sucesso.`, durationMs:3500 },
    active:{ type:"active", title:"Programação ativa", description:`Iniciando playlist agendada: "${name}".`, durationMs:4000 },
    ended:{ type:"ended", title:"Programação encerrada", description:"Retornando à programação normal.", durationMs:2500 },
    updated:{ type:"updated", title:"Programação agendada atualizada", description:"Alterações aplicadas com sucesso.", durationMs:3500 },
  };
  return notices[type] || null;
}

export function getScheduleFingerprint(playlist) {
  return [playlist?.scheduleEnabled, playlist?.name, playlist?.startDate, playlist?.endDate, playlist?.startTime, playlist?.endTime, ...(playlist?.targetScreenIds || [])].join("|");
}

export function buildScheduleSnapshot(playlists, screenId, previousSnapshot) {
  const applicable = (playlists || []).filter((playlist) => playlist?.scheduleEnabled
    && (!playlist.targetScreenIds?.length || playlist.targetScreenIds.includes(screenId)));
  const snapshot = Object.fromEntries(applicable.map((playlist) => [playlist.id, getScheduleFingerprint(playlist)]));
  if (!previousSnapshot) return { snapshot, notice:null };
  const created = applicable.find((playlist) => !Object.hasOwn(previousSnapshot, playlist.id));
  if (created) return { snapshot, notice:{ type:"created", playlist:created } };
  const updated = applicable.find((playlist) => previousSnapshot[playlist.id] !== snapshot[playlist.id]);
  return { snapshot, notice:updated ? { type:"updated", playlist:updated } : null };
}

export function getScheduleOccurrenceKey(playlist, now = new Date(), screenId = "") {
  const window = getPlaylistScheduleWindow(playlist, now, screenId);
  if (!window) return "";
  const localTimestamp = [
    window.start.getFullYear(),
    String(window.start.getMonth() + 1).padStart(2, "0"),
    String(window.start.getDate()).padStart(2, "0"),
  ].join("-") + `T${String(window.start.getHours()).padStart(2, "0")}:${String(window.start.getMinutes()).padStart(2, "0")}:${String(window.start.getSeconds()).padStart(2, "0")}.000`;
  return `${playlist?.id || ""}|${localTimestamp}`;
}

export function consumeScheduleNotice(seenKeys, eventKey, limit = 64) {
  const current = Array.isArray(seenKeys) ? seenKeys.filter(Boolean) : [];
  if (!eventKey || current.includes(eventKey)) return { shouldShow:false, seenKeys:current };
  return { shouldShow:true, seenKeys:[...current, eventKey].slice(-limit) };
}
