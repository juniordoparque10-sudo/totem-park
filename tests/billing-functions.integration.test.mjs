import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const requireFromFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = requireFromFunctions('firebase-admin/app');
const { getFirestore, FieldValue, FieldPath } = requireFromFunctions('firebase-admin/firestore');
const { createFirestoreBillingRepository } = requireFromFunctions('./billing/repository');
const { createBillingService } = requireFromFunctions('./billing/service');

let app;
let db;
let repository;
before(async () => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8189';
  app = initializeApp({ projectId: 'demo-totem-billing-integration' }, 'billing-integration');
  db = getFirestore(app);
  repository = createFirestoreBillingRepository(db, FieldValue, FieldPath);
});
after(async () => { await deleteApp(app); });

test('checkpoint stores only serializable cursor data', async () => {
  const cursor = { value: '2026-10-08', path: 'clients/c1/invoices/i1' };
  await repository.saveCheckpoint({ job: 'cursor-test', cursor, completed: false });
  const stored = (await db.doc('billingJobs/cursor-test').get()).data();
  assert.deepEqual(stored.cursor, cursor);
});

test('concurrent settlements cannot overwrite the first confirmed payment', async () => {
  await db.doc('clients/concurrent').set({ financialModelVersion: 1, financialMode: 'active', activeContractId: 'k1', financialRevision: 1 });
  await db.doc('clients/concurrent/invoices/i1').set({ id: 'i1', clientId: 'concurrent', contractId: 'k1', dueDate: '2026-10-01', status: 'overdue' });
  const service = createBillingService({ repository, previewSecret: 'integration-secret', now: () => new Date('2026-10-08T12:00:00Z') });
  const actor = { uid: 'master', email: 'master@example.com' };
  const outcomes = await Promise.allSettled([
    service.settleInvoice(actor, { clientId: 'concurrent', invoiceId: 'i1', idempotencyKey: 'payment-a' }),
    service.settleInvoice(actor, { clientId: 'concurrent', invoiceId: 'i1', idempotencyKey: 'payment-b' }),
  ]);
  assert.equal(outcomes.filter((item) => item.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter((item) => item.status === 'rejected').length, 1);
  const invoice = (await db.doc('clients/concurrent/invoices/i1').get()).data();
  assert.ok(['payment-a', 'payment-b'].includes(invoice.settlementIdempotencyKey));
});
