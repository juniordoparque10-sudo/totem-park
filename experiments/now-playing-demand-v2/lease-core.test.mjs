import test from 'node:test';
import assert from 'node:assert/strict';
import {LEASE_MS, activeLeases, makeLease, shouldRenew, isWatching} from './lease-core.mjs';
const now=1_000_000;
test('duas abas do mesmo UID tem leases independentes',()=>{
 const a=makeLease('owner_123456','tab_12345678',now);
 const b=makeLease('owner_123456','tab_87654321',now);
 assert.notEqual(a.tabId,b.tabId);
 assert.equal(activeLeases([a,b],now).length,2);
});
test('lease expira sem depender de delete',()=>{
 const a=makeLease('owner_123456','tab_12345678',now);
 assert.equal(activeLeases([a],now+LEASE_MS+1).length,0);
});
test('renovacao so quando necessaria',()=>{
 const a=makeLease('owner_123456','tab_12345678',now);
 assert.equal(shouldRenew(a,now+1000),false);
 assert.equal(shouldRenew(a,now+46000),true);
});
test('inatividade do cliente e visibilidade',()=>{
 assert.equal(isWatching({visible:true,lastActivityAt:now,now:now+301000}),false);
 assert.equal(isWatching({visible:false,lastActivityAt:now,now:now+1000,masterKeepVisible:true}),false);
 assert.equal(isWatching({visible:true,lastActivityAt:now,now:now+301000,masterKeepVisible:true}),true);
});
test('futuro excessivo nao e considerado ativo',()=>{
 assert.equal(activeLeases([{ownerUid:'owner_123456',tabId:'tab_12345678',expiresAtMs:now+500000}],now).length,0);
});
