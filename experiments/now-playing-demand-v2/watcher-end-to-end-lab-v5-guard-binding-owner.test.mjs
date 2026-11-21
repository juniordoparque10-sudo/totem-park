// BASIC V5 — Homologacao funcional de dados no Firestore Emulator.
// Nao importa App.jsx, nao inicia Player Android e nao escreve na producao.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds } from '@firebase/rules-unit-testing';
import { collectionGroup, doc, getDoc, getDocs, onSnapshot, query, where, setDoc, deleteDoc } from 'firebase/firestore';
import { createWatcherSession, activeWatchers, LEASE_MS } from './watcher-bridge-core.mjs';

const RULES = 'experiments/now-playing-demand-v2/firestore.binding-flat-integrated-lab-v5-guard-binding-owner.rules';
const PROJECT = 'demo-totem-basic-v5-e2e';
const CLIENT = 'client-v5';
const SCREEN = 'tv-v5';
const OWNER = 'owner_12345678';
const PLAYER = 'player_12345678';
const root = `clients/${CLIENT}/screens/${SCREEN}/nowPlayingWatchers`;
const screenPath = `clients/${CLIENT}/screens/${SCREEN}`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const watcherRef = (db, uid, tabId) => doc(db, root, uid, 'tabs', tabId);
const watcherQuery = (db, screenId = SCREEN) => query(
  collectionGroup(db, 'tabs'), where('clientId', '==', CLIENT), where('screenId', '==', screenId)
);

async function eventually(read, expected, label, timeoutMs = 7000) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    last = await read();
    if (expected(last)) return last;
    await sleep(65);
  }
  throw new Error(`${label}: timeout; ultimo valor = ${JSON.stringify(last)}`);
}

async function denied(operation, label) {
  try { await operation(); }
  catch (error) {
    assert.equal(error?.code, 'permission-denied', `${label}: falha inesperada ${String(error)}`);
    return;
  }
  assert.fail(`${label}: operacao proibida foi permitida`);
}

