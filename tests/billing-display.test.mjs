import test from 'node:test';
import assert from 'node:assert/strict';
import { auditEventLabel, billingNotificationCopy, financialStatusLabel, formatBillingCompetence, formatCivilDateBr, selectHeaderInvoice } from '../src/financial-display.js';

test('formats civil dates and monthly competences in Brazilian Portuguese', () => {
  assert.equal(formatCivilDateBr('2026-10-08'), '08/10/2026');
  assert.equal(formatBillingCompetence('2026-10'), 'Outubro/2026');
  assert.equal(formatBillingCompetence('2026'), '2026');
});

test('translates persisted financial states without changing their values', () => {
  assert.equal(financialStatusLabel('pending'), 'Pendente');
  assert.equal(financialStatusLabel('paid'), 'Pago');
  assert.equal(financialStatusLabel('overdue'), 'Atrasado');
  assert.equal(financialStatusLabel('canceled'), 'Cancelado');
});

test('translates audit events to friendly Portuguese labels', () => {
  assert.equal(auditEventLabel('financial_activation'), 'Classificação financeira ativada');
  assert.equal(auditEventLabel('invoice_settled'), 'Mensalidade marcada como paga');
  assert.equal(auditEventLabel('settlement_reversed'), 'Quitação corrigida');
  assert.equal(auditEventLabel('contract_renewed'), 'Vigência contratual renovada');
  assert.equal(auditEventLabel('financial_reversion'), 'Retorno ao modelo legado');
});

test('header prioritizes the oldest overdue invoice, then the next pending invoice', () => {
  const invoices = [
    { id: 'future', status: 'pending', dueDate: '2026-11-08' },
    { id: 'old', status: 'overdue', dueDate: '2026-09-08' },
    { id: 'newer', status: 'overdue', dueDate: '2026-10-01' },
    { id: 'paid', status: 'paid', dueDate: '2026-08-08' },
  ];
  assert.equal(selectHeaderInvoice(invoices).id, 'old');
  assert.equal(selectHeaderInvoice(invoices.filter((item) => item.status !== 'overdue')).id, 'future');
  assert.equal(selectHeaderInvoice(invoices.filter((item) => item.status === 'paid')), null);
});

test('notification copy uses friendly title, money and Brazilian due date', () => {
  assert.deepEqual(billingNotificationCopy({ eventType: 'due_today' }, { amountCents: 9900, dueDate: '2026-10-08' }), {
    title: 'Sua mensalidade vence hoje.',
    detail: 'Valor: R$ 99,00 · Vencimento: 08/10/2026.',
  });
});
