import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync(new URL("../src/TelemetryDashboard.jsx", import.meta.url), "utf8");

test("renders the real-event activity history controls and empty V2-A state", () => {
  assert.match(dashboard, /telemetry-v2-activity/);
  assert.match(dashboard, />Cliente</);
  assert.match(dashboard, />Tela</);
  assert.match(dashboard, />Período</);
  assert.match(dashboard, />Data</);
  assert.match(dashboard, /Ver timeline detalhada/);
  assert.match(dashboard, /Aguardando dados da Telemetria V2-A/);
});

test("consumes all three pure activity helpers", () => {
  assert.match(dashboard, /normalizeTelemetryActivityEvents/);
  assert.match(dashboard, /buildTelemetryActivityPeriods/);
  assert.match(dashboard, /summarizeTelemetryActivity/);
});

test("does not add another Firebase read mechanism for activity history", () => {
  assert.doesNotMatch(dashboard, /\bgetDocs\b|\bcollectionGroup\b/);
  assert.equal((dashboard.match(/\bonSnapshot\s*\(/g) || []).length, 4);
  assert.equal((dashboard.match(/from "firebase\/firestore"/g) || []).length, 1);
});

test("keeps current operational sections", () => {
  assert.equal((dashboard.match(/<MetricCard /g) || []).length, 14);
  assert.equal((dashboard.match(/<Donut /g) || []).length, 2);
  assert.match(dashboard, /<TrafficComparison metrics=\{metrics\}/);
  assert.match(dashboard, /renderTelemetryPdfReport/);
  assert.match(dashboard, /telemetry-table-v2/);
  assert.match(dashboard, /telemetry-detail/);
});
