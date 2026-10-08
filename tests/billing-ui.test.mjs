import test from 'node:test';
import assert from 'node:assert/strict';
import { getEffectivePlanAccess, getFinancialCardState, isFinancialModelActive } from '../src/financial-access.js';
import fs from 'node:fs';

test('legacy and reverted clients delegate unchanged to legacy evaluator', () => {
  const sentinel = { statusLabel: 'LEGACY', canCreate: false };
  const legacy = () => sentinel;
  assert.equal(getEffectivePlanAccess({ dueDate: '2026-10-01' }, legacy), sentinel);
  assert.equal(getEffectivePlanAccess({ financialModelVersion: 1, financialMode: 'reverted' }, legacy), sentinel);
  assert.equal(isFinancialModelActive({ financialModelVersion: 1, financialMode: 'active' }), true);
});

test('active financial projection maps to existing access contract', () => {
  const access = getEffectivePlanAccess({ financialModelVersion: 1, financialMode: 'active', financialRestriction: 'partial', financialDaysOverdue: 6 }, () => { throw new Error('legacy must not run'); });
  assert.equal(access.isPartialRestriction, true);
  assert.equal(access.canCreate, false);
  assert.equal(access.canEdit, true);
  assert.equal(access.canShowTvContent, true);
});

test('card state distinguishes due soon, today, overdue and annual copy', () => {
  const client = { financialModelVersion: 1, financialMode: 'active', billing: 'Anual', plan: 'Start' };
  assert.equal(getFinancialCardState(client, { dueDate: '2026-10-13', amountCents: 4990, competence: '2026' }, '2026-10-08').tone, 'warning');
  assert.equal(getFinancialCardState(client, { dueDate: '2026-10-08', amountCents: 4990, competence: '2026' }, '2026-10-08').tone, 'today');
  assert.equal(getFinancialCardState(client, { dueDate: '2026-10-01', amountCents: 4990, competence: '2026' }, '2026-10-08').tone, 'danger');
  assert.equal(getFinancialCardState(client, { dueDate: '2026-10-13', amountCents: 4990, competence: '2026' }, '2026-10-08').title, 'Próxima cobrança anual');
});

test('portal integrates classification, management and persistent notifications without removing legacy card', () => {
  const app = fs.readFileSync('src/App.jsx', 'utf8');
  const classification = fs.readFileSync('src/FinancialClassificationPanel.jsx', 'utf8');
  const management = fs.readFileSync('src/FinancialManagementPanel.jsx', 'utf8');
  assert.match(app, /getEffectivePlanAccess/);
  assert.match(app, /FinancialClassificationPanel/);
  assert.match(app, /FinancialManagementPanel/);
  assert.match(app, /FinancialNotifications/);
  assert.match(app, /title="Vencimento"/);
  assert.match(classification, /Prévia da ativação/);
  assert.match(classification, /operationalChangeConfirmed/);
  assert.match(management, /Marcar como pago/);
  assert.match(management, /Corrigir quitação/);
  assert.match(management, /Prévia da reversão/);
});
