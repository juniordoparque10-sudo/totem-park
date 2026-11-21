import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collectionGroup, query, where, updateDoc, deleteDoc } from 'firebase/firestore';

const projectId = 'demo-totem-basic-v5-combined-matrix';
const root = 'clients/client-v5/screens/tv-v5/nowPlayingWatchers';
const tab1 = 'tab_12345678', tab2 = 'tab_87654321';
const lease = (uid, tab, expiresAtMs = Date.now()+75000, clientId='client-v5', screenId='tv-v5') => ({ownerUid:uid,tabId:tab,expiresAtMs,clientId,screenId});
let env;
const labClaims = {
  owner_12345678: {clientId:'client-v5',role:'clientOwner'},
  colleague_12345: {clientId:'client-v5',role:'clientOwner'},
  outsider_12345: {clientId:'other-v5',role:'clientOwner'},
  player_12345678: {clientId:'client-v5',screenId:'tv-v5',role:'player'},
  wrong_player: {clientId:'client-v5',screenId:'other-tv',role:'player'},
  inactive_player: {clientId:'client-v5',screenId:'inactive-tv',role:'player'},
  master_12345: {clientId:'client-v5',role:'master'}
};
const asUser = (uid) => env.authenticatedContext(uid,labClaims[uid] || {}).firestore();
const ref = (db, uid, tab) => doc(db,root,uid,'tabs',tab);
const watcherQuery = (db, clientId='client-v5', screenId='tv-v5') => query(
  collectionGroup(db,'tabs'), where('clientId','==',clientId), where('screenId','==',screenId)
);
const diagnostics=[];
async function denied(promise,label) {
  try {await promise; assert.fail(label+': ACESSO INDEVIDAMENTE PERMITIDO');}
  catch(error) {
    if (error?.code === 'ERR_ASSERTION') throw error;
    assert.equal(error?.code,'permission-denied',label+': código inesperado');
    const msg=String(error?.message);
    assert.doesNotMatch(msg,/1000 expressions|maximum of 1000/i,label+': estouro da avaliacao');
    diagnostics.push({label, code:error?.code, evaluationError:/evaluation error/i.test(msg)});
  }
}
before(async()=>{
  env = await initializeTestEnvironment({projectId,firestore:{rules:await fs.readFile('experiments/now-playing-demand-v2/firestore.binding-flat-integrated-lab-v5-guard-binding-owner.rules','utf8')}});
  await env.withSecurityRulesDisabled(async ctx=>{
    const db = ctx.firestore();
    await setDoc(doc(db,'clients/client-v5'),{uid:'owner_12345678',email:'owner@example.test',accountStatus:'active',lifecycleStatus:'active'});
    await setDoc(doc(db,'clients/other-v5'),{uid:'other_owner',accountStatus:'active',lifecycleStatus:'active'});
    await setDoc(doc(db,'clients/client-v5/screens/tv-v5'),{connectedAuthUid:'player_12345678'});
    await setDoc(doc(db,'clients/client-v5/screens/other-tv'),{connectedAuthUid:'other_screen_player'});
    await setDoc(doc(db,'settings/masterAccess'),{emails:['master@example.test']});
    await setDoc(doc(db,'playerDeviceBindings/player_12345678'),{uid:'player_12345678',status:'ACTIVE',clientId:'client-v5',screenId:'tv-v5',deviceId:'deviceA'});
    await setDoc(doc(db,'playerDeviceBindings/wrong_player'),{uid:'wrong_player',status:'ACTIVE',clientId:'client-v5',screenId:'other-tv',deviceId:'deviceB'});
    await setDoc(doc(db,'playerDeviceBindings/inactive_player'),{uid:'inactive_player',status:'INACTIVE',clientId:'client-v5',screenId:'tv-v5',deviceId:'deviceC'});
  });
});
after(async()=>{
  console.log('\n=== MATRIZ DE NEGATIVAS ===');
  for (const entry of diagnostics) console.log(JSON.stringify(entry));
  console.log('Negativas permission-denied: '+diagnostics.length+'; evaluation error: '+diagnostics.filter(x=>x.evaluationError).length);
  await env?.cleanup();
});
test('proprietário abre duas abas independentes',async()=>{
  const db=asUser('owner_12345678','owner@example.test');
  await assertSucceeds(setDoc(ref(db,'owner_12345678',tab1),lease('owner_12345678',tab1)));
  await assertSucceeds(setDoc(ref(db,'owner_12345678',tab2),lease('owner_12345678',tab2)));
  assert.equal((await getDoc(ref(db,'owner_12345678',tab1))).exists(),true);
});
test('proprietário renova e exclui somente a aba própria',async()=>{
 const db=asUser('owner_12345678','owner@example.test');
 await assertSucceeds(updateDoc(ref(db,'owner_12345678',tab1),{expiresAtMs:Date.now()+75000}));
 await assertSucceeds(deleteDoc(ref(db,'owner_12345678',tab1)));
 assert.equal((await getDoc(ref(db,'owner_12345678',tab2))).exists(),true);
});
test('usuário externo não lê nem escreve',async()=>{
 const db=asUser('outsider_12345','outside@example.test');
 await denied(getDoc(ref(db,'owner_12345678',tab2)),'get externo');
 await denied(setDoc(ref(db,'outsider_12345','tab_44444444'),lease('outsider_12345','tab_44444444')),'create externo');
 await denied(getDocs(watcherQuery(db)),'list externo');
});
test('outro usuário do mesmo cliente não lê lease de titular',async()=>{
 const db=asUser('colleague_12345','owner@example.test');
 await denied(getDoc(ref(db,'owner_12345678',tab2)),'get colega');
 await denied(deleteDoc(ref(db,'owner_12345678',tab2)),'delete colega');
});
test('outro usuário não cria lease em nome do dono',async()=>{
 const db=asUser('colleague_12345','owner@example.test');
 await denied(setDoc(ref(db,'owner_12345678','tab_33333333'),lease('owner_12345678','tab_33333333')),'create suplantando titular');
});
test('payload falsificado e prazos inválidos bloqueados',async()=>{
 const db=asUser('owner_12345678','owner@example.test');
 await denied(setDoc(ref(db,'owner_12345678','tab_33333333'),lease('other_uid','tab_33333333')),'ownerUid falso');
 await denied(setDoc(ref(db,'owner_12345678','tab_33333333'),lease('owner_12345678','outro_tab')),'tabId falso');
 await denied(setDoc(ref(db,'owner_12345678','tab_33333333'),lease('owner_12345678','tab_33333333',Date.now()-2000)),'expirado');
 await denied(setDoc(ref(db,'owner_12345678','tab_33333333'),lease('owner_12345678','tab_33333333',Date.now()+500000)),'prazo longo');
});
test('Player vinculado lista e lê apenas TV correta',async()=>{
 const db=asUser('player_12345678');
 const snap=await assertSucceeds(getDocs(watcherQuery(db)));
 assert.ok(snap.size>=1);
 await assertSucceeds(getDoc(ref(db,'owner_12345678',tab2)));
 await denied(getDocs(watcherQuery(db,'client-v5','other-tv')),'TV alheia');
});
test('Player vinculado não escreve nem exclui',async()=>{
 const db=asUser('player_12345678');
 await denied(setDoc(ref(db,'player_12345678','tab_33333333'),lease('player_12345678','tab_33333333')),'player create');
 await denied(deleteDoc(ref(db,'owner_12345678',tab2)),'player delete');
});
test('vínculo de outra tela não autoriza listagem',async()=>{
 const db=asUser('wrong_player');
 await denied(getDocs(watcherQuery(db)),'Player outra TV');
});
test('vínculo inativo não autoriza listagem',async()=>{
 const db=asUser('inactive_player');
 await denied(getDocs(watcherQuery(db)),'Player inativo');
});
test('Master autorizado pode listar e não forja proprietário',async()=>{
 const db=asUser('master_12345','master@example.test');
 await assertSucceeds(getDocs(watcherQuery(db)));
 await denied(setDoc(ref(db,'owner_12345678','tab_44444444'),lease('owner_12345678','tab_44444444')),'Master suplantando dono');
});
test('sem login não pode listar',async()=>{
 const db=env.unauthenticatedContext().firestore();
 await denied(getDocs(watcherQuery(db)),'anônimo');
});

import testV4 from 'node:test';
import assertV4 from 'node:assert/strict';
testV4('V4: nenhum evaluation error na matriz', () => {
  assertV4.equal(diagnostics.filter(x => x.evaluationError).length, 0, 'evaluation errors remanescentes');
});
