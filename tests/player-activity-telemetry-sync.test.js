import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAYER_ACTIVITY_SYNC_ENABLED,
  buildPlayerActivityBatch,
  syncPlayerActivityBatch,
  syncPlayerActivityBatchDocument,
  syncPlayerActivityBatchDocuments,
} from "../src/player-activity-telemetry.js";

const events = [{ id:"s1:1:1", screenId:"s1", type:"PLAYBACK_START", state:"ACTIVE", atMs:1, mediaId:"m1", mediaType:"video", reason:"" }];
const arrayUnion = (...values) => ({ operation:"arrayUnion", values });

test("production sync is enabled only with the bound Rules contract", () => {
  assert.equal(PLAYER_ACTIVITY_SYNC_ENABLED, true);
});

test("empty outbox performs no write", async () => {
  let writes = 0;
  const result = await syncPlayerActivityBatch({ screenRef:{}, events:[], updateDoc:async () => { writes += 1; } });
  assert.deepEqual(result, { status:"synced", acknowledgedIds:[] });
  assert.equal(writes, 0);
});

test("bounded batch sends only sanitized new events through arrayUnion", async () => {
  let payload;
  const result = await syncPlayerActivityBatch({ screenRef:{ path:"screen" }, events, arrayUnion, updateDoc:async (_ref, value) => { payload = value; } });
  assert.equal(result.status, "synced");
  assert.deepEqual(result.acknowledgedIds, ["s1:1:1"]);
  assert.deepEqual(payload["telemetry.activity.events"], {
    operation:"arrayUnion",
    values:events.map((event) => ({ ...event, sessionId:"", domain:"playback" })),
  });
  assert.equal(payload["telemetry.activity.schemaVersion"], 1);
  assert.equal("telemetry.activity" in payload, false);
});

test("sync excludes existing ids and acknowledges a retried event without another write", async () => {
  let payload;
  let writes = 0;
  const prior = [{ ...events[0], sessionId:"", domain:"playback" }];
  const result = await syncPlayerActivityBatch({
    screenRef:{}, existingEvents:prior, events, arrayUnion,
    updateDoc:async (_ref, value) => { writes += 1; payload = value; },
  });
  assert.equal(payload, undefined);
  assert.equal(writes, 0);
  assert.deepEqual(result.acknowledgedIds, ["s1:1:1"]);
});

test("sync compacts once to the 150 newest unique events when 200 would overflow", async () => {
  const prior = Array.from({ length:200 }, (_, index) => ({
    ...events[0], id:`s1:${index + 1}:1`, atMs:index + 1, sessionId:"session", domain:"playback",
  }));
  const next = Array.from({ length:3 }, (_, index) => ({
    ...events[0], id:`s1:${201 + index}:1`, atMs:201 + index, sessionId:"session",
  }));
  let payload;
  const concurrent = { ...events[0], id:"s1:204:1", atMs:204, sessionId:"session", domain:"playback" };
  const result = await syncPlayerActivityBatch({
    screenRef:{}, existingEvents:prior, events:next, arrayUnion,
    runTransaction:async (operation) => operation({
      get:async () => ({ data:() => ({ telemetry:{ activity:{ events:[...prior, concurrent] } } }) }),
      update:(_ref, value) => { payload = value; },
    }),
    updateDoc:async () => assert.fail("overflow compaction must use a transaction"),
  });

  assert.equal(result.status, "synced");
  assert.equal(payload["telemetry.activity"].events.length, 150);
  assert.equal(payload["telemetry.activity"].events[0].id, "s1:55:1");
  assert.equal(payload["telemetry.activity"].events.at(-1).id, "s1:204:1");
  assert.deepEqual(result.acknowledgedIds, next.map((event) => event.id));
});

test("sync resumes delta writes after compaction instead of resending the compacted history", async () => {
  const prior = Array.from({ length:150 }, (_, index) => ({
    ...events[0], id:`s1:${index + 54}:1`, atMs:index + 54, sessionId:"session", domain:"playback",
  }));
  const next = [{ ...events[0], id:"s1:204:1", atMs:204, sessionId:"session" }];
  let payload;
  await syncPlayerActivityBatch({
    screenRef:{}, existingEvents:prior, events:next, arrayUnion,
    updateDoc:async (_ref, value) => { payload = value; },
  });

  assert.equal("telemetry.activity" in payload, false);
  assert.deepEqual(payload["telemetry.activity.events"].values.map((event) => event.id), ["s1:204:1"]);
});

test("network failure retries while permission denial blocks without acknowledgement", async () => {
  const retry = await syncPlayerActivityBatch({ screenRef:{}, events, arrayUnion, updateDoc:async () => { throw { code:"unavailable" }; } });
  const blocked = await syncPlayerActivityBatch({ screenRef:{}, events, arrayUnion, updateDoc:async () => { throw { code:"permission-denied" }; } });
  assert.deepEqual(retry, { status:"retry", acknowledgedIds:[] });
  assert.deepEqual(blocked, { status:"blocked", acknowledgedIds:[] });
});

