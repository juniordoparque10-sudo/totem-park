export function isFinancialModelActive(client) {
  return client?.financialModelVersion === 1 && client?.financialMode === "active";
}

function financialMessage(restriction, days) {
  if (restriction === "suspended") return "Seu plano foi temporariamente suspenso por inadimplência. Regularize para reativar o serviço.";
  if (restriction === "strong") return `Pagamento atrasado há ${days} dias. O sistema está em modo de visualização.`;
  if (restriction === "partial") return `Pagamento atrasado há ${days} dias. Novas criações estão temporariamente bloqueadas.`;
  if (restriction === "warning") return `Pagamento atrasado há ${days} dia(s). Regularize para evitar restrições.`;
  return "Cobrança em dia. Todos os recursos estão disponíveis.";
}

export function getEffectivePlanAccess(client, legacyEvaluator) {
  if (!isFinancialModelActive(client)) return legacyEvaluator(client);
  const administrative = client.status === "Cancelado" || (client.status === "Suspenso" && !String(client.suspensionReason || "").toLowerCase().includes("inadimpl"));
  const restriction = administrative ? "suspended" : (client.financialRestriction || "none");
  const days = Number(client.financialDaysOverdue || 0);
  const isSuspended = restriction === "suspended";
  const isStrongRestriction = restriction === "strong";
  const isPartialRestriction = restriction === "partial";
  const canCreate = !isSuspended && !isStrongRestriction && !isPartialRestriction;
  const canEdit = !isSuspended && !isStrongRestriction;
  const message = administrative ? "Acesso bloqueado por motivo administrativo ou contratual." : financialMessage(restriction, days);
  return {
    statusLabel: administrative ? client.status : restriction === "none" ? "Ativo" : restriction === "warning" ? "Vencido" : restriction === "partial" ? "Restrição Parcial" : restriction === "strong" ? "Restrição Forte" : "Suspenso",
    daysOverdue: days, isActive: restriction === "none", isOverdue: days > 0,
    isPartialRestriction, isStrongRestriction, isSuspended, hasTemporaryUnlock: false,
    canUseSystem: !isSuspended, canCreate, canEdit, canUpload: canCreate,
    canCreateScreens: canCreate, canCreatePlaylists: canCreate, canCreateTemplates: canCreate, canCreateMarketing: canCreate,
    canEditScreens: canEdit, canEditPlaylists: canEdit, canEditTemplates: canEdit, canEditMarketing: canEdit,
    canShowTvContent: !isSuspended, message,
    severity: isSuspended ? "suspended" : isStrongRestriction ? "strong" : isPartialRestriction ? "partial" : restriction === "warning" ? "warning" : "success",
    cause: administrative ? "administrative" : restriction === "none" ? "none" : "financial",
  };
}

function civilDay(value) { return Date.parse(`${value}T00:00:00Z`); }

export function getFinancialCardState(client, invoice, today = new Date().toISOString().slice(0, 10)) {
  if (!invoice) return { title: client?.billing === "Anual" ? "Próxima cobrança anual" : "Próxima mensalidade", tone: "neutral", status: "Sem cobrança aberta", days: null };
  const difference = Math.round((civilDay(invoice.dueDate) - civilDay(today)) / 86400000);
  const annual = invoice.billingPeriod === "annual" || client?.billing === "Anual";
  return {
    title: annual ? "Próxima cobrança anual" : "Próxima mensalidade",
    tone: difference < 0 ? "danger" : difference === 0 ? "today" : difference <= 5 ? "warning" : "success",
    status: difference < 0 ? `Atrasada há ${Math.abs(difference)} dia(s)` : difference === 0 ? "Vence hoje" : `Próximo vencimento em ${difference} dia(s)`,
    days: difference, amountCents: invoice.amountCents, dueDate: invoice.dueDate, competence: invoice.competence,
  };
}
