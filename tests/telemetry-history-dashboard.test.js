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

test("history reader is read-only and prioritizes daily summaries", () => {
  assert.match(reader, /"telemetryDaily"/);
  assert.match(reader, /\bgetDocs\b/);
  assert.doesNotMatch(reader, /\bsetDoc\b|\baddDoc\b|\bupdateDoc\b|\bdeleteDoc\b/);
  assert.doesNotMatch(reader, /telemetrySessions|telemetryEvents/);
});
