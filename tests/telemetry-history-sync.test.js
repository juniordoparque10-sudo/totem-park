import assert from "node:assert/strict";
import test from "node:test";

import * as telemetryHistorySync from "../src/telemetry-history-sync.js";

const { syncTelemetryHistory } = telemetryHistorySync;

function historyWith(pending) {
  const acknowledgements = [];
  return { pending:() => pending, acknowledge:(value) => acknowledgements.push(value), acknowledgements };
}

test("sync writes stable document paths and acknowledges only successful ids", async () => {
  const history = historyWith({
    days:[{ id:"2026-10-28", data:{ sequence:2, clientId:"c", screenId:"s", deviceId:"d" } }],
    sessions:[{ id:"session-1", data:{ sequence:3, session:{ sessionId:"session-1" } } }],
    events:[{ id:"event:1", data:{ id:"event:1", expiresAtMs:1000 } }],
  });
  const writes = [];
  const result = await syncTelemetryHistory({
    history,
    refs:{ daily:(id) => `daily/${id}`, session:(id) => `session/${id}`, event:(id) => `event/${id}` },
    setDoc:async (...args) => writes.push(args),
  });
  assert.deepEqual(writes.map(([ref]) => ref), ["daily/2026-10-28", "session/session-1", "event/event:1"]);
  assert.equal(writes[2][1].expiresAt instanceof Date, true);
  assert.deepEqual(history.acknowledgements, [{ days:["2026-10-28"], sessions:["session-1"], events:["event:1"] }]);
  assert.equal(result.status, "synced");
});

test("failed writes remain pending and retrying uses the same ids without duplication", async () => {
  const history = historyWith({ days:[{ id:"2026-10-28", data:{ sequence:1 } }], sessions:[], events:[{ id:"same", data:{ id:"same", expiresAtMs:2000 } }] });
  let fail = true;
  const writes = [];
  const setDoc = async (ref) => { writes.push(ref); if (fail) throw Object.assign(new Error("offline"), { code:"unavailable" }); };
  const refs = { daily:(id) => `d/${id}`, session:(id) => `s/${id}`, event:(id) => `e/${id}` };
  assert.equal((await syncTelemetryHistory({ history, refs, setDoc })).status, "retry");
  assert.deepEqual(history.acknowledgements, []);
  fail = false;
  assert.equal((await syncTelemetryHistory({ history, refs, setDoc })).status, "synced");
  assert.deepEqual(writes, ["d/2026-10-28", "d/2026-10-28", "e/same"]);
});

test("empty outbox performs no Firestore write", async () => {
  const history = historyWith({ days:[], sessions:[], events:[] });
  let writes = 0;
  const result = await syncTelemetryHistory({ history, refs:{}, setDoc:async () => { writes += 1; } });
  assert.equal(writes, 0);
  assert.equal(result.status, "idle");
});

test("permission-denied preserva outbox e identifica coleção e documento sem nova chamada", async () => {
  const pending = {
    days:[{ id:"2026-10-29", data:{ sequence:1 } }],
    sessions:[{ id:"session-1", data:{ sequence:1 } }],
    events:[{ id:"event-1", data:{ id:"event-1", expiresAtMs:2000 } }],
  };
  const history = historyWith(pending);
  let writes = 0;
  const result = await syncTelemetryHistory({
    history,
    refs:{ daily:(id) => `daily/${id}`, session:(id) => `session/${id}`, event:(id) => `event/${id}` },
    setDoc:async () => { writes += 1; throw Object.assign(new Error("denied"), { code:"permission-denied" }); },
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.failure, { collection:"telemetryDaily", documentId:"2026-10-29", code:"permission-denied", message:"denied" });
  assert.equal(writes, 1);
  assert.deepEqual(history.acknowledgements, []);
  assert.equal(history.pending(), pending);
});

test("blocked e retry não avançam cooldown; synced e idle avançam", () => {
  assert.equal(typeof telemetryHistorySync.shouldAdvanceTelemetryHistorySync, "function");
  const { shouldAdvanceTelemetryHistorySync } = telemetryHistorySync;
  assert.equal(shouldAdvanceTelemetryHistorySync({ status:"blocked" }), false);
  assert.equal(shouldAdvanceTelemetryHistorySync({ status:"retry" }), false);
  assert.equal(shouldAdvanceTelemetryHistorySync({ status:"synced" }), true);
  assert.equal(shouldAdvanceTelemetryHistorySync({ status:"idle" }), true);
});

test("reenvio após falha mantém IDs estáveis e não duplica documentos", async () => {
  const pending = {
    days:[{ id:"2026-10-29", data:{ sequence:1 } }],
    sessions:[{ id:"session-stable", data:{ sequence:1 } }],
    events:[{ id:"event-stable", data:{ id:"event-stable", expiresAtMs:2000 } }],
  };
  const history = historyWith(pending);
  const persisted = new Map();
  let available = false;
  const refs = { daily:(id) => `daily/${id}`, session:(id) => `session/${id}`, event:(id) => `event/${id}` };
  const setDoc = async (ref, data) => {
    if (!available) throw Object.assign(new Error("offline"), { code:"unavailable" });
    persisted.set(ref, data);
  };

  assert.equal((await syncTelemetryHistory({ history, refs, setDoc })).status, "retry");
  available = true;
  assert.equal((await syncTelemetryHistory({ history, refs, setDoc })).status, "synced");
  assert.deepEqual([...persisted.keys()], ["daily/2026-10-29", "session/session-stable", "event/event-stable"]);
  assert.deepEqual(history.acknowledgements, [{ days:["2026-10-29"], sessions:["session-stable"], events:["event-stable"] }]);
});

test("eventos pendentes respeitam intervalo mínimo entre sincronizações", () => {
  assert.equal(typeof telemetryHistorySync.shouldAttemptTelemetryHistorySync, "function");
  const { shouldAttemptTelemetryHistorySync } = telemetryHistorySync;
  assert.equal(shouldAttemptTelemetryHistorySync({ now:1_000, nextAttemptAt:0, hasPending:true }), true);
  assert.equal(shouldAttemptTelemetryHistorySync({ now:1_000, nextAttemptAt:1_001, hasPending:true }), false);
  assert.equal(shouldAttemptTelemetryHistorySync({ now:1_001, nextAttemptAt:1_001, hasPending:true }), true);
  assert.equal(shouldAttemptTelemetryHistorySync({ now:1_001, nextAttemptAt:0, hasPending:false }), false);
});

test("falhas transitórias e de permissão recebem backoff sem descartar o outbox", () => {
  assert.equal(typeof telemetryHistorySync.nextTelemetryHistorySyncState, "function");
  const { nextTelemetryHistorySyncState } = telemetryHistorySync;
  assert.deepEqual(nextTelemetryHistorySyncState({ status:"retry" }, { now:10_000, failureCount:0 }), {
    failureCount:1,
    nextAttemptAt:70_000,
  });
  assert.deepEqual(nextTelemetryHistorySyncState({ status:"retry" }, { now:70_000, failureCount:1 }), {
    failureCount:2,
    nextAttemptAt:190_000,
  });
  assert.deepEqual(nextTelemetryHistorySyncState({ status:"blocked" }, { now:10_000, failureCount:0 }), {
    failureCount:1,
    nextAttemptAt:910_000,
  });
  assert.deepEqual(nextTelemetryHistorySyncState({ status:"synced" }, { now:10_000, failureCount:4 }), {
    failureCount:0,
    nextAttemptAt:910_000,
  });
});
