const DEFAULT_SCHEDULE_TIME_ZONE = "America/Sao_Paulo";
const zonedFormatterCache = new Map();

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  return match ? { year:Number(match[1]), month:Number(match[2]), day:Number(match[3]) } : null;
}

function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || ""));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  return hours <= 23 && minutes <= 59 && seconds <= 59 ? { hours, minutes, seconds } : null;
}

function getScheduleTimeZone(playlist) {
  const requested = String(playlist?.scheduleTimezone || DEFAULT_SCHEDULE_TIME_ZONE).trim();
  try {
    getZonedFormatter(requested);
    return requested;
  } catch {
    return DEFAULT_SCHEDULE_TIME_ZONE;
  }
}

function getZonedFormatter(timeZone) {
  if (!zonedFormatterCache.has(timeZone)) {
    zonedFormatterCache.set(timeZone, new Intl.DateTimeFormat("en-US", {
      timeZone,
      calendar:"gregory",
      numberingSystem:"latn",
      hourCycle:"h23",
      year:"numeric",
      month:"2-digit",
      day:"2-digit",
      hour:"2-digit",
      minute:"2-digit",
      second:"2-digit",
    }));
  }
  return zonedFormatterCache.get(timeZone);
}

function getZonedParts(date, timeZone) {
  const values = Object.fromEntries(getZonedFormatter(timeZone).formatToParts(date)
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, Number(part.value)]));
  return {
    year:values.year,
    month:values.month,
    day:values.day,
    hours:values.hour,
    minutes:values.minute,
    seconds:values.second,
  };
}

function shiftCivilDate(date, days) {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year:shifted.getUTCFullYear(), month:shifted.getUTCMonth() + 1, day:shifted.getUTCDate() };
}

const civilDateValue = (date) => Date.UTC(date.year, date.month - 1, date.day);
const civilTimeValue = (time) => time.hours * 3600 + time.minutes * 60 + time.seconds;

function atTime(day, time, timeZone) {
  const desired = Date.UTC(day.year, day.month - 1, day.day, time.hours, time.minutes, time.seconds);
  let instant = desired;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const observed = getZonedParts(new Date(instant), timeZone);
    const correction = desired - Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hours,
      observed.minutes,
      observed.seconds
    );
    if (correction === 0) break;
    instant += correction;
  }
  const result = new Date(instant);
  const observed = getZonedParts(result, timeZone);
  return observed.year === day.year
    && observed.month === day.month
    && observed.day === day.day
    && observed.hours === time.hours
    && observed.minutes === time.minutes
    && observed.seconds === time.seconds
    ? result
    : null;
}

function playlistWindowForDay(playlist, day, timeZone) {
  const startTime = parseTime(playlist?.startTime);
  const endTime = parseTime(playlist?.endTime);
  if (!startTime || !endTime) return null;
  const firstDay = parseDate(playlist.startDate) || day;
  const lastDay = parseDate(playlist.endDate) || firstDay;
  if (civilDateValue(day) < civilDateValue(firstDay) || civilDateValue(day) > civilDateValue(lastDay)) return null;
  const crossesMidnight = civilTimeValue(endTime) <= civilTimeValue(startTime);
  const endDay = crossesMidnight ? shiftCivilDate(day, 1) : day;
  const finalDay = shiftCivilDate(lastDay, 1);
  if (civilDateValue(endDay) > civilDateValue(finalDay)) return null;
  if (civilDateValue(endDay) === civilDateValue(finalDay) && civilTimeValue(endTime) > 0) return null;
  const start = atTime(day, startTime, timeZone);
  if (!start) return null;
  const end = atTime(endDay, endTime, timeZone);
  if (!end) return null;
  return { start, end };
}

export function getPlaylistScheduleWindow(playlist, now, screenId) {
  if (!playlist?.scheduleEnabled) return null;
  if (playlist.targetScreenIds?.length && (!screenId || !playlist.targetScreenIds.includes(screenId))) return null;
  const timeZone = getScheduleTimeZone(playlist);
  const zonedNow = getZonedParts(now, timeZone);
  const today = { year:zonedNow.year, month:zonedNow.month, day:zonedNow.day };
  return [today, shiftCivilDate(today, -1)]
    .map((day) => playlistWindowForDay(playlist, day, timeZone))
    .find((window) => window && now >= window.start && now < window.end) || null;
}

export function selectActiveScheduledPlaylist(playlists, now = new Date(), screenId = "") {
  return (playlists || [])
    .map((playlist) => ({ playlist, window:getPlaylistScheduleWindow(playlist, now, screenId) }))
    .filter(({ window }) => Boolean(window))
    .sort((a, b) => b.window.start - a.window.start)[0]?.playlist || null;
}

