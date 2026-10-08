"use strict";

const { eventId } = require("./service");

const disabledEmailProvider = Object.freeze({ configured: false, async send() { throw new Error("email-provider-not-configured"); } });

function buildBillingEmail({ clientName, invoice, planName }) {
  return { subject: "Lembrete de mensalidade — Totem Park", text: `Olá, ${clientName}.\n\nSua cobrança do Totem Park vence em ${invoice.dueDate}.\n\nPlano: ${planName}\nValor: R$ ${(invoice.amountCents / 100).toFixed(2).replace(".", ",")}\n\nCaso o pagamento já tenha sido realizado, desconsidere esta mensagem.\n\nPark Solutions — Totem Park` };
}

async function processEmailDelivery({ invoice, eventType, provider = disabledEmailProvider, now = new Date().toISOString() }) {
  const base = { id: eventId("email", `${invoice.id}:${eventType}`), clientId: invoice.clientId, contractId: invoice.contractId, invoiceId: invoice.id, competence: invoice.competence, eventType, updatedAt: now, sentAt: null, providerReference: null };
  if (invoice.status === "paid" || invoice.status === "canceled") return { ...base, status: "not_configured", skippedReason: "invoice-not-open" };
  if (!provider?.configured) return { ...base, status: "not_configured", skippedReason: "provider-not-configured" };
  try {
    const response = await provider.send(invoice, eventType);
    if (!response?.confirmed) return { ...base, status: "pending" };
    return { ...base, status: "sent", sentAt: now, providerReference: response.reference || null };
  } catch (error) {
    return { ...base, status: "failed", errorCode: String(error?.code || "send-failed").slice(0, 80), errorMessage: String(error?.message || "Email delivery failed").slice(0, 160) };
  }
}

module.exports = { disabledEmailProvider, buildBillingEmail, processEmailDelivery };
