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

test("rejeição da execução ativa não descarta o replay já solicitado", async () => {
  let release;
  let calls = 0;
  const firstRun = new Promise((resolve) => { release = resolve; });
  const runner = createCoalescedAsyncRunner(async () => {
    calls += 1;
    if (calls === 1) {
      await firstRun;
      throw new Error("network failed");
    }
  });

  const initial = runner.request();
  runner.request();
  release();

  await assert.rejects(initial, /network failed/);
  assert.equal(calls, 2);
});
