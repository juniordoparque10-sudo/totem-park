import test from "node:test";
import assert from "node:assert/strict";
import { makeDecoderDiagnosticExport } from "../src/diagnostic-export.js";

test("names and identifies a decoder experiment export", () => {
  const report = { session: { id: "a1b2c3d4-1234", appVersion: "1.0-player-decoder-experiment" } };
  const exported = makeDecoderDiagnosticExport(report, [{ type: "DECODER_RELEASE_END" }], new Date("2026-09-22T17:45:30.123Z"), "abcd");
  assert.equal(exported.fileName, "totempark-decoder-experiment-20260922-174530123-a1b2c3d4-abcd.json");
  const payload = JSON.parse(exported.data);
  assert.equal(payload.appVersion, "1.0-player-decoder-experiment");
  assert.equal(payload.packageName, "br.com.parksolutions.totempark.player.decoderexperiment");
  assert.equal(payload.buildType, "DECODER_EXPERIMENT_B");
  assert.equal(payload.sessionId, report.session.id);
  assert.equal(payload.exportedAt, "2026-09-22T17:45:30.123Z");
  assert.deepEqual(payload.jumpEvents, [{ type: "DECODER_RELEASE_END" }]);
});

test("a second export receives a new filename", () => {
  const report = { session: { id: "a1b2c3d4-1234" } };
  const first = makeDecoderDiagnosticExport(report, [], new Date("2026-09-22T17:45:30.123Z"), "abcd");
  const second = makeDecoderDiagnosticExport(report, [], new Date("2026-09-22T17:45:30.123Z"), "efgh");
  assert.notEqual(first.fileName, second.fileName);
});
