"use strict";

const crypto = require("node:crypto");
const { parseCivilDate, normalizeCompetence, invoiceId, evaluateFinancialState, nextDueDate, nextCompetence, combineOperationalAccess, civilDateInTimeZone } = require("./domain");
const { createPreviewToken, verifyPreviewToken, readPreviewTokenPayload } = require("./preview-token");

function isoDay(date) { return civilDateInTimeZone(date); }
function eventId(prefix, key) { return `${prefix}-${crypto.createHash("sha256").update(String(key)).digest("hex").slice(0, 24)}`; }
function clientVersion(client) { return String(client.financialRevision ?? client.updatedAtMs ?? "legacy"); }

function operationalAccess(client, financial, today) {
  const combined = combineOperationalAccess({ financial, clientStatus: client.status, suspensionReason: client.suspensionReason });
  if (combined.cause === "financial" && client.graceUnlockUntil && client.graceUnlockUntil >= today) {
    return { ...combined, restriction: "none", cause: "temporary_unlock", hasTemporaryUnlock: true };
  }
  return { ...combined, hasTemporaryUnlock: false };
}

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
    const projectedAccess = operationalAccess(client, evaluateFinancialState({ invoices: [invoice], today: isoDay(now()) }), isoDay(now()));
    const currentAccess = operationalAccess(client, legacyFinancial(client, isoDay(now())), isoDay(now()));
    const requiresOperationalChangeConfirmation = currentAccess.restriction !== projectedAccess.restriction;
    const payload = {
      actorUid: actor.uid, input, clientVersion: clientVersion(client), contractId, firstInvoice: invoice,
      currentAccess, projectedAccess, requiresOperationalChangeConfirmation,
    };
    const upcomingInvoices = [invoice];
    let sampleDueDate = invoice.dueDate, sampleCompetence = invoice.competence;
    while (upcomingInvoices.length < 3) {
      sampleDueDate = nextDueDate({ dueDate: sampleDueDate, billingPeriod: input.billingPeriod, anchorDay: input.billingAnchorDay });
      sampleCompetence = nextCompetence({ billingPeriod: input.billingPeriod, competence: sampleCompetence });
      if (sampleDueDate > input.endDate) break;
      upcomingInvoices.push({ competence: sampleCompetence, dueDate: sampleDueDate, amountCents: input.amountCents });
    }
    return {
      previewToken: createPreviewToken(payload, { purpose: "activation", clientVersion: payload.clientVersion, secret: previewSecret }),
      normalizedContract: { id: contractId, clientId: input.clientId, schemaVersion: 1, planKey: input.planKey, planName: input.planName, startDate: input.startDate, endDate: input.endDate, status: "active", billingPeriod: input.billingPeriod, billingAnchorDay: input.billingAnchorDay, firstCompetence: input.firstCompetence, defaultAmountCents: input.amountCents, currency: "BRL" },
      firstInvoice: invoice, upcomingInvoices, currentAccess, projectedAccess, requiresOperationalChangeConfirmation,
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
    const contract = { id: payload.contractId, clientId: payload.input.clientId, schemaVersion: 1, planKey: payload.input.planKey, planName: payload.input.planName, startDate: payload.input.startDate, endDate: payload.input.endDate, status: "active", financialMode: "active", billingPeriod: payload.input.billingPeriod, billingAnchorDay: payload.input.billingAnchorDay, firstCompetence: payload.input.firstCompetence, nextCompetence: nextCompetence({ billingPeriod: payload.input.billingPeriod, competence: payload.input.firstCompetence }), nextInvoiceDueDate: nextDueDate({ dueDate: payload.input.firstDueDate, billingPeriod: payload.input.billingPeriod, anchorDay: payload.input.billingAnchorDay }), defaultAmountCents: payload.input.amountCents, currency: "BRL", activatedAt: timestamp, activatedByUid: actor.uid, activatedByEmail: actor.email };
    const invoice = { ...payload.firstInvoice, createdAt: timestamp, updatedAt: timestamp };
    const audit = { id: eventId("activation", idempotencyKey), type: "financial_activation", idempotencyKey, clientId: payload.input.clientId, contractId: contract.id, invoiceId: invoice.id, actorUid: actor.uid, actorEmail: actor.email, createdAt: timestamp, before: payload.currentAccess, after: payload.projectedAccess };
    const clientPatch = { financialModelVersion: 1, financialMode: "active", activeContractId: contract.id, financialStatus: payload.projectedAccess.status, financialRestriction: payload.projectedAccess.restriction, financialDaysOverdue: payload.projectedAccess.daysOverdue, financialReferenceInvoiceId: payload.projectedAccess.referenceInvoiceId, financialUpdatedAt: timestamp };
    return repository.activate({ clientId: payload.input.clientId, expectedClientVersion: payload.clientVersion, clientPatch, contract, invoice, audit, idempotencyKey });
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
      mutate: (current) => {
        if (current.status === "paid" && current.settlementIdempotencyKey === idempotencyKey) return { repeated: true, invoice: current };
        if (current.status === "paid") throw new Error("invoice-already-paid");
        if (!["pending", "overdue"].includes(current.status)) throw new Error("invoice-not-payable");
        return { repeated: false, invoice: { ...current, status: "paid", paymentOrigin: "manual_admin", paidAt: paidAt || timestamp, confirmedAt: timestamp, confirmedByUid: actor.uid, confirmedByEmail: actor.email, settlementIdempotencyKey: idempotencyKey, updatedAt: timestamp } };
      },
      buildClientPatch: (invoices) => financialPatch(evaluateFinancialState({ invoices, today: isoDay(now()) }), timestamp),
    });
    return result;
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
      mutate: (current) => {
        if (current.reversalIdempotencyKey === idempotencyKey) return { repeated: true, invoice: current };
        if (current.status !== "paid") throw new Error("invoice-not-paid");
        return { repeated: false, invoice: { ...current, status: reopenedStatus, reversedAt: timestamp, reversedByUid: actor.uid, reversedByEmail: actor.email, reversalReason: String(reason).trim(), reversalIdempotencyKey: idempotencyKey, updatedAt: timestamp } };
      },
      buildClientPatch: (invoices) => financialPatch(evaluateFinancialState({ invoices, today: isoDay(now()) }), timestamp),
    });
    return result;
  }

  async function previewReversion(actor, { clientId }) {
    const client = await repository.getClient(clientId);
    if (!client || client.financialModelVersion !== 1 || client.financialMode !== "active" || !client.activeContractId) throw new Error("financial-model-not-active");
    const invoices = await repository.getOpenInvoices(clientId);
    const currentAccess = operationalAccess(client, evaluateFinancialState({ invoices, today: isoDay(now()) }), isoDay(now()));
    const projectedAccess = operationalAccess(client, legacyFinancial(client, isoDay(now())), isoDay(now()));
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
    const result = await repository.revert({ clientId: payload.clientId, contractId: payload.contractId, expectedClientVersion: payload.clientVersion, audit, clientPatch: { financialMode: "reverted", activeContractId: null, ...financialPatch(payload.projectedAccess, timestamp) } });
    return { ...result, financialMode: "reverted" };
  }

  async function renewContract(actor, { clientId, newEndDate, idempotencyKey }) {
    parseCivilDate(newEndDate);
    const client = await repository.getClient(clientId);
    if (!client || client.financialMode !== "active" || !client.activeContractId) throw new Error("financial-model-not-active");
    const contract = await repository.getContract(clientId, client.activeContractId);
    if (!contract || !["active", "expired"].includes(contract.status)) throw new Error("financial-contract-not-renewable");
    if (newEndDate <= contract.endDate) throw new Error("renewal-must-extend-contract");
    const timestamp = now().toISOString();
    const audit = { id: eventId("renewal", idempotencyKey), type: "contract_renewed", idempotencyKey, clientId, contractId: contract.id, actorUid: actor.uid, actorEmail: actor.email, createdAt: timestamp, before: { endDate: contract.endDate }, after: { endDate: newEndDate } };
    return repository.renew({ clientId, contractId: contract.id, expectedEndDate: contract.endDate, newEndDate, audit });
  }

  return { previewActivation, confirmActivation, settleInvoice, reverseSettlement, previewReversion, confirmReversion, renewContract };
}

module.exports = { createBillingService, validateActivation, eventId };
