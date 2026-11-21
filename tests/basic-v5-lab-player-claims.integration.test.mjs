import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

const projectId = 'demo-totem-basic-hom';
const splitHost = (value, fallbackPort) => {
  const [rawHost, rawPort] = String(value || '').split(':');
  return { host:rawHost || '127.0.0.1', port:Number(rawPort || fallbackPort) };
};
let app;
let env;

before(async () => {
  env = await initializeTestEnvironment({ projectId });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'clients/lab-client/screens/lab-screen'), { status:'offline' });
    await setDoc(doc(db, 'tv_codes/BASICV5CLAIM'), { clientId:'lab-client', screenId:'lab-screen' });
  });
  app = initializeApp({ projectId, apiKey:'demo-key', authDomain:'local.test' }, `claims-${Date.now()}`);
  const authEndpoint = splitHost(process.env.FIREBASE_AUTH_EMULATOR_HOST, 9298);
  connectAuthEmulator(getAuth(app), `http://${authEndpoint.host}:${authEndpoint.port}`, { disableWarnings:true });
  const functionsEndpoint = splitHost(process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST, 5102);
  connectFunctionsEmulator(getFunctions(app), functionsEndpoint.host, functionsEndpoint.port);
});

after(async () => {
  if (app) await deleteApp(app);
  if (env) await env.cleanup();
});

test('existing binding flow grants and revokes exact Player claims in LAB', async () => {
  const auth = getAuth(app);
  const credential = await signInAnonymously(auth);
  const claim = httpsCallable(getFunctions(app), 'claimPlayerBinding');
  const linked = await claim({ code:'BASICV5CLAIM', deviceId:'device_lab_123', appVersion:'integrated-lab' });
  assert.equal(linked.data.status, 'ACTIVE');
  const granted = await credential.user.getIdTokenResult(true);
  assert.equal(granted.claims.clientId, 'lab-client');
  assert.equal(granted.claims.screenId, 'lab-screen');
  assert.equal(granted.claims.role, 'player');

  const revoke = httpsCallable(getFunctions(app), 'revokePlayerBinding');
  await revoke({ reason:'INTEGRATION_TEST' });
  const cleared = await credential.user.getIdTokenResult(true);
  assert.equal(cleared.claims.clientId, undefined);
  assert.equal(cleared.claims.screenId, undefined);
  assert.equal(cleared.claims.role, undefined);
});
