export const SCREEN_HEARTBEAT_INTERVAL_MS = 15_000;
export const SCREEN_ONLINE_THRESHOLD_MS = 45_000;
export const SCREEN_ATTENTION_THRESHOLD_MS = 90_000;
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

export function getPortalLastSignalMs(screen = {}) {
  const playerSignal = Math.max(
    timestampMs(screen?.lastSeenAt),
    timestampMs(screen?.lastCommandExecutedAt),
    timestampMs(screen?.lastMediaUpdateAt)
  );
  const telemetry = screen?.telemetry;
  const session = telemetry?.session;
  const operationalHeartbeat = timestampMs(session?.lastHeartbeatAt);
  const trustedV5 = Number(telemetry?.schemaVersion) >= 3
    && (telemetry?.current?.networkStatus || telemetry?.current?.connectionStatus) === "ONLINE"
    && Boolean(operationalHeartbeat)
    && Boolean(screen?.connectedDeviceId)
    && session?.screenId === screen?.id
    && session?.clientId === screen?.clientId
    && session?.deviceId === screen?.connectedDeviceId;
  return Math.max(playerSignal, trustedV5 ? operationalHeartbeat : 0);
}

export function getPortalScreenStatus(screen, now = Date.now()) {
  if (!screen?.connectedDeviceId && !screen?.activeDeviceId) return "OFFLINE";
  const lastSeenAt = getPortalLastSignalMs(screen);
  if (!lastSeenAt) return "OFFLINE";
  const age = Math.max(0, now - lastSeenAt);
  if (age < SCREEN_ONLINE_THRESHOLD_MS) return "ONLINE";
  if (age < SCREEN_ATTENTION_THRESHOLD_MS) return "ATTENTION";
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

function compareScreenNames(left = {}, right = {}) {
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

export function comparePortalScreens(left = {}, right = {}) {
  return compareScreenNames(left, right);
}

export function createPortalScreenOrderTracker({
  getKey = (screen) => String(screen?.id || ""),
  sortOfflineByLastSignal = false,
} = {}) {
  const records = new Map();
  let sequence = 0;
  const keyFor = (screen) => String(getKey(screen) || "");

  return {
    sort(screens = [], now = Date.now()) {
      const currentIds = new Set(screens.map(keyFor));
      records.forEach((_, id) => { if (!currentIds.has(id)) records.delete(id); });

      const untracked = screens.filter((screen) => !records.has(keyFor(screen)));
      untracked.sort((left, right) => compareScreenNames(left, right));
      untracked.forEach((screen) => {
        const id = keyFor(screen);
        const online = getPortalScreenStatus(screen, now) !== "OFFLINE";
        records.set(id, { online, onlineOrder: online ? ++sequence : 0, stableOrder:++sequence });
      });

      screens.forEach((screen) => {
        const record = records.get(keyFor(screen));
        const online = getPortalScreenStatus(screen, now) !== "OFFLINE";
        if (online && !record.online) record.onlineOrder = ++sequence;
        record.online = online;
      });

      return [...screens].sort((left, right) => {
        const leftRecord = records.get(keyFor(left));
        const rightRecord = records.get(keyFor(right));
        if (leftRecord.online !== rightRecord.online) return leftRecord.online ? -1 : 1;

        if (!leftRecord.online && sortOfflineByLastSignal) {
          const communicationOrder = getPortalLastSignalMs(right) - getPortalLastSignalMs(left);
          if (communicationOrder) return communicationOrder;
        }

        const order = leftRecord.online
          ? leftRecord.onlineOrder - rightRecord.onlineOrder
          : leftRecord.stableOrder - rightRecord.stableOrder;
        return order || compareScreenNames(left, right);
      });
    },
  };
}

export function compareTelemetryScreens(left = {}, right = {}) {
  const statusOrder = { ONLINE: 0, ATTENTION: 1, OFFLINE: 2 };
  const statusComparison = (statusOrder[left?.portalStatus] ?? 3) - (statusOrder[right?.portalStatus] ?? 3);
  if (statusComparison) return statusComparison;

  const communicationComparison = getPortalLastSignalMs(right) - getPortalLastSignalMs(left);
  if (communicationComparison) return communicationComparison;

  return compareScreenNames(left, right);
}

export function compareTelemetryOperationalScreens(left = {}, right = {}) {
  const leftOnline = left?.portalStatus === "ONLINE";
  const rightOnline = right?.portalStatus === "ONLINE";
  if (leftOnline !== rightOnline) return leftOnline ? -1 : 1;
  if (leftOnline) {
    const leftUptime = Number(left?.telemetry?.session?.uptimeSeconds);
    const rightUptime = Number(right?.telemetry?.session?.uptimeSeconds);
    const leftMeasured = Number.isFinite(leftUptime) && leftUptime >= 0;
    const rightMeasured = Number.isFinite(rightUptime) && rightUptime >= 0;
    if (leftMeasured !== rightMeasured) return leftMeasured ? -1 : 1;
    if (leftMeasured && rightMeasured && leftUptime !== rightUptime) return rightUptime - leftUptime;
  } else {
    const communicationOrder = getPortalLastSignalMs(right) - getPortalLastSignalMs(left);
    if (communicationOrder) return communicationOrder;
  }
  return compareScreenNames(left, right);
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
  if (!screen?.telemetry || !timestampMs(screen.telemetryUpdatedAt)) return "WAITING_FIRST_SIGNAL";
  if (Number(screen.telemetry.schemaVersion) >= 3) {
    const heartbeatAt = timestampMs(screen.telemetry?.session?.lastHeartbeatAt);
    if (!heartbeatAt || now - heartbeatAt >= SCREEN_ONLINE_THRESHOLD_MS) return "STALE";
  }
  const staleAfter = Math.max(60_000, Number(config?.syncIntervalMs || 300_000)) * 2;
  if (now - timestampMs(screen.telemetryUpdatedAt) > staleAfter) return "STALE";
  if (!periodHasData) return "NO_DATA_PERIOD";
  return "ACTIVE";
}
