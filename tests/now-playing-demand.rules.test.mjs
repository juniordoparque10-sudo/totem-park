import test, { before, after } from 'node:test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

let env;
const screenPath = 'clients/lease-test/screens/screen-test';
const id = (user) => doc(env.authenticatedContext(user).firestore(), screenPath);
const lease = (user, expiry) => ({ [`nowPlayingDemandViewers.${user}`]: expiry });

async function mustDenyByRules(promise, label) {
  try {
    await promise;
    assert.fail(`${label}: escrita foi permitida indevidamente`);
  } catch (error) {
    if (error?.code === 'ERR_ASSERTION') throw error;
    const message = String(error?.message || error);
    assert.equal(error?.code, 'permission-denied', `${label}: resultado inesperado: ${message}`);
    assert.doesNotMatch(message, /1000 expressions|maximum of 1000|too many expressions/i,
      `${label}: negacao inconclusiva por limite de avaliacao`);
  }
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-totem-basic-v5-lease',
    firestore: { rules: await fs.readFile('firestore.rules', 'utf8') }
  });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'settings/masterAccess'), { emails: ['master@test.local'] });
    await setDoc(doc(db, 'clients/lease-test'), { uid: 'owner-test', accountStatus: 'active' });
    await setDoc(doc(db, screenPath), { status: 'online', name: 'TV TEST', nowPlayingDemandViewers: {} });
  });
});
after(async () => env?.cleanup());

test('proprietario registra propria solicitacao', async () => {
  await assertSucceeds(updateDoc(id('owner-test'), lease('owner-test', Date.now() + 75000)));
});
test('usuario externo e negado pela regra, nao pelo limite de expressoes', async () => {
  await mustDenyByRules(updateDoc(id('outsider-test'), lease('outsider-test', Date.now() + 75000)), 'outsider');
});
test('proprietario nao altera a solicitacao de outro UID', async () => {
  await mustDenyByRules(updateDoc(id('owner-test'), lease('outsider-test', Date.now() + 75000)), 'alteracao alheia');
});
test('prazo vencido ou excessivo e negado diretamente', async () => {
  await mustDenyByRules(updateDoc(id('owner-test'), lease('owner-test', Date.now() - 1000)), 'prazo vencido');
  await mustDenyByRules(updateDoc(id('owner-test'), lease('owner-test', Date.now() + 3600000)), 'prazo excessivo');
});
test('Player nao pode registrar solicitacao em nome de outro usuario', async () => {
  await mustDenyByRules(updateDoc(id('player-nonowner'), lease('owner-test', Date.now() + 75000)), 'player');
});
