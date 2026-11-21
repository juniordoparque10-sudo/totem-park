import test from 'node:test';
import assert from 'node:assert/strict';
import {activeNowPlayingViewers, hasNowPlayingDemand, updateNowPlayingViewers} from '../src/now-playing-demand.js';
const now = 1000000;
const a = 'viewer_123456789', b = 'viewer_987654321';
test('somente observadores ativos e de prazo curto ativam as gravacoes', () => {
  assert.deepEqual(activeNowPlayingViewers({[a]: now+75000,[b]:now-1,"bad!id":now+75000},now),[a]);
  assert.equal(hasNowPlayingDemand({[a]:now+75000},now),true);
  assert.equal(hasNowPlayingDemand({[a]:now+75000},now+75000),false);
  assert.equal(hasNowPlayingDemand({[a]:now+75000*10},now),false);
});
test('observadores simultaneos nao se sobrescrevem', () => {
  const first = updateNowPlayingViewers({},a,now,true);
  const both = updateNowPlayingViewers(first,b,now+100,true);
  assert.deepEqual(activeNowPlayingViewers(both,now+100),[a,b]);
  const remaining = updateNowPlayingViewers(both,a,now+200,false);
  assert.deepEqual(activeNowPlayingViewers(remaining,now+200),[b]);
});
test('renovacao reativa e fechamento sem mudar estado de outras TVs', () => {
  const state=updateNowPlayingViewers({[a]:now+1000},a,now+500,true);
  assert.equal(state[a],now+500+75000);
  assert.deepEqual(updateNowPlayingViewers(state,a,now+600,false),{});
});
