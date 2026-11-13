import assert from 'node:assert/strict';
import {
  getFirestoreTabMode,
  shouldUsePersistentFirestoreCache as persistent,
} from '../src/firestore-cache-policy.js';
assert.equal(persistent(),false);
assert.equal(persistent({pathname:'/'}),false);
assert.equal(persistent({native:true}),true);
assert.equal(persistent({mode:'player'}),true);
assert.equal(persistent({mode:'playerTest'}),true);
for(const pathname of ['/tv','/player/eco/tv1','/orientacao'])assert.equal(persistent({pathname}),true);
assert.equal(getFirestoreTabMode({native:true,mode:'playerRc'}),'single');
assert.equal(getFirestoreTabMode({native:true,mode:'player'}),'single');
assert.equal(getFirestoreTabMode({native:true,mode:'web'}),'multiple');
assert.equal(getFirestoreTabMode({native:false,mode:'playerRc'}),'multiple');
assert.equal(getFirestoreTabMode({native:false,mode:'web'}),'multiple');
console.log('PASS: web manager starts fresh; native manager and TV/player retain persistence');
