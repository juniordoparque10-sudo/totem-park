import assert from "node:assert/strict";
import test from "node:test";

import {
  createPlayerCapabilitySyncState,
  fingerprintPlayerCapabilities,
} from "../src/player-capability-sync-state.js";

const capabilities = (version = 70) => ({ templatesV2: true, versionCode: version });

test("capabilities confirmadas e inalteradas não são reenviadas", () => {
  const state = createPlayerCapabilitySyncState({ retryIntervalMs: 300_000 });
  const desired = capabilities();

  assert.equal(state.shouldSync(desired, 1_000), true);
  state.markSuccess(desired);
  assert.equal(state.shouldSync(desired, 301_000), false);
  assert.equal(state.shouldSync(desired, 3_001_000), false);
});
test("mudança real de capabilities exige nova confirmação", () => {
  const state = createPlayerCapabilitySyncState();
  state.markSuccess(capabilities(69));

  assert.equal(state.shouldSync(capabilities(70), 1_000), true);
});

test("falha aplica intervalo mínimo e permite nova tentativa depois", () => {
  const state = createPlayerCapabilitySyncState({ retryIntervalMs: 300_000 });
  const desired = capabilities();

  state.markFailure(desired, 5_000);
  assert.equal(state.shouldSync(desired, 304_999), false);
  assert.equal(state.shouldSync(desired, 305_000), true);
});

test("reconexão libera somente tentativa pendente após falha", () => {
  const state = createPlayerCapabilitySyncState({ retryIntervalMs: 300_000 });
  const desired = capabilities();

  state.markFailure(desired, 5_000);
  state.onReconnect();
  assert.equal(state.shouldSync(desired, 5_001), true);

  state.markSuccess(desired);
  state.onReconnect();
  assert.equal(state.shouldSync(desired, 5_002), false);
});

test("listener confirma contrato igual e detecta divergência posterior", () => {
  const state = createPlayerCapabilitySyncState();
  const desired = capabilities();

  state.setDesired(desired);
  state.observeRemote(desired);
  assert.equal(state.shouldSync(desired, 1_000), false);

  state.observeRemote(capabilities(69));
  assert.equal(state.shouldSync(desired, 1_001), true);
});

test("snapshot remoto anterior ao primeiro heartbeat também evita escrita redundante", () => {
  const state = createPlayerCapabilitySyncState();
  const desired = capabilities();

  state.observeRemote(desired);
  assert.equal(state.shouldSync(desired, 1_000), false);
});

test("fingerprint é determinístico para o contrato serializado", () => {
  assert.equal(
    fingerprintPlayerCapabilities(capabilities()),
    fingerprintPlayerCapabilities({ templatesV2: true, versionCode: 70 })
  );
});
