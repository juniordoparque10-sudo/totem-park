import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { aggregateHistoricalDaily, classifyHistoryReadError, normalizeHistoricalDaily } from "./telemetry-history-dashboard";

export async function readTelemetryHistory(database, screens, range) {
  const reads = await Promise.all((screens || []).map(async (screen) => {
    try {
      const reference = collection(database, "clients", screen.clientId, "screens", screen.id, "telemetryDaily");
      const snapshot = await getDocs(query(reference,
        where(documentId(), ">=", range.start),
        where(documentId(), "<=", range.end)));
      return {
        rows: snapshot.docs.map((item) => normalizeHistoricalDaily(item.data(), {
          dateKey:item.id, clientId:screen.clientId, screenId:screen.id,
        })),
      };
    } catch (error) {
      return { rows:[], error, kind:classifyHistoryReadError(error), clientId:screen.clientId, screenId:screen.id };
    }
  }));
  const rows = reads.flatMap((result) => result.rows);
  const errors = reads.filter((result) => result.error);
  const presentScreenDays = new Set(rows.map((row) => `${row.clientId}/${row.screenId}/${row.dateKey}`));
  const missingScreenDays = (screens || []).reduce((sum, screen) => sum + range.keys.filter((key) =>
    !presentScreenDays.has(`${screen.clientId}/${screen.id}/${key}`)).length, 0);
  const byScreen = (screens || []).map((screen) => ({
    clientId:screen.clientId,
    screenId:screen.id,
    ...aggregateHistoricalDaily(rows.filter((row) => row.clientId === screen.clientId && row.screenId === screen.id), range.keys),
  }));
  return {
    ...aggregateHistoricalDaily(rows, range.keys),
    errors,
    permissionDenied: errors.some((item) => item.kind === "permission-denied"),
    requestedScreens: screens.length,
    estimatedReads: rows.length,
    missingScreenDays,
    byScreen,
  };
}

export async function readTelemetryActivityHistory(database, screens, range) {
  const reads = await Promise.all((screens || []).map(async (screen) => {
    try {
      const eventsRef = collection(database, "clients", screen.clientId, "screens", screen.id, "telemetryEvents");
      const sessionsRef = collection(database, "clients", screen.clientId, "screens", screen.id, "telemetrySessions");
      const [eventsSnapshot, sessionsSnapshot] = await Promise.all([
        getDocs(query(eventsRef, where("atMs", ">=", range.startMs), where("atMs", "<=", range.endMs))),
        getDocs(sessionsRef),
      ]);
      return {
        clientId:screen.clientId, screenId:screen.id,
        events:eventsSnapshot.docs.map((item) => ({ id:item.id, ...item.data() })),
        sessions:sessionsSnapshot.docs.map((item) => ({ id:item.id, ...item.data() })),
      };
    } catch (error) {
      return { clientId:screen.clientId, screenId:screen.id, events:[], sessions:[], error, kind:classifyHistoryReadError(error) };
    }
  }));
  return { reads, estimatedReads:reads.reduce((sum, item) => sum + item.events.length + item.sessions.length, 0) };
}
