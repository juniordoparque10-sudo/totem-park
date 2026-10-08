import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import fs from 'node:fs';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-totem-billing',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8189 },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'settings/masterAccess'), { emails: ['master@example.com'] });
    await setDoc(doc(db, 'clients/c1'), { uid: 'owner-1', email: 'owner1@example.com', name: 'C1' });
    await setDoc(doc(db, 'clients/c2'), { uid: 'owner-2', email: 'owner2@example.com', name: 'C2' });
    await setDoc(doc(db, 'clients/c1/contracts/k1'), { clientId: 'c1' });
    await setDoc(doc(db, 'clients/c1/invoices/i1'), { clientId: 'c1', amountCents: 4990 });
    await setDoc(doc(db, 'clients/c1/financialNotifications/n1'), { clientId: 'c1', status: 'active' });
    await setDoc(doc(db, 'clients/c1/financialAudit/a1'), { clientId: 'c1' });
    await setDoc(doc(db, 'clients/c1/financialEmailDeliveries/e1'), { clientId: 'c1' });
  });
});
after(async () => env?.cleanup());

test('owner reads own authorized financial data but not private audit or deliveries', async () => {
  const db = env.authenticatedContext('owner-1', { email: 'owner1@example.com' }).firestore();
  await assertSucceeds(getDoc(doc(db, 'clients/c1/contracts/k1')));
  await assertSucceeds(getDoc(doc(db, 'clients/c1/invoices/i1')));
  await assertSucceeds(getDoc(doc(db, 'clients/c1/financialNotifications/n1')));
  await assertFails(getDoc(doc(db, 'clients/c1/financialAudit/a1')));
  await assertFails(getDoc(doc(db, 'clients/c1/financialEmailDeliveries/e1')));
});

test('client cannot read another client or write financial records and projections', async () => {
  const db = env.authenticatedContext('owner-2', { email: 'owner2@example.com' }).firestore();
  await assertFails(getDoc(doc(db, 'clients/c1/invoices/i1')));
  await assertFails(setDoc(doc(db, 'clients/c2/invoices/forged'), { amountCents: 1 }));
  await assertFails(updateDoc(doc(db, 'clients/c2'), { financialStatus: 'paid' }));
});

test('master reads and writes finance while anonymous access is denied', async () => {
  const master = env.authenticatedContext('master', { email: 'master@example.com' }).firestore();
  const anon = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(master, 'clients/c1/financialAudit/a1')));
  await assertSucceeds(updateDoc(doc(master, 'clients/c1/invoices/i1'), { status: 'paid' }));
  await assertFails(getDoc(doc(anon, 'clients/c1/invoices/i1')));
});

test('owner keeps legitimate non-financial client update access', async () => {
  const db = env.authenticatedContext('owner-1', { email: 'owner1@example.com' }).firestore();
  await assertSucceeds(updateDoc(doc(db, 'clients/c1'), { name: 'C1 atualizado' }));
  assert.equal((await getDoc(doc(db, 'clients/c1'))).data().name, 'C1 atualizado');
});
