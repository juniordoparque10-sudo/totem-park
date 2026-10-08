const test = require('node:test');
const assert = require('node:assert/strict');
const { createBillingService } = require('../functions/billing/service');

function memoryRepository(client = {}) {
  const state = { client: { id: 'c1', dueDate: '2026-11-08', status: 'Ativo', updatedAtMs: 1, ...client }, contracts: {}, invoices: {}, audits: {}, notifications: {} };
  return {
    state,
    async getClient() { return structuredClone(state.client); },
    async getInvoice(_clientId, invoiceId) { return structuredClone(state.invoices[invoiceId] || null); },
    async getContract(_clientId, contractId) { return structuredClone(state.contracts[contractId] || null); },
    async getOpenInvoices() { return Object.values(state.invoices).filter((item) => ['pending', 'overdue'].includes(item.status)); },
    async activate({ expectedClientVersion, clientPatch, contract, invoice, audit }) {
      if (state.client.financialMode === 'active' && state.client.activeContractId === contract.id) return { repeated: true };
      if (String(state.client.financialRevision ?? state.client.updatedAtMs ?? 'legacy') !== String(expectedClientVersion)) throw new Error('stale-financial-preview');
      state.contracts[contract.id] = contract; state.invoices[invoice.id] = invoice; state.audits[audit.id] = audit;
      Object.assign(state.client, clientPatch); state.client.financialRevision = Number(state.client.financialRevision || 0) + 1; return { repeated: false };
    },
    async mutateInvoice({ invoiceId, mutate, audit, buildClientPatch, resolveNotifications }) {
      const current = state.invoices[invoiceId];
      if (!current) throw new Error('invoice-not-found');
      const outcome = mutate(structuredClone(current));
      if (outcome.repeated) return outcome;
      state.invoices[invoiceId] = outcome.invoice;
      if (audit && !state.audits[audit.id]) state.audits[audit.id] = audit;
      if (resolveNotifications) Object.values(state.notifications).filter((n) => n.invoiceId === invoiceId).forEach((n) => { n.status = 'resolved'; });
      Object.assign(state.client, buildClientPatch(Object.values(state.invoices))); state.client.financialRevision = Number(state.client.financialRevision || 0) + 1; return { repeated: false, invoice: state.invoices[invoiceId] };
    },
    async revert({ contractId, expectedClientVersion, clientPatch, audit }) { if (String(state.client.financialRevision ?? state.client.updatedAtMs ?? 'legacy') !== String(expectedClientVersion)) throw new Error('stale-financial-preview'); state.contracts[contractId].status = 'reverted'; state.audits[audit.id] = audit; Object.assign(state.client, clientPatch); state.client.financialRevision = Number(state.client.financialRevision || 0) + 1; return { repeated: false }; },
    async renew({ contractId, expectedEndDate, newEndDate, audit }) { if (state.contracts[contractId].endDate !== expectedEndDate) throw new Error('contract-changed'); state.contracts[contractId].endDate = newEndDate; state.audits[audit.id] = audit; return { repeated: false, contractId, endDate: newEndDate }; },
  };
}

const actor = { uid: 'master', email: 'master@example.com' };
const secret = 'billing-test-secret';

test('activation preview is read-only and never creates retroactive competences', async () => {
  const repo = memoryRepository();
  const service = createBillingService({ repository: repo, previewSecret: secret, now: () => new Date('2026-10-08T12:00:00Z') });
  const preview = await service.previewActivation(actor, { clientId: 'c1', planKey: 'start', planName: 'Start', startDate: '2026-10-08', endDate: '2027-10-07', billingPeriod: 'monthly', billingAnchorDay: 8, firstCompetence: '2026-10', firstDueDate: '2026-10-08', amountCents: 4990 });
  assert.equal(preview.firstInvoice.competence, '2026-10');
  assert.equal(Object.keys(repo.state.invoices).length, 0);
  assert.equal(repo.state.client.financialModelVersion, undefined);
});

test('activation requires highlighted confirmation when access changes and writes atomically', async () => {
  const repo = memoryRepository();
  const service = createBillingService({ repository: repo, previewSecret: secret, now: () => new Date('2026-10-24T12:00:00Z') });
  const input = { clientId: 'c1', planKey: 'start', planName: 'Start', startDate: '2026-10-08', endDate: '2027-10-07', billingPeriod: 'monthly', billingAnchorDay: 8, firstCompetence: '2026-10', firstDueDate: '2026-10-08', amountCents: 4990 };
  const preview = await service.previewActivation(actor, input);
  assert.equal(preview.requiresOperationalChangeConfirmation, true);
  await assert.rejects(() => service.confirmActivation(actor, { previewToken: preview.previewToken, idempotencyKey: 'activate-1' }), /operational-confirmation-required/);
  await service.confirmActivation(actor, { previewToken: preview.previewToken, idempotencyKey: 'activate-1', operationalChangeConfirmed: true });
  assert.equal(repo.state.client.financialModelVersion, 1);
  assert.equal(Object.keys(repo.state.contracts).length, 1);
  assert.equal(Object.keys(repo.state.invoices).length, 1);
  const repeated = await service.confirmActivation(actor, { previewToken: preview.previewToken, idempotencyKey: 'activate-1', operationalChangeConfirmed: true });
  assert.equal(repeated.repeated, true);
});