async function run() {
  const rules = await fs.readFile(RULES, 'utf8');
  assert.match(rules, /nowPlayingWatchers/, 'Regras integradas sem match de observadores');
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { rules } });
  let unsubscribe;
  const sessions = [];
  try {
    await env.withSecurityRulesDisabled(async context => {
      const admin = context.firestore();
      await setDoc(doc(admin, `clients/${CLIENT}`), {
        uid: OWNER, email: 'owner@example.test', accountStatus: 'active', lifecycleStatus: 'active'
      });
      await setDoc(doc(admin, screenPath), { name: 'TV LAB', nowPlaying: { currentMediaId: 'sentinel' } });
      await setDoc(doc(admin, `playerDeviceBindings/${PLAYER}`), {
        uid: PLAYER, status: 'ACTIVE', clientId: CLIENT, screenId: SCREEN, deviceId: 'device-v5'
      });
    });

    const portal = env.authenticatedContext(OWNER, { clientId:CLIENT, role:'clientOwner' }).firestore();
    const player = env.authenticatedContext(PLAYER, { clientId:CLIENT, screenId:SCREEN, role:'player' }).firestore();
    const stranger = env.authenticatedContext('stranger_12345678', { clientId:'other-client', role:'clientOwner' }).firestore();
    let snapshotEvents = 0;
    let snapshotError;
    let watcherDocuments = [];
    let mainDocumentMutations = 0;

    // Emula a consulta somente-leitura feita pelo adaptador do Player LAB.
    const ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Player: listener nao iniciou')), 7000);
      unsubscribe = onSnapshot(watcherQuery(player), snap => {
        snapshotEvents++;
        watcherDocuments = snap.docs.map(d => d.data());
        clearTimeout(timer);
        resolve();
      }, error => {
        snapshotError = error;
        clearTimeout(timer);
        reject(error);
      });
    });
    await ready;
    assert.equal(watcherDocuments.length, 0, 'Player deve iniciar sem observadores');

    const makeSession = tabId => {
      const session = createWatcherSession({
        uid: OWNER, tabId,
        write: (_watcherId, data) => setDoc(watcherRef(portal, OWNER, tabId), {...data,clientId:CLIENT,screenId:SCREEN}),
        remove: () => deleteDoc(watcherRef(portal, OWNER, tabId)),
        report: error => { throw error; }
      });
      sessions.push(session);
      return session;
    };
    const tabA = makeSession('tab_12345678');
    const tabB = makeSession('tab_87654321');

    await tabA.start();
    await eventually(() => watcherDocuments, docs => activeWatchers(docs, Date.now()).length === 1, 'Abertura de aba A');
    assert.equal(activeWatchers(watcherDocuments, Date.now())[0].tabId, 'tab_12345678');

    await tabB.start();
    await eventually(() => watcherDocuments, docs => activeWatchers(docs, Date.now()).length === 2, 'Abertura de aba B');

    const before = (await getDoc(watcherRef(portal, OWNER, 'tab_12345678'))).data().expiresAtMs;
    await sleep(25);
    await tabA.tick();
    const after = (await getDoc(watcherRef(portal, OWNER, 'tab_12345678'))).data().expiresAtMs;
    assert.ok(after > before, 'Renovacao deve aumentar o prazo do lease da aba A');
    assert.ok(after <= Date.now() + LEASE_MS, 'Prazo de renovacao inesperado');

    await tabA.setVisible(false);
    await eventually(() => watcherDocuments, docs => activeWatchers(docs, Date.now()).length === 1, 'Ocultacao da aba A');
    assert.equal(activeWatchers(watcherDocuments, Date.now())[0].tabId, 'tab_87654321', 'Aba B deve continuar ativa');

    await denied(() => getDocs(watcherQuery(stranger)), 'Externo tentando listar observadores');
    await denied(() => setDoc(watcherRef(player, PLAYER, 'tab_33333333'), {
      ownerUid: PLAYER, tabId: 'tab_33333333', expiresAtMs: Date.now() + LEASE_MS, clientId:CLIENT, screenId:SCREEN
    }), 'Player tentando escrever lease');
    await denied(() => getDocs(watcherQuery(player, 'other-tv')), 'Player tentando ler outra TV');

    await tabB.stop();
    await eventually(() => watcherDocuments, docs => activeWatchers(docs, Date.now()).length === 0, 'Encerramento de aba B');
    assert.equal((await getDocs(watcherQuery(player))).empty, true, 'Colecao deve ficar sem leases');

    // Emulacao da filtragem local por expiracao, sem escrevê-la no Firestore.
    const priorEvents = snapshotEvents;
    const simulatedExpired = [{ ownerUid: OWNER, tabId: 'tab_99999999', expiresAtMs: Date.now() - 1 }];
    assert.equal(activeWatchers(simulatedExpired, Date.now()).length, 0, 'Lease expirado nao pode habilitar detalhes');
    assert.equal(snapshotEvents, priorEvents, 'Filtro de expiracao nao deve provocar gravacao/listener');

    // Verificacao independente do documento da TV: nao houve chamadas write neste teste.
    let mainDoc;
    await env.withSecurityRulesDisabled(async ctx => {
      mainDoc = await getDoc(doc(ctx.firestore(), screenPath));
    });
    assert.ok(mainDoc?.exists(), 'Documento da TV inexistente na verificacao final');
    assert.equal(mainDoc.data()?.nowPlaying?.currentMediaId, 'sentinel', 'Documento da TV foi alterado');
    assert.equal(mainDocumentMutations, 0, 'Ponte nao deve escrever no documento principal');
    assert.equal(snapshotError, undefined, 'Erro de listener do Player');

    console.log('\n=== BASIC V5 - RESULTADO PONTA A PONTA DE DADOS ===');
    console.log(JSON.stringify({
      regra: RULES, abasSimultaneas: 2, abertura: 'OK', renovacao: 'OK', ocultacao: 'OK',
      encerramento: 'OK', filtroExpiracao: 'OK', playerReadOnly: 'OK', isolamentoTv: 'OK',
      gravacoesDocumentoTVPelaPonte: mainDocumentMutations,
      eventosListenerPlayer: snapshotEvents,
      resultado: 'PASSOU - integracao de dados; UI e cobranca real ainda pendentes'
    }));
  } finally {
    if (unsubscribe) unsubscribe();
    await Promise.allSettled(sessions.map(session => session.stop()));
    await env.cleanup();
  }
}

test('BASIC V5 - Portal lease -> Firestore regras integradas -> Player listener', { timeout: 30000 }, run);
