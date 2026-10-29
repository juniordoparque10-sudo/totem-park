import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync(new URL("../src/TelemetryDashboard.jsx", import.meta.url), "utf8");
const reader = readFileSync(new URL("../src/telemetry-history-reader.js", import.meta.url), "utf8");

test("historical dashboard stays separate from current session and supports required filters", () => {
  assert.match(dashboard, />Sessão atual</);
  assert.match(dashboard, />Histórico do período</);
  assert.match(dashboard, /value="today"/);
  assert.match(dashboard, /value="7d"/);
  assert.match(dashboard, /value="30d"/);
  assert.match(dashboard, /value="custom"/);
  assert.match(dashboard, /Permissão insuficiente/);
  assert.match(dashboard, /Sem histórico no período/);
});

test("history reader is read-only and connects daily summaries, sessions and events", () => {
  assert.match(reader, /"telemetryDaily"/);
  assert.match(reader, /\bgetDocs\b/);
  assert.doesNotMatch(reader, /\bsetDoc\b|\baddDoc\b|\bupdateDoc\b|\bdeleteDoc\b/);
  assert.match(reader, /telemetrySessions/);
  assert.match(reader, /telemetryEvents/);
});

test("history aggregation preserves absence and deduplicates session identifiers", async () => {
  const { aggregateHistoricalDaily } = await import("../src/telemetry-history-dashboard.js");
  const result = aggregateHistoricalDaily([
    { dateKey:"2026-10-28", clientId:"c", screenId:"s", sessionIds:["same"], sessionCount:1 },
    { dateKey:"2026-10-29", clientId:"c", screenId:"s", sessionIds:["same", "new"], sessionCount:2 },
  ], ["2026-10-28", "2026-10-29"]);
  assert.equal(result.totals.sessionCount, 2);
  assert.equal(result.totals.internetRxBytes, null);
  assert.equal(result.totals.internetTxBytes, null);
  assert.equal(result.totals.internetTotalBytes, null);
});
