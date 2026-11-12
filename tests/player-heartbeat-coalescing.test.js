import assert from "node:assert/strict";
import test from "node:test";

import { createCoalescedAsyncRunner } from "../src/coalesced-async-runner.js";

test("gatilhos concorrentes mantêm uma única execução e um único replay consolidado", async () => {
  let release;
  let calls = 0;
  const firstRun = new Promise((resolve) => { release = resolve; });
  const runner = createCoalescedAsyncRunner(async () => {
    calls += 1;
    if (calls === 1) await firstRun;
  });

  const initial = runner.request();
  runner.request();
  runner.request();
  assert.equal(calls, 1);

  release();
  await initial;
  assert.equal(calls, 2);
});

test("dispose impede replay e novos heartbeats após desmontagem", async () => {
  let release;
  let calls = 0;
  const firstRun = new Promise((resolve) => { release = resolve; });
  const runner = createCoalescedAsyncRunner(async () => {
    calls += 1;
    await firstRun;
  });

  const initial = runner.request();
  runner.request();
  runner.dispose();
  release();
  await initial;
  await runner.request();
  assert.equal(calls, 1);
});
