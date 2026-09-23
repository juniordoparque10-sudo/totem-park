import assert from 'node:assert/strict';
import {usePersistentFirestoreCache as persistent} from '../src/firestore-cache-policy.js';
assert.equal(persistent(),false);
assert.equal(persistent({pathname:'/'}),false);
assert.equal(persistent({native:true}),true);
assert.equal(persistent({mode:'player'}),true);
assert.equal(persistent({mode:'playerTest'}),true);
for(const pathname of ['/tv','/player/eco/tv1','/orientacao'])assert.equal(persistent({pathname}),true);
console.log('PASS: web manager starts fresh; native manager and TV/player retain persistence');
