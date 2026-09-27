export const SCREEN_HEARTBEAT_INTERVAL_MS = 15_000;
export const SCREEN_ONLINE_THRESHOLD_MS = SCREEN_HEARTBEAT_INTERVAL_MS * 2;
export const SCREEN_ATTENTION_THRESHOLD_MS = SCREEN_HEARTBEAT_INTERVAL_MS * 4;
const PT_BR_COLLATOR = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

export function sortClientsAlphabetically(clients = []) {
  return [...clients].sort((left, right) => PT_BR_COLLATOR.compare(
    String(left?.name || ""),
    String(right?.name || "")
  ));
}

export function timestampMs(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value.seconds) return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getPortalScreenStatus(screen, now = Date.now()) {
  const lastSeenAt = timestampMs(screen?.lastSeenAt);
  if (!lastSeenAt) return "OFFLINE";
  const age = Math.max(0, now - lastSeenAt);
  if (age <= SCREEN_ONLINE_THRESHOLD_MS) return "ONLINE";
  if (age <= SCREEN_ATTENTION_THRESHOLD_MS) return "ATTENTION";
  return "OFFLINE";
}

export function formatRelativeCommunication(value, now = Date.now()) {
  const timestamp = timestampMs(value);
  if (!timestamp) return "Sem comunicação registrada";
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 5) return "agora";
  if (seconds < 60) return `há ${seconds} segundos`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const dayLabel = `${days} ${days === 1 ? "dia" : "dias"}`;
  if (!remainingHours) return `há ${dayLabel}`;
  const hourLabel = `${remainingHours} ${remainingHours === 1 ? "hora" : "horas"}`;
  return `há ${dayLabel} e ${hourLabel}`;
}

export function comparePortalScreens(left = {}, right = {}) {
  const leftKey = [left.clientName, left.name || left.code, left.id]
    .map((value) => String(value || "").trim().toLocaleLowerCase("pt-BR"));
  const rightKey = [right.clientName, right.name || right.code, right.id]
    .map((value) => String(value || "").trim().toLocaleLowerCase("pt-BR"));

  for (let index = 0; index < leftKey.length; index += 1) {
    const comparison = PT_BR_COLLATOR.compare(leftKey[index], rightKey[index]);
    if (comparison !== 0) return comparison;
  }
  return 0;
}

export function compareTelemetryScreens(left = {}, right = {}, now = Date.now()) {
  const priority = { ONLINE: 0, ATTENTION: 1, OFFLINE: 2 };
  const leftStatus = left.portalStatus || getPortalScreenStatus(left, now);
  const rightStatus = right.portalStatus || getPortalScreenStatus(right, now);
  const statusComparison = (priority[leftStatus] ?? 3) - (priority[rightStatus] ?? 3);
  if (statusComparison !== 0) return statusComparison;

  const leftSeen = timestampMs(left.lastSeenAt);
  const rightSeen = timestampMs(right.lastSeenAt);
  if (leftSeen && rightSeen && leftSeen !== rightSeen) return rightSeen - leftSeen;
  if (leftSeen !== rightSeen) return leftSeen ? -1 : 1;
  return comparePortalScreens(left, right);
}

export function getPortalScreenPage(screens = [], requestedPage = 1, pageSize = 8) {
  const safePageSize = Math.max(1, Number(pageSize) || 8);
  const pageCount = Math.max(1, Math.ceil(screens.length / safePageSize));
  const page = Math.min(pageCount, Math.max(1, Number(requestedPage) || 1));
  return {
    page,
    pageCount,
    items: screens.slice((page - 1) * safePageSize, page * safePageSize),
  };
}

export function isTelemetryEnabledForScreen(config, screen) {
  if (config?.enabled !== true) return false;
  return [config.clientIds?.includes(screen?.clientId), config.screenIds?.includes(screen?.id), config.deviceIds?.includes(screen?.connectedDeviceId || screen?.activeDeviceId)].some(Boolean);
}

export function getTelemetryVisualState({ config, screen, now = Date.now(), readError = false, periodHasData = true }) {
  if (readError) return "READ_ERROR";
  if (!isTelemetryEnabledForScreen(config, screen)) return "DISABLED";
  if (getPortalScreenStatus(screen, now) === "OFFLINE") return "SCREEN_OFFLINE";
  if (!screen?.telemetry || !timestampMs(screen.telemetryUpdatedAt)) return "WAITING_FIRST_SIGNAL";
  const staleAfter = Math.max(60_000, Number(config?.syncIntervalMs || 300_000)) * 2;
  if (now - timestampMs(screen.telemetryUpdatedAt) > staleAfter) return "STALE";
  if (!periodHasData) return "NO_DATA_PERIOD";
  return "ACTIVE";
}
