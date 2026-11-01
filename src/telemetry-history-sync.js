function classify(error) {
  return String(error?.code || "").includes("permission-denied") ? "blocked" : "retry";
}

const SUCCESS_INTERVAL_MS = 15 * 60 * 1000;
const RETRY_BASE_MS = 60 * 1000;
const RETRY_MAX_MS = 15 * 60 * 1000;
const BLOCKED_BASE_MS = 15 * 60 * 1000;
const BLOCKED_MAX_MS = 60 * 60 * 1000;

export function shouldAttemptTelemetryHistorySync({ now = Date.now(), nextAttemptAt = 0, hasPending = false } = {}) {
  return Boolean(hasPending) && Number(now) >= Number(nextAttemptAt || 0);
}

export function nextTelemetryHistorySyncState(result, { now = Date.now(), failureCount = 0 } = {}) {
  if (result?.status === "synced" || result?.status === "idle") {
    return { failureCount:0, nextAttemptAt:Number(now) + SUCCESS_INTERVAL_MS };
  }
  const nextFailureCount = Math.max(0, Number(failureCount) || 0) + 1;
  const blocked = result?.status === "blocked";
  const baseMs = blocked ? BLOCKED_BASE_MS : RETRY_BASE_MS;
  const maxMs = blocked ? BLOCKED_MAX_MS : RETRY_MAX_MS;
  const delayMs = Math.min(maxMs, baseMs * (2 ** (nextFailureCount - 1)));
  return { failureCount:nextFailureCount, nextAttemptAt:Number(now) + delayMs };
}

export function shouldAdvanceTelemetryHistorySync(result) {
  return result?.status === "synced" || result?.status === "idle";
}

export async function syncTelemetryHistory({ history, refs = {}, setDoc } = {}) {
  const pending = history?.pending?.() || { days:[], sessions:[], events:[] };
  if (![...pending.days, ...pending.sessions, ...pending.events].length) return { status:"idle", acknowledged:{ days:[], sessions:[], events:[] } };
  const acknowledged = { days:[], sessions:[], events:[] };
  let activeWrite = null;
  try {
    for (const item of pending.days) {
      activeWrite = { collection:"telemetryDaily", documentId:item.id };
      await setDoc(refs.daily(item.id), item.data, { merge:true });
      acknowledged.days.push(item.id);
    }
    for (const item of pending.sessions) {
      activeWrite = { collection:"telemetrySessions", documentId:item.id };
      await setDoc(refs.session(item.id), item.data, { merge:true });
      acknowledged.sessions.push(item.id);
    }
    for (const item of pending.events) {
      activeWrite = { collection:"telemetryEvents", documentId:item.id };
      const { expiresAtMs, ...event } = item.data;
      await setDoc(refs.event(item.id), { ...event, expiresAt:new Date(expiresAtMs), expiresAtMs }, { merge:true });
      acknowledged.events.push(item.id);
    }
  } catch (error) {
    if (acknowledged.days.length || acknowledged.sessions.length || acknowledged.events.length) history.acknowledge(acknowledged);
    return {
      status:classify(error),
      acknowledged,
      failure:{
        ...activeWrite,
        code:String(error?.code || "unknown"),
        message:String(error?.message || error || "unknown"),
      },
    };
  }
  history.acknowledge(acknowledged);
  return { status:"synced", acknowledged };
}
