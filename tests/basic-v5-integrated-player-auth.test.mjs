import test from 'node:test';
import assert from 'node:assert/strict';
import { refreshIntegratedLabIdToken } from '../src/basic-v5-integrated-lab.js';

test('integrated LAB refreshes the current Player token exactly once after binding', async () => {
  const calls = [];
  const user = { getIdToken: async force => calls.push(force) };
  assert.equal(await refreshIntegratedLabIdToken({ enabled:true, user }), true);
  assert.deepEqual(calls, [true]);
});

test('ordinary modes never refresh through the LAB path', async () => {
  const calls = [];
  assert.equal(await refreshIntegratedLabIdToken({ enabled:false, user:{ getIdToken: async v => calls.push(v) } }), false);
  assert.deepEqual(calls, []);
});

test('missing authenticated user is a binding failure, not a silent bypass', async () => {
  await assert.rejects(refreshIntegratedLabIdToken({ enabled:true, user:null }), /authenticated/i);
});
