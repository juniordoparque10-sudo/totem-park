import assert from "node:assert/strict";
import test from "node:test";

import { syncTelemetryHistory } from "../src/telemetry-history-sync.js";

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
