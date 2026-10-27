import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("telemetry detail drawer closes only from the external area or Close button", () => {
  const source = readFileSync(new URL("../src/TelemetryDashboard.jsx", import.meta.url), "utf8");
  assert.match(source, /onClickCapture=\{\(event\) => \{ if \(selected && !event\.target\.closest\("\.telemetry-detail"\)\) \{ event\.stopPropagation\(\); setSelectedKey\(null\); \} \}\}/);
  assert.match(source, /className="close" onClick=\{\(\) => setSelectedKey\(null\)\}/);
});
