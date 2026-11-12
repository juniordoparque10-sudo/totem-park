import test from "node:test";
import assert from "node:assert/strict";
import { createPlayerActivityTelemetry } from "../src/player-activity-telemetry.js";
import { createPlayerTelemetry } from "../src/player-telemetry.js";
import { createTelemetryHistory } from "../src/telemetry-history.js";
import { createTrafficTelemetry } from "../src/traffic-telemetry.js";
import { createTransitionDiagnostics } from "../src/transition-diagnostics.js";
import { persistTvConnection, TV_CONNECTION_STORAGE_KEY } from "../src/android-link-lifecycle.js";

function quotaStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem() { throw new DOMException("Storage quota exceeded", "QuotaExceededError"); },
    removeItem(key) { values.delete(key); },
    raw(key) { return values.get(key); },
  };
}

test("quota não interrompe atividade, telemetria, tráfego ou diagnóstico mantidos em memória", () => {
  const storage = quotaStorage();

  const activity = createPlayerActivityTelemetry({ storage, identity: { screenId: "screen-1" }, now: () => 1000 });
  assert.doesNotThrow(() => activity.startPlayback({ id: "media-1", type: "video" }));
  assert.equal(activity.getState().events.at(-1)?.type, "PLAYBACK_START");

  const telemetry = createPlayerTelemetry({ storage, alwaysEnabled: true, now: () => 2000, monotonicNow: () => 2000 });
  telemetry.configure({ enabled: true });
  assert.doesNotThrow(() => telemetry.updateOperational({ playerState: "playing", currentItemId: "media-1" }));
  assert.equal(telemetry.getReport().current.currentItemId, "media-1");

  const traffic = createTrafficTelemetry({ storage, now: () => Date.parse("2026-11-12T12:00:00Z") });
  assert.doesNotThrow(() => traffic.recordNetworkStats({ supported: false }));

  const history = createTelemetryHistory({ storage, identity: { screenId: "screen-1" }, now: () => Date.parse("2026-11-12T12:00:00Z") });
  assert.doesNotThrow(() => history.updateIdentity({ deviceId: "device-1" }));

  const diagnostics = createTransitionDiagnostics({ storage, identity: { screenId: "screen-1" }, now: () => 3000 });
  diagnostics.configure(true);
  assert.doesNotThrow(() => diagnostics.record("PLAYBACK_START", { mediaId: "media-1" }));
  assert.equal(diagnostics.report().events.length, 1);
});

test("falha ao persistir novo vínculo não apaga nem finge substituir o vínculo existente", () => {
  const previous = JSON.stringify({ clientId: "client-old", code: "OLD123", deviceId: "device-old" });
  const storage = quotaStorage({ [TV_CONNECTION_STORAGE_KEY]: previous });
  const result = persistTvConnection({ clientId: "client-new", code: "NEW123", deviceId: "device-new" }, storage);
  assert.equal(result, null);
  assert.equal(storage.raw(TV_CONNECTION_STORAGE_KEY), previous);
});
