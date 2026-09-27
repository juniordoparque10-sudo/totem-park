export function timestampMs(value) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  if (typeof value === "number") return value;
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : null;
}

export function bindingForScreen(screen, bindings = []) {
  const uid = screen?.connectedAuthUid;
  if (!uid) return null;
  return bindings.find((binding) => binding.id === uid && binding.status === "ACTIVE"
    && binding.clientId === screen.clientId && binding.screenId === screen.id
    && (!screen.connectedDeviceId || binding.deviceId === screen.connectedDeviceId)) || null;
}

export function linkedAtForScreen(screen, bindings = []) {
  if (!screen?.connectedAuthUid || !screen?.connectedDeviceId) return null;
  const binding = bindingForScreen(screen, bindings);
  // Legacy pairedAt/createdAt may belong to an earlier linkage. Only the
  // server-recorded timestamp on the matching active binding is authoritative.
  return binding?.linkedAt || null;
}

export function screenStatus(screen, now = Date.now()) {
  const lastSeen = Math.max(...[
    screen?.lastSeenAt,
    screen?.lastCommandExecutedAt,
    screen?.lastMediaUpdateAt,
  ].map((value) => timestampMs(value) || 0));
  if (lastSeen === null) return "OFFLINE";
  const age = now - lastSeen;
  if (!Number.isFinite(age)) return "OFFLINE";
  if (age < 45_000) return "ONLINE";
  if (age < 120_000) return "ATENÇÃO";
  return "OFFLINE";
}

export function telemetryStatus(screen, config, now = Date.now()) {
  const allowed = config?.enabled === true && (
    config.screenIds?.includes(screen.id)
    || config.clientIds?.includes(screen.clientId)
    || config.deviceIds?.includes(screen.connectedDeviceId)
  );
  if (!allowed) return "TELEMETRIA DESATIVADA";
  if (!screen.telemetry || !timestampMs(screen.telemetryUpdatedAt)) return "AGUARDANDO PRIMEIRO SINAL";
  if (now - timestampMs(screen.telemetryUpdatedAt) > 10 * 60_000) return "DADOS DESATUALIZADOS";
  return "ATIVA";
}

export function mediaSourceLabel(value) {
  return ({ CACHE_LOCAL: "LOCAL", INTERNET_FALLBACK: "REMOTE" })[value] || "UNKNOWN";
}

export function measured(value) {
  return value !== undefined && value !== null && Number.isFinite(Number(value));
}
