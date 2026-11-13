import assert from "node:assert/strict";
import test from "node:test";

import {
  createFirestoreRecoveryController,
  recoverLegacyFirestoreCoordination,
} from "../src/firestore-multitab-recovery.js";

function storageWithCapacity(entries, capacity) {
  const values = new Map(Object.entries(entries));
  const used = () => [...values].reduce((total, [key, value]) => total + key.length + String(value).length, 0);
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) {
      const previous = values.get(key);
      values.set(key, String(value));
      if (used() > capacity) {
        if (previous === undefined) values.delete(key);
        else values.set(key, previous);
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      }
    },
    removeItem(key) { values.delete(key); },
    has(key) { return values.has(key); },
  };
}

const mutation1 = "firestore_mutations_firestore/[DEFAULT]/totem-park/_41_user-a";
const mutation2 = "firestore_mutations_firestore/[DEFAULT]/totem-park/_42_user-a";
const clientState = "firestore_clients_firestore/[DEFAULT]/totem-park/_client-a";
const otherProjectMutation = "firestore_mutations_firestore/[DEFAULT]/other-project/_9_user-a";
const oldWrongMainLookalike = "firestore_mutations_firestore/[DEFAULT]/totem-park/main_41_user-a";

test("reproduz QuotaExceededError e recupera espaço somente após confirmar mutações pendentes", async () => {
  const preservedLink = "totempark-tv-connection";
  const storage = storageWithCapacity({
    [mutation1]: "pending-payload-aaaaaaaaaaaaaaaa",
    [mutation2]: "pending-payload-bbbbbbbbbbbbbbbb",
    [clientState]: "client-state-cccccccccccccccc",
    [preservedLink]: "linked-screen",
    [otherProjectMutation]: "other-project",
    [oldWrongMainLookalike]: "not-an-sdk-coordination-key",
  }, 390);

  assert.throws(
    () => storage.setItem("firestore_mutations_firestore/[DEFAULT]/totem-park/_43_user-a", "pending"),
    (error) => error?.name === "QuotaExceededError",
  );

  let heartbeatCount = 0;
  const result = await recoverLegacyFirestoreCoordination({
    storage,
    online: true,
    waitForPendingWrites: async () => {},
    requestHeartbeat: async () => { heartbeatCount += 1; },
  });

  assert.equal(result.status, "recovered");
  assert.deepEqual(result.removed.sort(), [clientState, mutation1, mutation2].sort());
  assert.equal(heartbeatCount, 1);
  assert.equal(storage.getItem(preservedLink), "linked-screen");
  assert.equal(storage.getItem(otherProjectMutation), "other-project");
  assert.equal(storage.getItem(oldWrongMainLookalike), "not-an-sdk-coordination-key");
  assert.doesNotThrow(() => storage.setItem("firestore_mutations_firestore/[DEFAULT]/totem-park/_43_user-a", "pending"));
});

test("falha ao confirmar mutações não remove nada e agenda recuperação posterior", async () => {
  const storage = storageWithCapacity({ [mutation1]: "pending" }, 1000);
  let retryCount = 0;
  let heartbeatCount = 0;
  const result = await recoverLegacyFirestoreCoordination({
    storage,
    online: true,
    waitForPendingWrites: async () => { throw new Error("network unavailable"); },
    requestHeartbeat: async () => { heartbeatCount += 1; },
    scheduleRetry: () => { retryCount += 1; },
  });

  assert.equal(result.status, "deferred-error");
  assert.equal(storage.has(mutation1), true);
  assert.equal(retryCount, 1);
  assert.equal(heartbeatCount, 0);
});

test("confirmação pendente até timeout preserva tudo e não bloqueia a reprodução", async () => {
  const storage = storageWithCapacity({ [mutation1]: "pending" }, 1000);
  let retryCount = 0;
  const result = await recoverLegacyFirestoreCoordination({
    storage,
    online: true,
    timeoutMs: 5,
    waitForPendingWrites: () => new Promise(() => {}),
    requestHeartbeat: async () => { throw new Error("must not run"); },
    scheduleRetry: () => { retryCount += 1; },
  });

  assert.equal(result.status, "deferred-timeout");
  assert.equal(storage.has(mutation1), true);
  assert.equal(retryCount, 1);
});

test("offline não consulta fila nem remove metadados", async () => {
  const storage = storageWithCapacity({ [mutation1]: "pending" }, 1000);
  let waitCount = 0;
  const result = await recoverLegacyFirestoreCoordination({
    storage,
    online: false,
    waitForPendingWrites: async () => { waitCount += 1; },
    scheduleRetry: () => {},
  });

  assert.equal(result.status, "deferred-offline");
  assert.equal(waitCount, 0);
  assert.equal(storage.has(mutation1), true);
});

test("sem metadados legados não aguarda fila nem duplica heartbeat", async () => {
  const storage = storageWithCapacity({ "totempark-tv-connection":"linked" }, 1000);
  let waitCount = 0;
  let heartbeatCount = 0;
  const result = await recoverLegacyFirestoreCoordination({
    storage,
    online: true,
    waitForPendingWrites: async () => { waitCount += 1; },
    requestHeartbeat: async () => { heartbeatCount += 1; },
  });

  assert.equal(result.status, "not-needed");
  assert.equal(waitCount, 0);
  assert.equal(heartbeatCount, 0);
});

test("heartbeat pós-limpeza pendente expira, agenda retry e o retry posterior confirma ONLINE", async () => {
  const storage = storageWithCapacity({ [mutation1]:"pending" }, 1000);
  let heartbeatAttempt = 0;
  let scheduledRetry = null;
  const controller = createFirestoreRecoveryController({
    storage,
    isOnline:() => true,
    waitForPendingWrites:async () => {},
    requestHeartbeat:() => {
      heartbeatAttempt += 1;
      return heartbeatAttempt === 1 ? new Promise(() => {}) : Promise.resolve(true);
    },
    heartbeatTimeoutMs:5,
    scheduleDelay:(callback) => {
      scheduledRetry = callback;
      return 7;
    },
    clearDelay:() => {},
  });

  const first = await controller.attempt();
  assert.equal(first.status, "recovered-heartbeat-timeout");
  assert.equal(storage.has(mutation1), false);
  assert.equal(typeof scheduledRetry, "function");

  scheduledRetry();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(heartbeatAttempt, 2);
  assert.equal(controller.state().stopped, true);
});

test("stop cancela retry agendado e impede nova recuperação após desmontagem", async () => {
  const storage = storageWithCapacity({ [mutation1]:"pending" }, 1000);
  let clearedTimer = null;
  const controller = createFirestoreRecoveryController({
    storage,
    isOnline:() => false,
    waitForPendingWrites:async () => {},
    requestHeartbeat:async () => true,
    scheduleDelay:() => 11,
    clearDelay:(timer) => { clearedTimer = timer; },
  });

  await controller.attempt();
  controller.stop();
  assert.equal(clearedTimer, 11);
  assert.equal(await controller.attempt(), null);
});
