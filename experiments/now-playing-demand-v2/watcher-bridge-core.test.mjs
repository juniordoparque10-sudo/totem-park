import test from 'node:test';
import assert from 'node:assert/strict';
import { activeWatchers, createWatcherSession, leaseData, watcherId } from './watcher-bridge-core.mjs';
const uid='owner_12345678', t1='tab_12345678', t2='tab_87654321';
function lab(extra={}) {
 let now=100000, scheduled, cancelled=false;
 const docs=new Map(), operations=[];
 const session= createWatcherSession({uid,tabId:t1,clock:()=>now,
  schedule: fn => {scheduled=fn;return 3;},cancel:()=>{cancelled=true;},
  write: async(id,data)=>{docs.set(id,data);operations.push(['write',id]);},
  remove: async id=>{docs.delete(id);operations.push(['remove',id]);},...extra});
 return {session,docs,operations,tick:()=>scheduled(),advance:ms=>{now+=ms;},get now(){return now;},get cancelled(){return cancelled;}};
}
test('UID + tab ID produce two separate keys',()=>{
 assert.notEqual(watcherId(uid,t1),watcherId(uid,t2));
 assert.deepEqual(leaseData(uid,t1,100000),{ownerUid:uid,tabId:t1,expiresAtMs:175000});
});
test('idle TV produces no writes until explicitly opened', async()=>{
 const l=lab(); assert.equal(l.operations.length,0); await l.session.stop();
 assert.equal(l.operations.length,0);
});
test('open renew hide and close affect only own lease', async()=>{
 const l=lab(); l.docs.set(watcherId(uid,t2),leaseData(uid,t2,l.now));
 await l.session.start(); assert.equal(l.docs.size,2);
 l.advance(30000); await l.tick(); assert.equal(l.docs.size,2);
 await l.session.setVisible(false); assert.equal(l.docs.size,1);
 await l.session.stop(); assert.equal(l.docs.size,1);
 assert.ok(l.cancelled);
});
test('idle expiry removes watcher but does not change other tabs', async()=>{
 const l=lab(); await l.session.start(); l.advance(300001); await l.tick();
 assert.equal(l.docs.size,0); assert.equal(l.session.isActive(),false);
 await l.session.activity(); assert.equal(l.docs.size,1);
 await l.session.stop();
});
test('expired entries excluded without Firestore updates',()=>{
 const items=[leaseData(uid,t1,100000),leaseData(uid,t2,0)];
 assert.deepEqual(activeWatchers(items,100000).map(x=>x.tabId),[t1]);
 assert.equal(activeWatchers(items,200000).length,0);
});
test('stopping while write is in flight does not recreate the watcher', async()=>{
 let release;
 const writes=[];
 const l=lab({write:async id=>{writes.push(id);await new Promise(r=>{release=r;});}});
 const start=l.session.start();
 for (let i=0; i<10 && !release; i++) await Promise.resolve(); // wait until write begins
 assert.equal(typeof release, "function");
 const stop=l.session.stop();
 release(); await Promise.all([start,stop]);
 assert.equal(l.docs.size,0); assert.ok(l.operations.some(x=>x[0]==='remove'));
});
test('invalid IDs rejected before any Firestore call',()=>{
 assert.throws(()=>watcherId('bad uid',t1));
 assert.throws(()=>watcherId(uid,'short'));
});
test('write failure is reported and session is not considered active', async()=>{
 const failures=[];
 const l=lab({write:async()=>{throw Object.assign(new Error('offline'),{code:'unavailable'});},report:error=>failures.push(error)});
 await l.session.start();
 assert.equal(l.session.isActive(),false);
 assert.equal(failures.length,1);
 assert.equal(failures[0].code,'unavailable');
 await l.session.stop();
 assert.equal(l.operations.length,0);
});
