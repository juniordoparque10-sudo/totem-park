const test = require('node:test');
const assert = require('node:assert/strict');
const { createBillingJobs } = require('../functions/billing/jobs');
const { disabledEmailProvider, processEmailDelivery } = require('../functions/billing/email');

function jobRepository() {
  const state = { contracts: [], invoices: new Map(), notifications: new Map(), deliveries: new Map(), checkpoints: {}, recalculated: [] };
  return {
    state,
    async listEligibleContracts() { return { items: state.contracts, nextCursor: null }; },
    async createInvoiceAndAdvance({ invoice, nextInvoiceDueDate, nextCompetence }) { if (state.invoices.has(invoice.id)) return false; state.invoices.set(invoice.id, invoice); const c = state.contracts.find((item) => item.id === invoice.contractId); c.nextInvoiceDueDate = nextInvoiceDueDate; c.nextCompetence = nextCompetence; return true; },
    async closeContractIfExpired(contract) { contract.status = 'expired'; return true; },
    async listEligibleInvoices() { return { items: [...state.invoices.values()], nextCursor: null }; },
    async createNotificationIfEligible(notification) { if (state.notifications.has(notification.id)) return false; state.notifications.set(notification.id, notification); return true; },
    async recalculateClientFinancial(clientId, today) { state.recalculated.push({ clientId, today }); return true; },
    async getDelivery(clientId, id) { return state.deliveries.get(id) || null; },
    async saveDelivery(delivery) { state.deliveries.set(delivery.id, delivery); },
    async getCheckpoint(job) { return state.checkpoints[job] || null; },
    async saveCheckpoint(value) { state.checkpoints[value.job] = value; },
  };
}

test('job generates only eligible deterministic invoices and stops at contract end', async () => {
  const repo = jobRepository();
  repo.state.contracts.push({ id: 'k1', clientId: 'c1', status: 'active', financialMode: 'active', billingPeriod: 'monthly', billingAnchorDay: 31, defaultAmountCents: 4990, currency: 'BRL', nextCompetence: '2026-11', nextInvoiceDueDate: '2026-11-30', endDate: '2026-12-31' });
  repo.state.contracts.push({ id: 'ended', clientId: 'c2', status: 'active', financialMode: 'active', billingPeriod: 'monthly', billingAnchorDay: 1, defaultAmountCents: 9900, currency: 'BRL', nextCompetence: '2027-01', nextInvoiceDueDate: '2027-01-01', endDate: '2026-12-31' });
  const jobs = createBillingJobs({ repository: repo, today: () => '2026-10-31' });
  await jobs.generateEligibleInvoices();
  await jobs.generateEligibleInvoices();
  assert.equal(repo.state.invoices.size, 1);
  assert.equal([...repo.state.invoices.values()][0].dueDate, '2026-11-30');
});

test('job creates milestone notifications once and safely repeats after checkpoint interruption', async () => {
  const repo = jobRepository();
  repo.state.invoices.set('i1', { id: 'i1', clientId: 'c1', contractId: 'k1', competence: '2026-10', dueDate: '2026-10-03', status: 'overdue', amountCents: 4990 });
  const jobs = createBillingJobs({ repository: repo, today: () => '2026-10-08' });
  await jobs.processEligibleInvoiceEvents();
  const count = repo.state.notifications.size;
  await jobs.processEligibleInvoiceEvents();
  assert.equal(count, 1);
  assert.equal(repo.state.notifications.values().next().value.eventType, 'restriction_5d');
  assert.ok(repo.state.checkpoints['invoice-events']);
  assert.equal(repo.state.recalculated.length, 2);
});

test('disabled email records not_configured and never false success', async () => {
  const delivery = await processEmailDelivery({ invoice: { id: 'i1', status: 'pending' }, eventType: 'due_today', provider: disabledEmailProvider, now: '2026-10-08T12:00:00Z' });
  assert.equal(delivery.status, 'not_configured');
  assert.equal(delivery.sentAt, null);
});

test('configured email is not marked sent without provider confirmation reference', async () => {
  const delivery = await processEmailDelivery({ invoice: { id: 'i1', clientId: 'c1', status: 'pending' }, eventType: 'due_today', provider: { configured: true, async send() { return { confirmed: true }; } }, now: '2026-10-08T12:00:00Z' });
  assert.equal(delivery.status, 'pending');
  assert.equal(delivery.sentAt, null);
});

test('job follows serializable cursors across every page', async () => {
  const seen = [];
  const pages = new Map([[null, { items: [{ id: 'i1', clientId: 'c1', contractId: 'k1', competence: '2026-10', dueDate: '2026-10-03', status: 'overdue' }], nextCursor: { value: '2026-10-03', path: 'clients/c1/invoices/i1' } }], ['clients/c1/invoices/i1', { items: [{ id: 'i2', clientId: 'c2', contractId: 'k2', competence: '2026-10', dueDate: '2026-10-03', status: 'overdue' }], nextCursor: null }]]);
  const repository = {
    async getCheckpoint() { return null; },
    async listEligibleInvoices({ cursor }) { seen.push(cursor); return pages.get(cursor?.path || null); },
    async createNotificationIfEligible() { return true; }, async getDelivery() { return null; }, async saveDelivery() {},
    async recalculateClientFinancial() {}, async saveCheckpoint() {},
  };
  const result = await createBillingJobs({ repository, today: () => '2026-10-08', pageSize: 1 }).processEligibleInvoiceEvents();
  assert.equal(result.pages, 2);
  assert.deepEqual(seen[1], { value: '2026-10-03', path: 'clients/c1/invoices/i1' });
});
