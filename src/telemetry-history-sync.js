function classify(error) {
  return String(error?.code || "").includes("permission-denied") ? "blocked" : "retry";
}

export async function syncTelemetryHistory({ history, refs = {}, setDoc } = {}) {
  const pending = history?.pending?.() || { days:[], sessions:[], events:[] };
  if (![...pending.days, ...pending.sessions, ...pending.events].length) return { status:"idle", acknowledged:{ days:[], sessions:[], events:[] } };
  const acknowledged = { days:[], sessions:[], events:[] };
  try {
    for (const item of pending.days) {
      await setDoc(refs.daily(item.id), item.data, { merge:true });
      acknowledged.days.push(item.id);
    }
    for (const item of pending.sessions) {
      await setDoc(refs.session(item.id), item.data, { merge:true });
      acknowledged.sessions.push(item.id);
    }
    for (const item of pending.events) {
      const { expiresAtMs, ...event } = item.data;
      await setDoc(refs.event(item.id), { ...event, expiresAt:new Date(expiresAtMs), expiresAtMs }, { merge:true });
      acknowledged.events.push(item.id);
    }
  } catch (error) {
    if (acknowledged.days.length || acknowledged.sessions.length || acknowledged.events.length) history.acknowledge(acknowledged);
    return { status:classify(error), acknowledged };
  }
  history.acknowledge(acknowledged);
  return { status:"synced", acknowledged };
}
