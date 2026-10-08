"use strict";

function civilDateInTimeZone(date = new Date(), timeZone = "America/Sao_Paulo") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const DAY_MS = 86400000;

function parseCivilDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) throw new Error("invalid-civil-date");
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > daysInMonth(parts.year, parts.month)) {
    throw new Error("invalid-civil-date");
  }
  return parts;
}

function formatCivilDate({ year, month, day }) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampAnchorDay(year, month, anchorDay) {
  return Math.min(Math.max(1, Number(anchorDay)), daysInMonth(year, month));
}

function nextDueDate({ dueDate, billingPeriod, anchorDay }) {
  const current = parseCivilDate(dueDate);
  const target = billingPeriod === "annual"
    ? { year: current.year + 1, month: current.month }
    : { year: current.month === 12 ? current.year + 1 : current.year, month: current.month === 12 ? 1 : current.month + 1 };
  return formatCivilDate({ ...target, day: clampAnchorDay(target.year, target.month, anchorDay || current.day) });
}

function normalizeCompetence({ billingPeriod, competence }) {
  const value = String(competence || "");
  if (billingPeriod === "annual") {
    if (!/^\d{4}$/.test(value)) throw new Error("invalid-competence");
    return value;
  }
  const match = /^(\d{4})-(\d{1,2})$/.exec(value);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) throw new Error("invalid-competence");
  return `${match[1]}-${String(Number(match[2])).padStart(2, "0")}`;
}

function nextCompetence({ billingPeriod, competence }) {
  const normalized = normalizeCompetence({ billingPeriod, competence });
  if (billingPeriod === "annual") return String(Number(normalized) + 1);
  const [year, month] = normalized.split("-").map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
}

function invoiceId(contractId, competence) {
  return `${String(contractId).replace(/[^a-zA-Z0-9_-]/g, "_")}__${String(competence).replace(/[^0-9-]/g, "")}`;
}

function utcDay(value) {
  const { year, month, day } = parseCivilDate(value);
  return Date.UTC(year, month - 1, day);
}

function daysOverdue(dueDate, today) {
  return Math.max(0, Math.floor((utcDay(today) - utcDay(dueDate)) / DAY_MS));
}

function restrictionForDays(days) {
  if (days >= 15) return "suspended";
  if (days >= 10) return "strong";
  if (days >= 5) return "partial";
  if (days >= 1) return "warning";
  return "none";
}

function evaluateFinancialState({ invoices = [], today }) {
  const open = invoices.filter((invoice) => ["pending", "overdue"].includes(invoice.status));
  const overdue = open.filter((invoice) => daysOverdue(invoice.dueDate, today) > 0)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  const reference = overdue[0] || open.sort((left, right) => left.dueDate.localeCompare(right.dueDate))[0] || null;
  const overdueDays = reference ? daysOverdue(reference.dueDate, today) : 0;
  return {
    status: overdueDays > 0 ? "overdue" : reference ? "pending" : "paid",
    restriction: restrictionForDays(overdueDays),
    daysOverdue: overdueDays,
    referenceInvoiceId: reference?.id || null,
    nextInvoice: open.sort((left, right) => left.dueDate.localeCompare(right.dueDate))[0] || null,
  };
}

function combineOperationalAccess({ financial, clientStatus, suspensionReason }) {
  if (clientStatus === "Cancelado") return { restriction: "suspended", cause: "contractual" };
  if (clientStatus === "Suspenso" && !String(suspensionReason || "").toLowerCase().includes("inadimpl")) {
    return { restriction: "suspended", cause: "administrative" };
  }
  return { ...financial, cause: financial.restriction === "none" ? "none" : "financial" };
}

module.exports = {
  civilDateInTimeZone,
  parseCivilDate, formatCivilDate, daysInMonth, clampAnchorDay, nextDueDate,
  normalizeCompetence, nextCompetence, invoiceId, daysOverdue,
  evaluateFinancialState, combineOperationalAccess,
};
