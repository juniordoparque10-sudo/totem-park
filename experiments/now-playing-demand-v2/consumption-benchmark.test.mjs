import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, collection, setDoc, updateDoc, getDoc, getDocs, runTransaction, onSnapshot, deleteDoc } from 'firebase/firestore';

// BENCHMARK OPERACIONAL ISOLADO: regras permissivas apenas neste projeto do emulador.
// Nao comprova autorizacao nem fornece contagem de leituras faturaveis Firebase.
const projectId = 'demo-totem-v5-consumption-lab';
const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: { rules: "rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{path=**} { allow read, write: if true; } } }" },
});
after(async () => testEnv.cleanup());
const db = testEnv.unauthenticatedContext().firestore();
const TICKS = [0,25,50,75];
const LEASE_TIMES = [0,30,60,90];
const NUM_RENEWS = LEASE_TIMES.length;
function counter() { return { mainWrites:0, watcherWrites:0, transactionReads:0, screenSnapshots:0, watcherSnapshots:0 }; }
async function eventually(predicate, label) {
  const limit = Date.now() + 3000;
  while (!predicate() && Date.now() < limit) await new Promise(r => setTimeout(r, 12));
  assert.ok(predicate(), `Timeout esperando snapshot: ${label}`);
}
async function runScenario(architecture, tabs) {
  const id = `${architecture}-${tabs}`;
  const screenRef = doc(db,'labConsume',id,'screens','screenA');
  const watchers = collection(screenRef,'nowPlayingWatchers');
  const measurements = counter();
  await setDoc(screenRef,{status:'online',heartbeatTick:-1});
  const unsubs = [];
  let screenSeenInitial=false;
  let watcherSeenInitial=false;
  unsubs.push(onSnapshot(screenRef, () => { if (screenSeenInitial) measurements.screenSnapshots++; else screenSeenInitial=true; }));
  unsubs.push(onSnapshot(watchers, () => { if (watcherSeenInitial) measurements.watcherSnapshots++; else watcherSeenInitial=true; }));
  try {
    await eventually(() => screenSeenInitial && watcherSeenInitial, 'listeners iniciais');
    // Mesmo calendario virtual para ambas as arquiteturas. Nenhuma espera de 90 segundos.
    const events = [
      ...TICKS.map(t=>({t,kind:'heartbeat'})),
      ...LEASE_TIMES.flatMap(t=>Array.from({length:tabs},(_,tab)=>({t,kind:'lease',tab}))),
    ].sort((a,b)=>a.t-b.t || (a.kind==='heartbeat'?-1:1));
    for (const event of events) {
      const beforeScreen = measurements.screenSnapshots;
      const beforeWatch = measurements.watcherSnapshots;
      if (event.kind==='heartbeat') {
        await updateDoc(screenRef,{heartbeatTick:event.t});
        measurements.mainWrites++;
        await eventually(()=>measurements.screenSnapshots>beforeScreen, `heartbeat ${event.t}`);
      } else if (architecture==='antiga') {
        await runTransaction(db,async tx=>{
          const snapshot=await tx.get(screenRef);
          measurements.transactionReads++;
          const prior=snapshot.data()?.nowPlayingDemandViewers || {};
          tx.update(screenRef,{nowPlayingDemandViewers:{...prior,[`uid_tab${event.tab}`]:event.t*1000+75000}});
        });
        measurements.mainWrites++;
        await eventually(()=>measurements.screenSnapshots>beforeScreen, `lease antiga ${event.t}/${event.tab}`);
      } else {
        const leaseRef=doc(watchers,`uid__tab_${String(event.tab).padStart(8,'0')}`);
        await setDoc(leaseRef,{ownerUid:'uid',tabId:`tab_${String(event.tab).padStart(8,'0')}`,expiresAtMs:event.t*1000+75000});
        measurements.watcherWrites++;
        await eventually(()=>measurements.watcherSnapshots>beforeWatch, `lease isolada ${event.t}/${event.tab}`);
        assert.equal(measurements.screenSnapshots,beforeScreen,'Renovacao isolada nao deve alterar snapshot do documento principal');
      }
    }
    const data=(await getDoc(screenRef)).data();
    assert.equal(data.heartbeatTick,75);
    if (architecture==='nova') {
      assert.equal((await getDocs(watchers)).size,tabs);
      assert.equal(measurements.screenSnapshots,TICKS.length);
    } else {
      assert.equal(Object.keys(data.nowPlayingDemandViewers||{}).length,tabs);
      assert.equal(measurements.screenSnapshots,TICKS.length + tabs*NUM_RENEWS);
    }
    return measurements;
  } finally { for (const unsub of unsubs) unsub(); }
}

test('BASIC V5: comparar atualizacoes da TV com 0, 1 e 2 abas (emulador)', async () => {
  console.log('\n=== MATRIZ OPERACIONAL DE CONSUMO - EMULADOR ===');
  console.log('90 segundos simulados; heartbeat 0/25/50/75; solicitacoes 0/30/60/90; sem cobranca real');
  for (const tabs of [0,1,2]) {
    const antiga=await runScenario('antiga',tabs);
    const nova=await runScenario('nova',tabs);
    const expectedOld=TICKS.length + tabs*NUM_RENEWS;
    assert.equal(antiga.mainWrites,expectedOld);
    assert.equal(nova.mainWrites,TICKS.length);
    assert.equal(nova.watcherWrites,tabs*NUM_RENEWS);
    assert.equal(antiga.transactionReads,tabs*NUM_RENEWS);
    assert.equal(nova.transactionReads,0);
    console.log(JSON.stringify({abas:tabs,antiga,nova,documentoTV_snapshot_reducao:antiga.screenSnapshots-nova.screenSnapshots}));
  }
  console.log('OBS: contagens representam chamadas instrumentadas e eventos de snapshots, NAO leituras/gravações faturadas.');
});
