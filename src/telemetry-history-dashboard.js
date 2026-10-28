const DAY_MS = 86400000;
const SUM_FIELDS = [
  "internetRxBytes", "internetTxBytes", "mediaDownloadedBytes", "cacheReusedBytes",
  "trafficAvoidedBytes", "observedUptimeSeconds", "provedPlaybackSeconds",
  "provedOnlineSeconds", "provedOfflineSeconds", "sessionCount", "restartCount",
  "failureCount", "unknownInterruptionCount", "cachePlaybackHits",
  "remotePlaybackCount", "fallbackPlaybackCount", "cacheablePlaybackCount",
];

const finiteNonNegative = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
const validDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
const dateKey = (value) => new Date(value).toISOString().slice(0, 10);
const utcStart = (value) => Date.parse(`${String(value).slice(0, 10)}T00:00:00.000Z`);

export function historicalDateRange(period, { now = Date.now(), customStart, customEnd } = {}) {
  const today = dateKey(now);
  let end = validDateKey(customEnd) && period === "custom" ? customEnd : today;
  let start = end;
  if (period === "7d") start = dateKey(utcStart(end) - 6 * DAY_MS);
  if (period === "30d") start = dateKey(utcStart(end) - 29 * DAY_MS);
  if (period === "custom" && validDateKey(customStart)) start = customStart;
  if (start > end) [start, end] = [end, start];
  const keys = [];
  for (let cursor = utcStart(start); cursor <= utcStart(end); cursor += DAY_MS) keys.push(dateKey(cursor));
  return { start, end, keys };
}

export function normalizeHistoricalDaily(raw = {}, identity = {}) {
  const normalized = {
    dateKey: validDateKey(raw.dateKey) ? raw.dateKey : identity.dateKey,
    clientId: raw.clientId || identity.clientId || "",
    screenId: raw.screenId || identity.screenId || "",
    versionName: raw.versionName || "",
    versionCode: raw.versionCode ?? null,
    lastCommunicationAt: raw.lastCommunicationAt || null,
  };
  SUM_FIELDS.forEach((field) => { normalized[field] = finiteNonNegative(raw[field]); });
  normalized.cacheHitRate = normalized.cacheablePlaybackCount
    ? normalized.cachePlaybackHits / normalized.cacheablePlaybackCount
    : null;
  return normalized;
}

export function aggregateHistoricalDaily(rows = [], expectedDateKeys = []) {
  const normalizedRows = rows.map((row) => normalizeHistoricalDaily(row, row));
  const totals = Object.fromEntries(SUM_FIELDS.map((field) => [field, 0]));
  normalizedRows.forEach((row) => SUM_FIELDS.forEach((field) => { totals[field] += row[field]; }));
  totals.internetTotalBytes = totals.internetRxBytes + totals.internetTxBytes;
  totals.cacheHitRate = totals.cacheablePlaybackCount ? totals.cachePlaybackHits / totals.cacheablePlaybackCount : null;
  const present = new Set(normalizedRows.map((row) => row.dateKey).filter(validDateKey));
  return {
    rows: normalizedRows.sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    totals,
    missingDateKeys: expectedDateKeys.filter((key) => !present.has(key)),
    hasData: normalizedRows.length > 0,
  };
}

export function classifyHistoryReadError(error) {
  const code = String(error?.code || "").toLowerCase();
  return code.includes("permission-denied") ? "permission-denied" : "error";
}
