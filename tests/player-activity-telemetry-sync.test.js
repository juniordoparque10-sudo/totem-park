import assert from "node:assert/strict";
import test from "node:test";

import { PLAYER_ACTIVITY_SYNC_ENABLED, syncPlayerActivityBatch } from "../src/player-activity-telemetry.js";

const events = [{ id:"s1:1:1", screenId:"s1", type:"PLAYBACK_START", state:"ACTIVE", atMs:1, mediaId:"m1", mediaType:"video", reason:"" }];

test("production sync is enabled only with the bound Rules contract", () => {
  assert.equal(PLAYER_ACTIVITY_SYNC_ENABLED, true);
});

test("empty outbox performs no write", async () => {
  let writes = 0;
  const result = await syncPlayerActivityBatch({ screenRef:{}, events:[], updateDoc:async () => { writes += 1; } });
  assert.deepEqual(result, { status:"synced", acknowledgedIds:[] });
  assert.equal(writes, 0);
});

test("bounded batch writes only sanitized activity and acknowledges confirmed ids", async () => {
  let payload;
  const result = await syncPlayerActivityBatch({ screenRef:{ path:"screen" }, events, updateDoc:async (_ref, value) => { payload = value; } });
  assert.equal(result.status, "synced");
  assert.deepEqual(result.acknowledgedIds, ["s1:1:1"]);
  assert.deepEqual(payload["telemetry.activity"].events, events.map((event) => ({ ...event, sessionId:"", domain:"playback" })));
  assert.equal(payload["telemetry.activity"].schemaVersion, 1);
});

test("sync preserves prior server history while acknowledging only the local outbox", async () => {
  let payload;
  const prior = [{ ...events[0], id:"s1:0:1", atMs:0 }];
  const result = await syncPlayerActivityBatch({ screenRef:{}, existingEvents:prior, events, updateDoc:async (_ref, value) => { payload = value; } });
  assert.deepEqual(payload["telemetry.activity"].events.map((event) => event.id), ["s1:0:1", "s1:1:1"]);
  assert.deepEqual(result.acknowledgedIds, ["s1:1:1"]);
});

test("network failure retries while permission denial blocks without acknowledgement", async () => {
  const retry = await syncPlayerActivityBatch({ screenRef:{}, events, updateDoc:async () => { throw { code:"unavailable" }; } });
  const blocked = await syncPlayerActivityBatch({ screenRef:{}, events, updateDoc:async () => { throw { code:"permission-denied" }; } });
  assert.deepEqual(retry, { status:"retry", acknowledgedIds:[] });
  assert.deepEqual(blocked, { status:"blocked", acknowledgedIds:[] });
});
