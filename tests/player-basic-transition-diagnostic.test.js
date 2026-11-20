import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("BASIC nao sincroniza diagnosticos historicos de transicao", () => {
  const source = fs.readFileSync(
    new URL("../src/App.jsx", import.meta.url),
    "utf8"
  );

  assert.match(
    source,
    /const pendingTransitionDiagnostic\s*=\s*!IS_BASIC_TELEMETRY_BUILD\s*&&\s*transitionDiagnosticsRef\.current\.pending\(\)/
  );

  assert.match(
    source,
    /const canSyncTransitionDiagnostic\s*=\s*pendingTransitionDiagnostic/
  );

  assert.match(
    source,
    /const canRescueTransitionDiagnostic\s*=\s*pendingTransitionDiagnostic/
  );

  assert.match(
    source,
    /else if \(canSyncTransitionDiagnostic\)/
  );
});