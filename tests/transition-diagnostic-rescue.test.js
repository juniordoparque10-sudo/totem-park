import test from "node:test";
import assert from "node:assert/strict";
import {
  captureV20TransitionDiagnosticBuffer,
  markV20TransitionDiagnosticRescueUploaded,
  V20_TRANSITION_DIAGNOSTIC_STORAGE_KEY,
  V21_TRANSITION_DIAGNOSTIC_RESCUE_KEY,
} from "../src/transition-diagnostic-rescue.js";

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
}

function v20Buffer() {
  return {
    sessionId: "screen-123-session",
    sequence: 7,
    events: [{
      timestamp: "2026-09-30T12:00:00.000Z",
      eventName: "PLAYER_T7",
      appVersion: "1.0.0-v20-transition-diagnostic",
      diagnosticSessionId: "screen-123-session",
    }],
  };
}

test("captura o buffer V20 sem alterar sua chave original", () => {
  const raw = JSON.stringify(v20Buffer());
  const storage = memoryStorage({ [V20_TRANSITION_DIAGNOSTIC_STORAGE_KEY]: raw });
  const rescue = captureV20TransitionDiagnosticBuffer(storage, () => Date.parse("2026-09-30T12:01:00Z"));
  assert.equal(storage.getItem(V20_TRANSITION_DIAGNOSTIC_STORAGE_KEY), raw);
  assert.equal(rescue.payload.diagnosticSessionId, "screen-123-session");
  assert.equal(rescue.payload.events[0].timestamp, "2026-09-30T12:00:00.000Z");
  assert.ok(storage.getItem(V21_TRANSITION_DIAGNOSTIC_RESCUE_KEY));
});

test("não captura buffer ausente, inválido ou de outra versão", () => {
  assert.equal(captureV20TransitionDiagnosticBuffer(memoryStorage()), null);
  assert.equal(captureV20TransitionDiagnosticBuffer(memoryStorage({ [V20_TRANSITION_DIAGNOSTIC_STORAGE_KEY]: "{" })), null);
  const wrong = v20Buffer();
  wrong.events[0].appVersion = "v19";
  assert.equal(captureV20TransitionDiagnosticBuffer(memoryStorage({ [V20_TRANSITION_DIAGNOSTIC_STORAGE_KEY]: JSON.stringify(wrong) })), null);
});

test("marca upload somente por confirmação explícita sem apagar o original", () => {
  const raw = JSON.stringify(v20Buffer());
  const storage = memoryStorage({ [V20_TRANSITION_DIAGNOSTIC_STORAGE_KEY]: raw });
  captureV20TransitionDiagnosticBuffer(storage);
  const uploaded = markV20TransitionDiagnosticRescueUploaded(storage, { status: "STORED" });
  assert.equal(uploaded.rescueUploaded, true);
  assert.equal(storage.getItem(V20_TRANSITION_DIAGNOSTIC_STORAGE_KEY), raw);
});
