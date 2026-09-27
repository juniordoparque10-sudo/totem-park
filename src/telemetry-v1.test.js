import test from "node:test";
import assert from "node:assert/strict";
import { linkedAtForScreen, measured, screenStatus, telemetryStatus, timestampMs } from "./telemetry-v1.js";

test("old screens show no link date until the current binding has linkedAt", () => {
  const screen = { id: "s", clientId: "c", connectedAuthUid: "uid", connectedDeviceId: "d" };
  const bindings = [{ id: "uid", status: "ACTIVE", clientId: "c", screenId: "s", deviceId: "d", pairedAt: { seconds: 1727199120 } }];
  assert.equal(linkedAtForScreen(screen, bindings), null);
  assert.equal(timestampMs(linkedAtForScreen(screen, [{ ...bindings[0], linkedAt: { seconds: 1727199120 } }])), 1727199120000);
  assert.equal(linkedAtForScreen(screen, []), null);
  assert.equal(linkedAtForScreen(screen, [{ ...bindings[0], status: "REVOKED" }]), null);
  assert.equal(linkedAtForScreen({ ...screen, connectedAuthUid: null, linkedAt: { seconds: 1727199120 } }, []), null);
});

test("screen and telemetry states remain independent", () => {
  const now = 1_000_000;
  const screen = { id: "s", clientId: "c", lastSeenAt: now - 10_000 };
  const enabled = { enabled: true, screenIds: ["s"], clientIds: [], deviceIds: [] };
  assert.equal(screenStatus(screen, now), "ONLINE");
  assert.equal(telemetryStatus(screen, enabled, now), "AGUARDANDO PRIMEIRO SINAL");
  assert.equal(telemetryStatus(screen, { enabled: false }, now), "TELEMETRIA DESATIVADA");
  assert.equal(telemetryStatus({ ...screen, telemetry: {}, telemetryUpdatedAt: now - 700_000 }, enabled, now), "DADOS DESATUALIZADOS");
  assert.equal(telemetryStatus({ ...screen, telemetry: {}, telemetryUpdatedAt: now - 1_000 }, enabled, now), "ATIVA");
  assert.equal(telemetryStatus({ ...screen, lastSeenAt: now - 200_000 }, enabled, now), "TELA OFFLINE");
});

test("operational V1 uses its own heartbeat for online status", () => {
  const now = 1_000_000;
  const screen = { lastSeenAt: now - 200_000, telemetry: { schemaVersion: 3 }, telemetryUpdatedAt: now - 10_000 };
  assert.equal(screenStatus(screen, now), "ONLINE");
  assert.equal(screenStatus({ ...screen, telemetryUpdatedAt: now - 60_000 }, now), "ATENÇÃO");
  assert.equal(screenStatus({ ...screen, telemetryUpdatedAt: now - 200_000 }, now), "OFFLINE");
});

test("missing metrics are distinct from measured zero", () => {
  assert.equal(measured(undefined), false);
  assert.equal(measured(null), false);
  assert.equal(measured(0), true);
});
