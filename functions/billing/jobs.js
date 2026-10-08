"use strict";

const { invoiceId, nextDueDate, nextCompetence, daysOverdue, parseCivilDate } = require("./domain");
const { eventId } = require("./service");
const { processEmailDelivery, disabledEmailProvider } = require("./email");

function addDays(value, days) {
  const parts = parseCivilDate(value);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days)).toISOString().slice(0, 10);
}

function notificationEvent(invoice, today) {
  const overdue = daysOverdue(invoice.dueDate, today);
  const until = Math.round((Date.parse(`${invoice.dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (until === 5) return ["due_soon_5d", "warning"];
  if (until === 0) return ["due_today", "today"];
  if (overdue === 5) return ["restriction_5d", "partial"];
  if (overdue === 10) return ["restriction_10d", "strong"];
  if (overdue === 15) return ["suspension_15d", "suspended"];
  if (overdue > 0) return ["overdue", "danger"];
  return null;
}

function createBillingJobs({ repository, today = () => new Date().toISOString().slice(0, 10), emailProvider = disabledEmailProvider, pageSize = 100 }) {
  async function generateEligibleInvoices(cursor = null) {
    const cutoff = addDays(today(), 35);
    const page = await repository.listEligibleContracts({ cutoff, cursor, limit: pageSize });
    let created = 0;
    for (const contract of page.items) {
      if (contract.status !== "active" || contract.financialMode !== "active" || contract.nextInvoiceDueDate > contract.endDate || contract.nextInvoiceDueDate > cutoff) continue;
      const invoice = { id: invoiceId(contract.id, contract.nextCompetence), clientId: contract.clientId, contractId: contract.id, schemaVersion: 1, competence: contract.nextCompetence, billingPeriod: contract.billingPeriod, amountCents: contract.defaultAmountCents, currency: contract.currency || "BRL", dueDate: contract.nextInvoiceDueDate, status: contract.nextInvoiceDueDate < today() ? "overdue" : "pending", paymentOrigin: null, externalReference: null };
      if (await repository.createInvoiceIfAbsent(invoice)) created += 1;
      const due = nextDueDate({ dueDate: contract.nextInvoiceDueDate, billingPeriod: contract.billingPeriod, anchorDay: contract.billingAnchorDay });
      const competence = nextCompetence({ billingPeriod: contract.billingPeriod, competence: contract.nextCompetence });
      await repository.updateContractNextDue(contract.id, due, competence, contract.clientId);
    }
    await repository.saveCheckpoint({ job: "invoice-generation", cursor: page.nextCursor || null, completedAt: new Date().toISOString() });
    return { created, nextCursor: page.nextCursor || null };
  }

  async function processEligibleInvoiceEvents(cursor = null) {
    const page = await repository.listEligibleInvoices({ today: today(), cursor, limit: pageSize });
    let processed = 0;
    for (const invoice of page.items) {
      if (!["pending", "overdue"].includes(invoice.status)) continue;
      const event = notificationEvent(invoice, today());
      if (!event) continue;
      const [eventType, severity] = event;
      const notification = { id: eventId("notice", `${invoice.id}:${eventType}`), clientId: invoice.clientId, contractId: invoice.contractId, invoiceId: invoice.id, competence: invoice.competence, eventType, severity, status: "active", deduplicationKey: `${invoice.id}:${eventType}`, title: eventType === "due_today" ? "Cobrança vence hoje" : "Atualização da cobrança", message: `Competência ${invoice.competence} — vencimento ${invoice.dueDate}.` };
      await repository.createNotificationIfAbsent(notification);
      await repository.saveDelivery(await processEmailDelivery({ invoice, eventType, provider: emailProvider }));
      processed += 1;
    }
    await repository.saveCheckpoint({ job: "invoice-events", cursor: page.nextCursor || null, completedAt: new Date().toISOString() });
    return { processed, nextCursor: page.nextCursor || null };
  }

  async function runBillingCycle() {
    const generation = await generateEligibleInvoices();
    const events = await processEligibleInvoiceEvents();
    return { generation, events };
  }
  return { generateEligibleInvoices, processEligibleInvoiceEvents, runBillingCycle };
}

module.exports = { createBillingJobs, notificationEvent };