export function resolveScheduledPlayback({ playlists, defaultPlaylist, now = new Date(), screenId = "" } = {}) {
  const scheduledPlaylist = selectActiveScheduledPlaylist(playlists, now, screenId);
  const playlist = scheduledPlaylist || defaultPlaylist || null;
  return {
    playlist,
    mode:scheduledPlaylist ? "scheduled" : "default",
    items:Array.isArray(playlist?.items) ? playlist.items : [],
  };
}

export function getNextScheduleBoundaryDelay(playlists, now = new Date(), screenId = "") {
  const boundaries = [];
  for (const playlist of playlists || []) {
    if (!playlist?.scheduleEnabled) continue;
    if (playlist.targetScreenIds?.length && (!screenId || !playlist.targetScreenIds.includes(screenId))) continue;
    const timeZone = getScheduleTimeZone(playlist);
    const zonedNow = getZonedParts(now, timeZone);
    const today = { year:zonedNow.year, month:zonedNow.month, day:zonedNow.day };
    for (let offset = -1; offset <= 370; offset += 1) {
      const window = playlistWindowForDay(playlist, shiftCivilDate(today, offset), timeZone);
      if (!window) continue;
      if (window.start > now) boundaries.push(window.start.getTime());
      if (window.end > now) boundaries.push(window.end.getTime());
    }
  }
  return boundaries.length ? Math.max(0, Math.min(...boundaries) - now.getTime()) : null;
}

export function startScheduleRuntime({
  playlists,
  screenId = "",
  onTick,
  nowFn = () => new Date(),
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
  setIntervalFn = globalThis.setInterval,
  clearIntervalFn = globalThis.clearInterval,
  fallbackIntervalMs = 1000,
} = {}) {
  const initialNow = nowFn();
  const boundaryDelay = getNextScheduleBoundaryDelay(playlists, initialNow, screenId);
  let effectiveScheduleId = selectActiveScheduledPlaylist(playlists, initialNow, screenId)?.id || "";
  const evaluate = () => {
    const tickNow = nowFn();
    const nextScheduleId = selectActiveScheduledPlaylist(playlists, tickNow, screenId)?.id || "";
    if (nextScheduleId === effectiveScheduleId) return;
    effectiveScheduleId = nextScheduleId;
    onTick?.(tickNow);
  };
  const boundaryTimer = boundaryDelay === null
    ? null
    : setTimeoutFn(evaluate, boundaryDelay + 5);
  const fallbackTimer = setIntervalFn(evaluate, fallbackIntervalMs);

  return () => {
    if (boundaryTimer !== null) clearTimeoutFn(boundaryTimer);
    clearIntervalFn(fallbackTimer);
  };
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
  const timezone = playlist?.scheduleTimezone ? [`timezone:${getScheduleTimeZone(playlist)}`] : [];
  return [playlist?.scheduleEnabled, playlist?.name, playlist?.startDate, playlist?.endDate, playlist?.startTime, playlist?.endTime, ...timezone, ...(playlist?.targetScreenIds || [])].join("|");
}

export function buildScheduleSnapshot(playlists, screenId, previousSnapshot, { bootstrapping = false } = {}) {
  const applicable = (playlists || []).filter((playlist) => playlist?.scheduleEnabled
    && (!playlist.targetScreenIds?.length || playlist.targetScreenIds.includes(screenId)));
  const snapshot = Object.fromEntries(applicable.map((playlist) => [playlist.id, getScheduleFingerprint(playlist)]));
  if (bootstrapping || !previousSnapshot) return { snapshot, notice:null };
  const created = applicable.find((playlist) => !Object.hasOwn(previousSnapshot, playlist.id));
  if (created) return { snapshot, notice:{ type:"created", playlist:created } };
  const updated = applicable.find((playlist) => previousSnapshot[playlist.id] !== snapshot[playlist.id]);
  return { snapshot, notice:updated ? { type:"updated", playlist:updated } : null };
}

export function getScheduleOccurrenceKey(playlist, now = new Date(), screenId = "") {
  const window = getPlaylistScheduleWindow(playlist, now, screenId);
  if (!window) return "";
  const start = getZonedParts(window.start, getScheduleTimeZone(playlist));
  const localTimestamp = [
    start.year,
    String(start.month).padStart(2, "0"),
    String(start.day).padStart(2, "0"),
  ].join("-") + `T${String(start.hours).padStart(2, "0")}:${String(start.minutes).padStart(2, "0")}:${String(start.seconds).padStart(2, "0")}.000`;
  const timezoneSuffix = playlist?.scheduleTimezone ? `|${getScheduleTimeZone(playlist)}` : "";
  return `${playlist?.id || ""}|${localTimestamp}${timezoneSuffix}`;
}

export function consumeScheduleNotice(seenKeys, eventKey, limit = 64) {
  const current = Array.isArray(seenKeys) ? seenKeys.filter(Boolean) : [];
  if (!eventKey || current.includes(eventKey)) return { shouldShow:false, seenKeys:current };
  return { shouldShow:true, seenKeys:[...current, eventKey].slice(-limit) };
}