test("incremental batch has deterministic identity and chronological unique events", () => {
  const duplicate = { ...events[0], sessionId:"session-1" };
  const later = { ...duplicate, id:"s1:2:2", atMs:2, type:"PLAYBACK_END", state:"IDLE" };
  const batch = buildPlayerActivityBatch({
    clientId:"c1", screenId:"s1", deviceId:"d1", events:[later, duplicate, duplicate],
  });

  assert.equal(batch.id, buildPlayerActivityBatch({
    clientId:"c1", screenId:"s1", deviceId:"d1", events:[duplicate, later],
  }).id);
  assert.deepEqual(batch.data.events.map((event) => event.id), ["s1:1:1", "s1:2:2"]);
  assert.equal(batch.data.eventCount, 2);
  assert.equal(batch.data.firstAtMs, 1);
  assert.equal(batch.data.lastAtMs, 2);
  assert.deepEqual(batch.acknowledgedIds, ["s1:1:1", "s1:2:2"]);
});

test("incremental sync writes one deterministic document and acknowledges only that batch", async () => {
  const writes = [];
  const result = await syncPlayerActivityBatchDocument({
    clientId:"c1", screenId:"s1", deviceId:"d1", events,
    refForBatch:(id) => ({ path:`batches/${id}` }),
    setDoc:async (reference, value) => writes.push({ reference, value }),
  });

  assert.equal(result.status, "synced");
  assert.deepEqual(result.acknowledgedIds, ["s1:1:1"]);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].reference.path, `batches/${result.batchId}`);
  assert.deepEqual(writes[0].value.events.map((event) => event.id), ["s1:1:1"]);
  assert.equal("telemetry" in writes[0].value, false);
});

test("incremental retry uses the same document id and failed writes preserve the outbox", async () => {
  const ids = [];
  const attempt = () => syncPlayerActivityBatchDocument({
    clientId:"c1", screenId:"s1", deviceId:"d1", events,
    refForBatch:(id) => { ids.push(id); return { id }; },
    setDoc:async () => { throw { code:"unavailable" }; },
  });

  const first = await attempt();
  const second = await attempt();
  assert.deepEqual(first, { status:"retry", acknowledgedIds:[], batchId:ids[0] });
  assert.deepEqual(second, { status:"retry", acknowledgedIds:[], batchId:ids[0] });
  assert.equal(ids[0], ids[1]);
});

test("incremental batching rejects mixed-screen events without acknowledging them", async () => {
  let writes = 0;
  const result = await syncPlayerActivityBatchDocument({
    clientId:"c1", screenId:"s1", deviceId:"d1",
    events:[events[0], { ...events[0], id:"s2:2:1", screenId:"s2", atMs:2 }],
    refForBatch:() => ({}),
    setDoc:async () => { writes += 1; },
  });
  assert.deepEqual(result, { status:"blocked", acknowledgedIds:[] });
  assert.equal(writes, 0);
});

test("empty incremental outbox performs no write", async () => {
  let writes = 0;
  const result = await syncPlayerActivityBatchDocument({
    clientId:"c1", screenId:"s1", deviceId:"d1", events:[],
    refForBatch:() => ({}), setDoc:async () => { writes += 1; },
  });
  assert.deepEqual(result, { status:"synced", acknowledgedIds:[] });
  assert.equal(writes, 0);
});

test("incremental batch is capped at three events for complete Rules validation", () => {
  const many = Array.from({ length:12 }, (_, index) => ({
    ...events[0], id:`s1:${index + 1}:${index + 1}`, atMs:index + 1,
  }));
  const batch = buildPlayerActivityBatch({ clientId:"c1", screenId:"s1", deviceId:"d1", events:many });
  assert.equal(batch.data.eventCount, 3);
  assert.equal(batch.acknowledgedIds.length, 3);
  assert.equal(batch.data.events.at(-1).id, "s1:3:3");
});

test("one atomic cycle drains twenty pending events into deterministic documents", async () => {
  const many = Array.from({ length:20 }, (_, index) => ({
    ...events[0], id:`s1:${index + 1}:${index + 1}`, atMs:index + 1,
  }));
  const commits = [];
  const result = await syncPlayerActivityBatchDocuments({
    clientId:"c1", screenId:"s1", deviceId:"d1", events:many,
    refForBatch:(id) => ({ id }),
    commitBatch:async (writes) => commits.push(writes),
  });
  assert.equal(result.status, "synced");
  assert.equal(result.acknowledgedIds.length, 20);
  assert.equal(commits.length, 1);
  assert.equal(commits[0].length, 7);
  assert.deepEqual(commits[0].map((write) => write.data.eventCount), [3, 3, 3, 3, 3, 3, 2]);
});

test("failed atomic multi-document commit acknowledges nothing and retries the same ids", async () => {
  const many = Array.from({ length:8 }, (_, index) => ({
    ...events[0], id:`s1:${index + 1}:${index + 1}`, atMs:index + 1,
  }));
  const attempts = [];
  const attempt = () => syncPlayerActivityBatchDocuments({
    clientId:"c1", screenId:"s1", deviceId:"d1", events:many,
    refForBatch:(id) => ({ id }),
    commitBatch:async (writes) => { attempts.push(writes.map((write) => write.reference.id)); throw { code:"unavailable" }; },
  });
  assert.deepEqual((await attempt()).acknowledgedIds, []);
  assert.deepEqual((await attempt()).acknowledgedIds, []);
  assert.deepEqual(attempts[0], attempts[1]);
});
