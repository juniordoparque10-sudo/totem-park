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
  function financialPatch(state, timestamp) {
    return { financialStatus: state.status, financialRestriction: state.restriction, financialDaysOverdue: state.daysOverdue, financialReferenceInvoiceId: state.referenceInvoiceId, financialUpdatedAt: timestamp };
  }
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

  async function settleInvoice(actor, { clientId, invoiceId: targetInvoiceId, idempotencyKey, paidAt }) {
    const invoice = await repository.getInvoice(clientId, targetInvoiceId);
    if (!invoice) throw new Error("invoice-not-found");
    if (invoice.status === "paid") {
      if (invoice.settlementIdempotencyKey === idempotencyKey) return { repeated: true, invoice };
      throw new Error("invoice-already-paid");
    }
    if (!["pending", "overdue"].includes(invoice.status)) throw new Error("invoice-not-payable");
    const timestamp = now().toISOString();
    const audit = { id: eventId("settlement", idempotencyKey), type: "invoice_settled", idempotencyKey, clientId, invoiceId: targetInvoiceId, contractId: invoice.contractId, actorUid: actor.uid, actorEmail: actor.email, createdAt: timestamp };
    const result = await repository.mutateInvoice({
      clientId, invoiceId: targetInvoiceId, audit, resolveNotifications: true,
      mutate: (current) => ({ ...current, status: "paid", paymentOrigin: "manual_admin", paidAt: paidAt || timestamp, confirmedAt: timestamp, confirmedByUid: actor.uid, confirmedByEmail: actor.email, settlementIdempotencyKey: idempotencyKey, updatedAt: timestamp }),
      buildClientPatch: (invoices) => financialPatch(evaluateFinancialState({ invoices, today: isoDay(now()) }), timestamp),
    });
    return { repeated: false, invoice: result };
  }

  async function reverseSettlement(actor, { clientId, invoiceId: targetInvoiceId, idempotencyKey, reason }) {
    if (!String(reason || "").trim()) throw new Error("reversal-reason-required");
    const invoice = await repository.getInvoice(clientId, targetInvoiceId);
    if (!invoice) throw new Error("invoice-not-found");
    if (invoice.reversalIdempotencyKey === idempotencyKey) return { repeated: true, invoice };
    if (invoice.status !== "paid") throw new Error("invoice-not-paid");
    const timestamp = now().toISOString();
    const reopenedStatus = invoice.dueDate < isoDay(now()) ? "overdue" : "pending";
    const audit = { id: eventId("reversal", idempotencyKey), type: "settlement_reversed", idempotencyKey, reason: String(reason).trim(), clientId, invoiceId: targetInvoiceId, contractId: invoice.contractId, actorUid: actor.uid, actorEmail: actor.email, createdAt: timestamp, previousPayment: { paidAt: invoice.paidAt, confirmedByUid: invoice.confirmedByUid, paymentOrigin: invoice.paymentOrigin } };
    const result = await repository.mutateInvoice({
      clientId, invoiceId: targetInvoiceId, audit, resolveNotifications: false,
      mutate: (current) => ({ ...current, status: reopenedStatus, reversedAt: timestamp, reversedByUid: actor.uid, reversedByEmail: actor.email, reversalReason: String(reason).trim(), reversalIdempotencyKey: idempotencyKey, updatedAt: timestamp }),
      buildClientPatch: (invoices) => financialPatch(evaluateFinancialState({ invoices, today: isoDay(now()) }), timestamp),
    });
    return { repeated: false, invoice: result };
  }

  async function previewReversion(actor, { clientId }) {
    const client = await repository.getClient(clientId);
    if (!client || client.financialModelVersion !== 1 || client.financialMode !== "active" || !client.activeContractId) throw new Error("financial-model-not-active");
    const invoices = await repository.getOpenInvoices(clientId);
    const currentAccess = evaluateFinancialState({ invoices, today: isoDay(now()) });
    const projectedAccess = legacyFinancial(client, isoDay(now()));
    const requiresOperationalChangeConfirmation = currentAccess.restriction !== projectedAccess.restriction;
    const payload = { actorUid: actor.uid, clientId, contractId: client.activeContractId, clientVersion: clientVersion(client), currentAccess, projectedAccess, requiresOperationalChangeConfirmation };
    return { previewToken: createPreviewToken(payload, { purpose: "reversion", clientVersion: payload.clientVersion, secret: previewSecret }), currentAccess, projectedAccess, requiresOperationalChangeConfirmation, operationalChange: requiresOperationalChangeConfirmation ? { from: currentAccess.restriction, to: projectedAccess.restriction } : null };
  }

  async function confirmReversion(actor, { previewToken, idempotencyKey, operationalChangeConfirmed = false }) {
    const payload = readPreviewTokenPayload(previewToken);
    const client = await repository.getClient(payload.clientId);
    verifyPreviewToken(previewToken, payload, { purpose: "reversion", clientVersion: clientVersion(client), secret: previewSecret });
    if (payload.actorUid !== actor.uid) throw new Error("preview-actor-mismatch");
    if (payload.requiresOperationalChangeConfirmation && !operationalChangeConfirmed) throw new Error("operational-confirmation-required");
    const timestamp = now().toISOString();
    const audit = { id: eventId("reversion", idempotencyKey), type: "financial_reversion", idempotencyKey, clientId: payload.clientId, contractId: payload.contractId, actorUid: actor.uid, actorEmail: actor.email, createdAt: timestamp, before: payload.currentAccess, after: payload.projectedAccess };
    await repository.revert({ clientId: payload.clientId, contractId: payload.contractId, audit, clientPatch: { financialMode: "reverted", activeContractId: null, ...financialPatch(payload.projectedAccess, timestamp) } });
    return { repeated: false, financialMode: "reverted" };
  }

  return { previewActivation, confirmActivation, settleInvoice, reverseSettlement, previewReversion, confirmReversion };
}

module.exports = { createBillingService, validateActivation, eventId };
