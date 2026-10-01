import test from "node:test";
import assert from "node:assert/strict";
import { createTransitionDiagnostics, TRANSITION_DIAGNOSTIC_MAX_EVENTS } from "../src/transition-diagnostics.js";

function memoryStorage() {
  const values = new Map();
  return { getItem:key => values.get(key) || null, setItem:(key,value) => values.set(key,value) };
}

test("diagnóstico permanece desligado por padrão", () => {
  const diagnostic = createTransitionDiagnostics({ storage: memoryStorage(), now: () => 1 });
  assert.equal(diagnostic.record("PLAYER_T0"), null);
  assert.equal(diagnostic.pending(), null);
});

test("mantém buffer circular e produz lote remoto limitado", () => {
  const diagnostic = createTransitionDiagnostics({ identity:{ screenId:"canary", appVersion:"v20" }, storage:memoryStorage(), now:() => 1 });
  diagnostic.configure(true);
  for (let index = 0; index < TRANSITION_DIAGNOSTIC_MAX_EVENTS + 20; index += 1) diagnostic.record(`E${index}`, { mediaIndex:index });
  const report = diagnostic.report();
  assert.equal(report.events.length, TRANSITION_DIAGNOSTIC_MAX_EVENTS);
  assert.equal(report.events.at(-1).screenId, "canary");
  const pending = diagnostic.pending();
  assert.equal(pending.transitionDiagnostics.length, 120);
  assert.equal(pending.session.appVersion, "v20");
  diagnostic.acknowledge(pending.sequence);
  assert.equal(diagnostic.pending(), null);
});
