import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClassificationSuggestions, mergeUntouchedSuggestions } from '../src/billing-form-suggestions.js';

test('12-month suggestion ends on the day before the anniversary', () => {
  const result = buildClassificationSuggestions({ client: { plan: 'Start' }, startDate: '2026-09-11', billingPeriod: 'monthly' });
  assert.equal(result.endDate, '2027-09-10');
  assert.equal(result.billingAnchorDay, 11);
  assert.equal(result.firstCompetence, '2026-09');
  assert.equal(result.firstDueDate, '2026-09-11');
  assert.equal(result.amount, '49,90');
});

test('suggestions clamp the first due date and preserve plan prices', () => {
  const result = buildClassificationSuggestions({ client: { plan: 'Business' }, startDate: '2026-02-28', billingPeriod: 'monthly', firstCompetence: '2026-04', billingAnchorDay: 31 });
  assert.equal(result.firstDueDate, '2026-04-30');
  assert.equal(result.amount, '99,00');
});

test('manual values are never overwritten by later suggestions', () => {
  const current = { endDate: '2030-12-31', billingAnchorDay: 20, firstCompetence: '2026-10', firstDueDate: '2026-10-20', amount: '79,90' };
  const touched = { endDate: true, billingAnchorDay: true, firstCompetence: true, firstDueDate: true, amount: true };
  const suggestions = buildClassificationSuggestions({ client: { plan: 'Enterprise' }, startDate: '2027-01-15', billingPeriod: 'monthly' });
  assert.deepEqual(mergeUntouchedSuggestions(current, suggestions, touched), current);
});

test('only untouched dependent fields follow a changed start date', () => {
  const current = { endDate: '2027-09-10', billingAnchorDay: 18, firstCompetence: '2026-09', firstDueDate: '2026-09-11', amount: '49,90' };
  const touched = { billingAnchorDay: true };
  const suggestions = buildClassificationSuggestions({ client: { plan: 'Start' }, startDate: '2026-10-05', billingPeriod: 'monthly' });
  assert.deepEqual(mergeUntouchedSuggestions(current, suggestions, touched), { endDate: '2027-10-04', billingAnchorDay: 18, firstCompetence: '2026-10', firstDueDate: '2026-10-05', amount: '49,90' });
});
