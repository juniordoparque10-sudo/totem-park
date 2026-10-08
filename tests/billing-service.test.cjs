const test = require('node:test');
const assert = require('node:assert/strict');
const { createBillingService } = require('../functions/billing/service');

function memoryRepository(client = {}) {
  const state = { client: { id: 'c1', dueDate: '2026-11-08', status: 'Ativo', updatedAtMs: 1, ...client }, contracts: {}, invoices: {}, audits: {}, notifications: {} };
  return {
    state,
    async getClient() { return structuredClone(state.client); },
    async getOpenInvoices() { return Object.values(state.invoices).filter((item) => ['pending', 'overdue'].includes(item.status)); },
    async activate({ clientPatch, contract, invoice, audit }) {
      if (state.client.financialModelVersion === 1) return { repeated: true };
      state.contracts[contract.id] = contract; state.invoices[invoice.id] = invoice; state.audits[audit.id] = audit;
      Object.assign(state.client, clientPatch); return { repeated: false };
    },
    async mutateInvoice({ invoiceId, mutate, audit, clientPatch, resolveNotifications }) {
      const current = state.invoices[invoiceId];
      if (!current) throw new Error('invoice-not-found');
      state.invoices[invoiceId] = mutate(structuredClone(current));
      state.audits[audit.id] = audit;
      if (resolveNotifications) Object.values(state.notifications).filter((n) => n.invoiceId === invoiceId).forEach((n) => { n.status = 'resolved'; });
      Object.assign(state.client, clientPatch); return state.invoices[invoiceId];
    },
    async revert({ contractId, clientPatch, audit }) { state.contracts[contractId].status = 'reverted'; state.audits[audit.id] = audit; Object.assign(state.client, clientPatch); },
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
