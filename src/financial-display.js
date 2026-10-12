const MONTHS_PT_BR = Object.freeze([
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]);

const STATUS_LABELS = Object.freeze({ pending: "Pendente", paid: "Pago", overdue: "Atrasado", canceled: "Cancelado" });
const AUDIT_LABELS = Object.freeze({
  financial_activation: "Classificação financeira ativada",
  invoice_settled: "Mensalidade marcada como paga",
  settlement_reversed: "Quitação corrigida",
  contract_renewed: "Vigência contratual renovada",
  contract_updated: "Contrato financeiro atualizado",
  invoice_settled_batch: "Mensalidade quitada em lote",
  financial_reversion: "Retorno ao modelo legado",
});

export function formatCivilDateBr(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || "—");
}

export function formatBillingCompetence(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
  if (!match) return String(value || "—");
  return `${MONTHS_PT_BR[Number(match[2]) - 1] || match[2]}/${match[1]}`;
}

export function financialStatusLabel(value) { return STATUS_LABELS[value] || String(value || "—"); }
export function auditEventLabel(value) { return AUDIT_LABELS[value] || String(value || "Evento financeiro"); }

export function billingNotificationCopy(notification = {}, invoice = {}) {
  const titles = {
    due_soon_5d: "Sua mensalidade vence em 5 dias.", due_today: "Sua mensalidade vence hoje.",
    overdue: "Sua mensalidade está atrasada.", restriction_5d: "Sua mensalidade está atrasada há 5 dias.",
    restriction_10d: "Sua mensalidade está atrasada há 10 dias.", suspension_15d: "Sua mensalidade está atrasada há 15 dias.",
  };
  if (!invoice.dueDate || !Number.isFinite(Number(invoice.amountCents))) return { title: titles[notification.eventType] || "Atualização da mensalidade.", detail: "Consulte os detalhes da mensalidade no painel financeiro." };
  const amount = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(invoice.amountCents) / 100);
  return { title: titles[notification.eventType] || "Atualização da mensalidade.", detail: `Valor: ${amount} · Vencimento: ${formatCivilDateBr(invoice.dueDate)}.` };
}

export function selectHeaderInvoice(invoices = []) {
  const open = invoices.filter((item) => ["pending", "overdue"].includes(item.status));
  return open.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0] || null;
}

export function selectClientDueDate(client, invoices = []) {
  if (client?.financialModelVersion === 1 && client?.financialMode === "active") {
    return selectHeaderInvoice(invoices)?.dueDate || null;
  }
  return client?.dueDate || null;
}