test('activation confirmation rejects a preview after financial state changes', async () => {
  const repo = memoryRepository();
  const service = createBillingService({ repository: repo, previewSecret: secret, now: () => new Date('2026-10-08T12:00:00Z') });
  const preview = await service.previewActivation(actor, { clientId: 'c1', planKey: 'start', planName: 'Start', startDate: '2026-10-08', endDate: '2027-10-07', billingPeriod: 'monthly', billingAnchorDay: 8, firstCompetence: '2026-10', firstDueDate: '2026-10-08', amountCents: 4990 });
  repo.state.client.financialRevision = 2;
  await assert.rejects(() => service.confirmActivation(actor, { previewToken: preview.previewToken, idempotencyKey: 'stale' }), /preview-mismatch|stale-financial-preview/);
});

test('manual settlement is audited, idempotent and preserves another overdue debt', async () => {
  const repo = memoryRepository({ financialModelVersion: 1, financialMode: 'active', activeContractId: 'k1', status: 'Ativo' });
  repo.state.invoices.i1 = { id: 'i1', contractId: 'k1', dueDate: '2026-09-01', status: 'overdue' };
  repo.state.invoices.i2 = { id: 'i2', contractId: 'k1', dueDate: '2026-09-20', status: 'overdue' };
  repo.state.notifications.n1 = { id: 'n1', invoiceId: 'i1', status: 'active' };
  const service = createBillingService({ repository: repo, previewSecret: secret, now: () => new Date('2026-10-08T12:00:00Z') });
  await service.settleInvoice(actor, { clientId: 'c1', invoiceId: 'i1', idempotencyKey: 'pay-i1', paidAt: '2026-10-08T11:00:00Z' });
  assert.equal(repo.state.invoices.i1.status, 'paid');
  assert.equal(repo.state.notifications.n1.status, 'resolved');
  assert.equal(repo.state.client.financialReferenceInvoiceId, 'i2');
  assert.equal(repo.state.client.financialRestriction, 'suspended');
  await service.settleInvoice(actor, { clientId: 'c1', invoiceId: 'i1', idempotencyKey: 'pay-i1' });
  assert.equal(Object.values(repo.state.audits).filter((a) => a.type === 'invoice_settled').length, 1);
});

test('settlement correction preserves history and does not remove administrative suspension', async () => {
  const repo = memoryRepository({ financialModelVersion: 1, financialMode: 'active', activeContractId: 'k1', status: 'Suspenso', suspensionReason: 'Administrativo' });
  repo.state.invoices.i1 = { id: 'i1', contractId: 'k1', dueDate: '2026-10-01', status: 'paid', paidAt: '2026-10-02T00:00:00Z' };
  const service = createBillingService({ repository: repo, previewSecret: secret, now: () => new Date('2026-10-08T12:00:00Z') });
  await service.reverseSettlement(actor, { clientId: 'c1', invoiceId: 'i1', idempotencyKey: 'reverse-i1', reason: 'Lançamento indevido' });
  assert.equal(repo.state.invoices.i1.status, 'overdue');
  assert.equal(repo.state.client.status, 'Suspenso');
  assert.equal(repo.state.client.suspensionReason, 'Administrativo');
  assert.ok(Object.values(repo.state.audits).some((a) => a.type === 'settlement_reversed'));
});

test('reversion preview is read-only and confirmation preserves all financial history', async () => {
  const repo = memoryRepository({ financialModelVersion: 1, financialMode: 'active', activeContractId: 'k1', dueDate: '2026-11-08' });
  repo.state.contracts.k1 = { id: 'k1', status: 'active' };
  repo.state.invoices.i1 = { id: 'i1', contractId: 'k1', dueDate: '2026-10-01', status: 'overdue' };
  const service = createBillingService({ repository: repo, previewSecret: secret, now: () => new Date('2026-10-08T12:00:00Z') });
  const preview = await service.previewReversion(actor, { clientId: 'c1' });
  assert.equal(repo.state.contracts.k1.status, 'active');
  await assert.rejects(() => service.confirmReversion(actor, { previewToken: preview.previewToken, idempotencyKey: 'revert-1' }), /operational-confirmation-required/);
  await service.confirmReversion(actor, { previewToken: preview.previewToken, idempotencyKey: 'revert-1', operationalChangeConfirmed: true });
  assert.equal(repo.state.client.financialMode, 'reverted');
  assert.equal(repo.state.client.dueDate, '2026-11-08');
  assert.equal(repo.state.contracts.k1.status, 'reverted');
  assert.ok(repo.state.invoices.i1);
});

test('authorized renewal extends the active contract without generating retroactive invoices', async () => {
  const repo = memoryRepository({ financialModelVersion: 1, financialMode: 'active', activeContractId: 'k1' });
  repo.state.contracts.k1 = { id: 'k1', status: 'active', endDate: '2027-10-07' };
  const service = createBillingService({ repository: repo, previewSecret: secret, now: () => new Date('2026-10-08T12:00:00Z') });
  await service.renewContract(actor, { clientId: 'c1', newEndDate: '2028-10-07', idempotencyKey: 'renew-1' });
  assert.equal(repo.state.contracts.k1.endDate, '2028-10-07');
  assert.equal(Object.keys(repo.state.invoices).length, 0);
  assert.ok(Object.values(repo.state.audits).some((item) => item.type === 'contract_renewed'));
});
