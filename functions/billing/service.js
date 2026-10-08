"use strict";

const crypto = require("node:crypto");
const { parseCivilDate, normalizeCompetence, invoiceId, evaluateFinancialState } = require("./domain");
const { createPreviewToken, verifyPreviewToken, readPreviewTokenPayload } = require("./preview-token");

function isoDay(date) { return date.toISOString().slice(0, 10); }
function eventId(prefix, key) { return `${prefix}-${crypto.createHash("sha256").update(String(key)).digest("hex").slice(0, 24)}`; }
function clientVersion(client) { return String(client.updatedAtMs || client.financialUpdatedAtMs || "legacy"); }

function validateActivation(input) {
  if (!input.clientId || !input.planKey || !input.planName) throw new Error("invalid-activation");
  parseCivilDate(input.startDate); parseCivilDate(input.endDate); parseCivilDate(input.firstDueDate);
  if (input.endDate < input.startDate || input.firstDueDate < input.startDate || input.firstDueDate > input.endDate) throw new Error("invalid-contract-dates");
  if (!["monthly", "annual"].includes(input.billingPeriod)) throw new Error("invalid-billing-period");
  const competence = normalizeCompetence({ billingPeriod: input.billingPeriod, competence: input.firstCompetence });
  const amountCents = Number(input.amountCents);
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error("invalid-amount");
  const anchor = Number(input.billingAnchorDay);
  if (!Number.isInteger(anchor) || anchor < 1 || anchor > 31) throw new Error("invalid-anchor-day");
  return { ...input, firstCompetence: competence, amountCents, billingAnchorDay: anchor };
}

function legacyFinancial(client, today) {
  if (!client.dueDate) return { restriction: "none", daysOverdue: 0 };
  return evaluateFinancialState({ invoices: [{ id: "legacy", dueDate: client.dueDate, status: "pending" }], today });
}

function createBillingService({ repository, previewSecret, now = () => new Date() }) {
  async function previewActivation(actor, rawInput) {
    const input = validateActivation(rawInput);
    const client = await repository.getClient(input.clientId);
    if (!client) throw new Error("client-not-found");
    if (client.financialModelVersion === 1 && client.financialMode === "active") throw new Error("already-classified");
    const contractId = eventId("contract", `${input.clientId}:${input.startDate}:${input.firstCompetence}`);
    const invoice = {
      id: invoiceId(contractId, input.firstCompetence), clientId: input.clientId, contractId,
      schemaVersion: 1, competence: input.firstCompetence, billingPeriod: input.billingPeriod,
      amountCents: input.amountCents, currency: "BRL", dueDate: input.firstDueDate,
      status: input.firstDueDate < isoDay(now()) ? "overdue" : "pending", paymentOrigin: null, externalReference: null,
    };
    const projectedAccess = evaluateFinancialState({ invoices: [invoice], today: isoDay(now()) });
    const currentAccess = legacyFinancial(client, isoDay(now()));
    const requiresOperationalChangeConfirmation = currentAccess.restriction !== projectedAccess.restriction;
    const payload = {
      actorUid: actor.uid, input, clientVersion: clientVersion(client), contractId, firstInvoice: invoice,
      currentAccess, projectedAccess, requiresOperationalChangeConfirmation,
    };
    return {
      previewToken: createPreviewToken(payload, { purpose: "activation", clientVersion: payload.clientVersion, secret: previewSecret }),
      normalizedContract: { id: contractId, clientId: input.clientId, schemaVersion: 1, planKey: input.planKey, planName: input.planName, startDate: input.startDate, endDate: input.endDate, status: "active", billingPeriod: input.billingPeriod, billingAnchorDay: input.billingAnchorDay, firstCompetence: input.firstCompetence, defaultAmountCents: input.amountCents, currency: "BRL" },
      firstInvoice: invoice, currentAccess, projectedAccess, requiresOperationalChangeConfirmation,
      operationalChange: requiresOperationalChangeConfirmation ? { from: currentAccess.restriction, to: projectedAccess.restriction } : null,
    };
  }

  async function confirmActivation(actor, { previewToken, idempotencyKey, operationalChangeConfirmed = false }) {
    const payload = readPreviewTokenPayload(previewToken);
    const client = await repository.getClient(payload.input.clientId);
    if (!client) throw new Error("client-not-found");
    verifyPreviewToken(previewToken, payload, { purpose: "activation", clientVersion: clientVersion(client), secret: previewSecret });
    if (payload.actorUid !== actor.uid) throw new Error("preview-actor-mismatch");
    if (payload.requiresOperationalChangeConfirmation && !operationalChangeConfirmed) throw new Error("operational-confirmation-required");
    const timestamp = now().toISOString();
    const contract = { id: payload.contractId, clientId: payload.input.clientId, schemaVersion: 1, planKey: payload.input.planKey, planName: payload.input.planName, startDate: payload.input.startDate, endDate: payload.input.endDate, status: "active", billingPeriod: payload.input.billingPeriod, billingAnchorDay: payload.input.billingAnchorDay, firstCompetence: payload.input.firstCompetence, defaultAmountCents: payload.input.amountCents, currency: "BRL", activatedAt: timestamp, activatedByUid: actor.uid, activatedByEmail: actor.email };
    const invoice = { ...payload.firstInvoice, createdAt: timestamp, updatedAt: timestamp };
    const audit = { id: eventId("activation", idempotencyKey), type: "financial_activation", idempotencyKey, clientId: payload.input.clientId, contractId: contract.id, invoiceId: invoice.id, actorUid: actor.uid, actorEmail: actor.email, createdAt: timestamp, before: payload.currentAccess, after: payload.projectedAccess };
    const clientPatch = { financialModelVersion: 1, financialMode: "active", activeContractId: contract.id, financialStatus: payload.projectedAccess.status, financialRestriction: payload.projectedAccess.restriction, financialDaysOverdue: payload.projectedAccess.daysOverdue, financialReferenceInvoiceId: payload.projectedAccess.referenceInvoiceId, financialUpdatedAt: timestamp };
    return repository.activate({ clientId: payload.input.clientId, clientPatch, contract, invoice, audit, idempotencyKey });
  }

  return { previewActivation, confirmActivation };
}

module.exports = { createBillingService, validateActivation, eventId };
