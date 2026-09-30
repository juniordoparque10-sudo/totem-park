import test from "node:test";
import assert from "node:assert/strict";
import { formatActiveTime, renderTelemetryPdfReport } from "./telemetry-pdf-report.js";

test("active time uses the operational counter with days, hours and minutes", () => {
  assert.equal(formatActiveTime(null), "—");
  assert.equal(formatActiveTime(600000), "10 min");
  assert.equal(formatActiveTime(5700000), "1h 35min");
  assert.equal(formatActiveTime(101280000), "1d 4h 8min");
});

for (const size of [2, 5, 12]) {
  test(`portrait report contains ${size} separate screen rows and real branding URLs`, () => {
    const rows = Array.from({ length: size }, (_, index) => ({ name: `ECO TV ${index + 1}`, clientName: "ECO Rede de Ensino", status: index % 3 === 0 ? "ONLINE" : "OFFLINE", lastCommunication: "agora", telemetry: "Ativa", cache: "Cache pronto 13/13", version: "1.0.0-v16-field-release-candidate", origin: "Local", activeTimeMs: 5700000 }));
    const html = renderTelemetryPdfReport({ rows, clientName: "ECO Rede de Ensino", clientLogoUrl: "https://example.com/real-client-logo.png", totemLogoUrl: "https://example.com/real-totem-logo.png", generatedAt: "2026-09-28T15:00:00Z" });
    assert.match(html, /size:A4 portrait/);
    assert.match(html, /display:table-header-group/);
    assert.match(html, /Página 1 de/);
    assert.equal(html.split('<tr><td class="screen">').length - 1, size);
    assert.match(html, /Tempo ativo/);
    assert.match(html, /1h 35min/);
    assert.match(html, /<td class="center">—<\/td>/);
    assert.match(html, /real-client-logo\.png/);
    assert.match(html, /real-totem-logo\.png/);
  });
}

test("missing logo is not invented and data is escaped", () => {
  const html = renderTelemetryPdfReport({ rows: [{ name: "<script>", clientName: "ECO", status: "ONLINE", lastCommunication: "agora", telemetry: "Ativa", cache: "Cache pronto", version: "v16", origin: "Local", activeTimeMs: null }], clientName: "ECO", clientLogoUrl: "", totemLogoUrl: "https://example.com/logo.png", generatedAt: "2026-09-28T15:00:00Z" });
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<strong><script>/);
  assert.match(html, /client-monogram/);
});
