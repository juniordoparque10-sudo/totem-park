const test = require('node:test');
const assert = require('node:assert/strict');

const domainPath = '../functions/billing/domain';

test('calendar clamps short months and returns to the original anchor day', () => {
  const { nextDueDate } = require(domainPath);
  assert.equal(nextDueDate({ dueDate: '2027-01-31', billingPeriod: 'monthly', anchorDay: 31 }), '2027-02-28');
  assert.equal(nextDueDate({ dueDate: '2027-02-28', billingPeriod: 'monthly', anchorDay: 31 }), '2027-03-31');
  assert.equal(nextDueDate({ dueDate: '2028-01-31', billingPeriod: 'monthly', anchorDay: 31 }), '2028-02-29');
  assert.equal(nextDueDate({ dueDate: '2028-02-29', billingPeriod: 'annual', anchorDay: 29 }), '2029-02-28');
});

test('competences and invoice ids are deterministic for monthly and annual billing', () => {
  const { normalizeCompetence, nextCompetence, invoiceId } = require(domainPath);
  assert.equal(normalizeCompetence({ billingPeriod: 'monthly', competence: '2026-8' }), '2026-08');
  assert.equal(normalizeCompetence({ billingPeriod: 'annual', competence: '2026' }), '2026');
  assert.equal(nextCompetence({ billingPeriod: 'monthly', competence: '2026-12' }), '2027-01');
  assert.equal(nextCompetence({ billingPeriod: 'annual', competence: '2026' }), '2027');
  assert.equal(invoiceId('contract/alpha', '2026-08'), 'contract_alpha__2026-08');
});

test('financial restriction milestones remain exactly 5, 10 and 15 days', () => {
  const { evaluateFinancialState } = require(domainPath);
  const expected = [[0, 'none'], [1, 'warning'], [4, 'warning'], [5, 'partial'], [9, 'partial'], [10, 'strong'], [14, 'strong'], [15, 'suspended']];
  for (const [days, restriction] of expected) {
    const day = String(1 + days).padStart(2, '0');
    assert.equal(evaluateFinancialState({ invoices: [{ id: 'a', dueDate: '2026-10-01', status: 'pending' }], today: `2026-10-${day}` }).restriction, restriction);
  }
});

test('oldest open invoice controls access and non-financial suspension wins', () => {
  const { evaluateFinancialState, combineOperationalAccess } = require(domainPath);
  const financial = evaluateFinancialState({ invoices: [
    { id: 'new', dueDate: '2026-10-10', status: 'pending' },
    { id: 'old', dueDate: '2026-09-20', status: 'overdue' },
    { id: 'paid', dueDate: '2026-08-01', status: 'paid' },
  ], today: '2026-10-08' });
  assert.equal(financial.referenceInvoiceId, 'old');
  assert.equal(financial.restriction, 'suspended');
  assert.equal(combineOperationalAccess({ financial, clientStatus: 'Suspenso', suspensionReason: 'Administrativo' }).cause, 'administrative');
});

test('preview tokens bind purpose, client version, payload and expiration', () => {
  const { createPreviewToken, verifyPreviewToken } = require('../functions/billing/preview-token');
  const payload = { clientId: 'c1', amountCents: 4990, requiresOperationalChangeConfirmation: true };
  const token = createPreviewToken(payload, { purpose: 'activation', clientVersion: 'v1', nowMs: 1000, ttlMs: 5000, secret: 'test-secret' });
  assert.deepEqual(verifyPreviewToken(token, payload, { purpose: 'activation', clientVersion: 'v1', nowMs: 5999, secret: 'test-secret' }).payload, payload);
  assert.throws(() => verifyPreviewToken(token, payload, { purpose: 'reversion', clientVersion: 'v1', nowMs: 2000, secret: 'test-secret' }), /preview-mismatch/);
  assert.throws(() => verifyPreviewToken(token, { ...payload, amountCents: 5000 }, { purpose: 'activation', clientVersion: 'v1', nowMs: 2000, secret: 'test-secret' }), /preview-mismatch/);
  assert.throws(() => verifyPreviewToken(token, payload, { purpose: 'activation', clientVersion: 'v2', nowMs: 2000, secret: 'test-secret' }), /preview-mismatch/);
  assert.throws(() => verifyPreviewToken(token, payload, { purpose: 'activation', clientVersion: 'v1', nowMs: 6001, secret: 'test-secret' }), /preview-expired/);
});
