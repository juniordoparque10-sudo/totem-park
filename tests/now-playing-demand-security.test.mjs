import test from 'node:test';
import assert from 'node:assert/strict';
import { updateNowPlayingViewers, activeNowPlayingViewers } from '../src/now-playing-demand.js';
const now = 1763750000000;
test('usuario nao remove lease de outro observador', () => {
 const prior = { alice: now + 30000, bob: now + 20000 };
 const next = updateNowPlayingViewers(prior, 'alice', now, false);
 assert.equal(next.bob, prior.bob);
 assert.equal(Object.hasOwn(next,'alice'), false);
});
test('renovacao so modifica a propria chave', () => {
 const prior = { alice: now + 10000, bob: now + 20000 };
 const next = updateNowPlayingViewers(prior, 'alice', now, true);
 assert.equal(next.bob, prior.bob);
 assert.equal(next.alice, now + 75000);
 assert.deepEqual(activeNowPlayingViewers(next,now), ['alice','bob']);
});
