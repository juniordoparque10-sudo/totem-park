const ACTIVITY_STATES = new Set(["ACTIVE", "ONLINE", "OFFLINE", "ATTENTION", "IDLE", "INTERRUPTED", "RECOVERED"]);
const ACTIVE_STATES = new Set(["ACTIVE", "RECOVERED"]);
const OFFLINE_STATES = new Set(["OFFLINE", "INTERRUPTED"]);
const ATTENTION_STATES = new Set(["ATTENTION", "IDLE"]);

function timestampToMs(value) {
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (value && Number.isFinite(value.seconds)) return (value.seconds * 1000) + Math.floor(Number(value.nanoseconds || 0) / 1e6);
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value);
  if (value instanceof Date) return value.getTime();
  return Number.NaN;
}

function validRange(range = {}) {
  const startMs = Number(range.startMs);
  const endMs = Number(range.endMs);
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
    ? { startMs, endMs }
    : { startMs: Number.NEGATIVE_INFINITY, endMs: Number.POSITIVE_INFINITY };
}

export function normalizeTelemetryActivityEvents(screen = {}, range = {}) {
  const rawEvents = screen?.telemetry?.activity?.events;
  if (!Array.isArray(rawEvents)) return [];
  const screenId = String(screen.id || screen.screenId || "");
  if (!screenId) return [];
  const { startMs, endMs } = validRange(range);

  return rawEvents.flatMap((event, index) => {
    const eventScreenId = String(event?.screenId || "");
    const state = String(event?.state || "").toUpperCase();
    const atMs = timestampToMs(event?.atMs ?? event?.at ?? event?.timestamp ?? event?.occurredAt);
    if (eventScreenId !== screenId || !ACTIVITY_STATES.has(state) || !Number.isFinite(atMs) || atMs < startMs || atMs > endMs) return [];
    return [Object.freeze({
      id: String(event.id || `${screenId}-${atMs}-${index}`),
      screenId,
      state,
      atMs,
      description: typeof event.description === "string" ? event.description : "",
      domain: event.domain === "connection" ? "connection" : "playback",
    })];
  }).sort((left, right) => left.atMs - right.atMs || left.id.localeCompare(right.id)).slice(0, 500);
}

export function buildTelemetryActivityPeriods(events = [], range = {}) {
  const { startMs, endMs } = validRange(range);
  const ordered = [...events]
    .filter((event) => Number.isFinite(event?.atMs) && event.atMs >= startMs && event.atMs <= endMs)
    .sort((left, right) => left.atMs - right.atMs || String(left.id).localeCompare(String(right.id)));
  const periods = [];
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = ordered[index];
    const next = ordered.slice(index + 1).find((candidate) => candidate.screenId === current.screenId && (candidate.domain || "playback") === (current.domain || "playback"));
    if (!next) continue;
    if (!current.screenId || current.screenId !== next.screenId || next.atMs <= current.atMs || !ACTIVITY_STATES.has(current.state)) continue;
    periods.push(Object.freeze({
      id: `${current.id}:${next.id}`,
      screenId: current.screenId,
      state: current.state,
      startMs: current.atMs,
      endMs: next.atMs,
      durationMs: next.atMs - current.atMs,
      description: current.description || "",
      domain: current.domain || "playback",
    }));
  }
  return periods.sort((left, right) => left.startMs - right.startMs || left.id.localeCompare(right.id));
}

export function summarizeTelemetryActivity(periods = []) {
  const summary = {
    totalActiveMs: 0,
    totalOfflineMs: 0,
    totalAttentionMs: 0,
    totalKnownMs: 0,
    totalOnlineMs: 0,
    totalInterruptedMs: 0,
    activePeriods: 0,
    offlinePeriods: 0,
    attentionPeriods: 0,
    onlinePeriods: 0,
    interruptedPeriods: 0,
    firstActivationAtMs: null,
    lastDeactivationAtMs: null,
  };
  for (const period of periods) {
    const durationMs = Number(period?.durationMs);
    if (!Number.isFinite(durationMs) || durationMs < 0) continue;
    summary.totalKnownMs += durationMs;
    if (period.domain === "connection" && period.state === "ONLINE") {
      summary.totalOnlineMs += durationMs;
      summary.onlinePeriods += 1;
    } else if (period.domain === "connection" && period.state === "OFFLINE") {
      summary.totalOfflineMs += durationMs;
      summary.offlinePeriods += 1;
      if (summary.lastDeactivationAtMs === null || period.startMs > summary.lastDeactivationAtMs) summary.lastDeactivationAtMs = period.startMs;
    } else if (period.state === "INTERRUPTED") {
      summary.totalInterruptedMs += durationMs;
      summary.interruptedPeriods += 1;
      if (summary.lastDeactivationAtMs === null || period.startMs > summary.lastDeactivationAtMs) summary.lastDeactivationAtMs = period.startMs;
    } else if (ACTIVE_STATES.has(period.state)) {
      summary.totalActiveMs += durationMs;
      summary.activePeriods += 1;
      if (summary.firstActivationAtMs === null || period.startMs < summary.firstActivationAtMs) summary.firstActivationAtMs = period.startMs;
    } else if (OFFLINE_STATES.has(period.state)) {
      summary.totalOfflineMs += durationMs;
      summary.offlinePeriods += 1;
      if (summary.lastDeactivationAtMs === null || period.startMs > summary.lastDeactivationAtMs) summary.lastDeactivationAtMs = period.startMs;
    } else if (ATTENTION_STATES.has(period.state)) {
      summary.totalAttentionMs += durationMs;
      summary.attentionPeriods += 1;
    }
  }
  return summary;
}
