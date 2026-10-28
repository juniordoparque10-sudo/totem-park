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
  return {
    ...aggregateHistoricalDaily(rows, range.keys),
    errors,
    permissionDenied: errors.some((item) => item.kind === "permission-denied"),
    requestedScreens: screens.length,
    estimatedReads: rows.length,
    missingScreenDays,
  };
}
