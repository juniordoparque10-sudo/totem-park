"use strict";

const { invoiceId, nextDueDate, nextCompetence, daysOverdue, parseCivilDate, civilDateInTimeZone } = require("./domain");
const { eventId } = require("./service");
const { processEmailDelivery, disabledEmailProvider } = require("./email");

function addDays(value, days) { const parts = parseCivilDate(value); return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days)).toISOString().slice(0, 10); }
function notificationEvent(invoice, today) {
  const overdue = daysOverdue(invoice.dueDate, today);
  const until = Math.round((Date.parse(`${invoice.dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (until === 5) return ["due_soon_5d", "warning"];
  if (until === 0) return ["due_today", "today"];
  if (overdue >= 15) return ["suspension_15d", "suspended"];
  if (overdue >= 10) return ["restriction_10d", "strong"];
  if (overdue >= 5) return ["restriction_5d", "partial"];
  if (overdue > 0) return ["overdue", "danger"];
  return null;
}

function createBillingJobs({ repository, today = () => civilDateInTimeZone(new Date()), emailProvider = disabledEmailProvider, pageSize = 100, maxPages = 50 }) {
  async function initialCursor(job) { const checkpoint = await repository.getCheckpoint?.(job); return checkpoint?.completed === false ? checkpoint.cursor || null : null; }

  async function generateEligibleInvoices(startCursor) {
    const runToday = today(), cutoff = addDays(runToday, 35);
    let cursor = startCursor === undefined ? await initialCursor("invoice-generation") : startCursor;
    let created = 0, pages = 0;
    do {
      const page = await repository.listEligibleContracts({ cutoff, cursor, limit: pageSize });
      for (const contract of page.items) {
        if (contract.status !== "active" || contract.nextInvoiceDueDate > cutoff) continue;
        if (contract.nextInvoiceDueDate > contract.endDate) { await repository.closeContractIfExpired?.(contract); continue; }
        const invoice = { id: invoiceId(contract.id, contract.nextCompetence), clientId: contract.clientId, contractId: contract.id, schemaVersion: 1, competence: contract.nextCompetence, billingPeriod: contract.billingPeriod, amountCents: contract.defaultAmountCents, currency: contract.currency || "BRL", dueDate: contract.nextInvoiceDueDate, status: contract.nextInvoiceDueDate < runToday ? "overdue" : "pending", paymentOrigin: null, externalReference: null };
        const nextInvoiceDueDate = nextDueDate({ dueDate: contract.nextInvoiceDueDate, billingPeriod: contract.billingPeriod, anchorDay: contract.billingAnchorDay });
        const followingCompetence = nextCompetence({ billingPeriod: contract.billingPeriod, competence: contract.nextCompetence });
        if (await repository.createInvoiceAndAdvance({ invoice, nextInvoiceDueDate, nextCompetence: followingCompetence })) created += 1;
      }
      cursor = page.nextCursor || null; pages += 1;
      await repository.saveCheckpoint({ job: "invoice-generation", version: 1, cursor, completed: !cursor, processedAt: new Date().toISOString() });
      if (pages >= maxPages && cursor) return { created, nextCursor: cursor, completed: false, pages };
    } while (cursor);
    return { created, nextCursor: null, completed: true, pages };
  }

  async function processEligibleInvoiceEvents(startCursor) {
    const runToday = today();
    let cursor = startCursor === undefined ? await initialCursor("invoice-events") : startCursor;
    let processed = 0, pages = 0;
    do {
      const page = await repository.listEligibleInvoices({ today: runToday, cursor, limit: pageSize });
      const affectedClients = new Set();
      for (const invoice of page.items) {
        affectedClients.add(invoice.clientId);
        if (!["pending", "overdue"].includes(invoice.status)) continue;
        const event = notificationEvent(invoice, runToday);
        if (!event) continue;
        const [eventType, severity] = event;
        const notification = { id: eventId("notice", `${invoice.id}:${eventType}`), clientId: invoice.clientId, contractId: invoice.contractId, invoiceId: invoice.id, competence: invoice.competence, eventType, severity, status: "active", deduplicationKey: `${invoice.id}:${eventType}`, title: eventType === "due_today" ? "Cobrança vence hoje" : "Atualização da cobrança", message: `Competência ${invoice.competence} — vencimento ${invoice.dueDate}.` };
        const noticeResult = await repository.createNotificationIfEligible(notification);
        if (noticeResult === true || noticeResult?.eligible) {
          const deliveryId = eventId("email", `${invoice.id}:${eventType}`);
          const existing = await repository.getDelivery?.(invoice.clientId, deliveryId);
          if (!existing || existing.status !== "sent") await repository.saveDelivery(await processEmailDelivery({ invoice, eventType, provider: emailProvider }));
          if (noticeResult === true || noticeResult.created) processed += 1;
        }
      }
      for (const clientId of affectedClients) await repository.recalculateClientFinancial(clientId, runToday);
      cursor = page.nextCursor || null; pages += 1;
      await repository.saveCheckpoint({ job: "invoice-events", version: 1, cursor, completed: !cursor, processedAt: new Date().toISOString() });
      if (pages >= maxPages && cursor) return { processed, nextCursor: cursor, completed: false, pages };
    } while (cursor);
    return { processed, nextCursor: null, completed: true, pages };
  }

  async function runBillingCycle() { return { generation: await generateEligibleInvoices(), events: await processEligibleInvoiceEvents() }; }
  return { generateEligibleInvoices, processEligibleInvoiceEvents, runBillingCycle };
}

module.exports = { createBillingJobs, notificationEvent };
