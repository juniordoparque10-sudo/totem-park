import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync(new URL("../src/TelemetryDashboard.jsx", import.meta.url), "utf8");

test("both donuts share one component and keep auxiliary text outside the center", () => {
  assert.equal((dashboard.match(/<Donut /g) || []).length, 2);
  assert.match(dashboard, /telemetry-donut-caption/);
  assert.doesNotMatch(dashboard, /<div><strong>\{centerValue\}<\/strong><span>/);
  assert.match(dashboard, /caption="Com origem atual"/);
  assert.match(dashboard, /caption="Telas monitoradas"/);
});

test("schema 4 traffic summary replaces the obsolete V1 message", () => {
  assert.match(dashboard, /Resumo de tráfego — schema 4 atual/);
  assert.doesNotMatch(dashboard, /Telemetria Operacional V1 não mede tráfego de mídia/);
});

test("media download card does not claim an unavailable individual timestamp", () => {
  assert.match(dashboard, /Downloads de mídia acumulados/);
  assert.match(dashboard, /timestamp individual não disponível/);
  assert.doesNotMatch(dashboard, /title="Última transferência"/);
});
