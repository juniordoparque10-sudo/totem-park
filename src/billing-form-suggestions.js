const PLAN_MONTHLY_PRICES = Object.freeze({
  demonstracao: 0,
  start: 49.9,
  business: 99,
  professional: 199,
  enterprise: 299,
});

function normalizePlan(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
}

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
}

function formatDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function contractEndDate(startDate) {
  const parts = parseDate(startDate);
  if (!parts) return "";
  const anniversary = new Date(Date.UTC(parts.year + 1, parts.month - 1, parts.day));
  anniversary.setUTCDate(anniversary.getUTCDate() - 1);
  return formatDate(anniversary);
}

function daysInMonth(year, month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
function dueDateFor({ startDate, billingPeriod, firstCompetence, billingAnchorDay }) {
  const start = parseDate(startDate);
  if (!start) return "";
  if (billingPeriod === "annual") {
    const year = Number(firstCompetence || start.year);
    return `${year}-${String(start.month).padStart(2, "0")}-${String(Math.min(Number(billingAnchorDay || start.day), daysInMonth(year, start.month))).padStart(2, "0")}`;
  }
  const match = /^(\d{4})-(\d{2})$/.exec(String(firstCompetence || ""));
  if (!match) return "";
  const year = Number(match[1]), month = Number(match[2]);
  const day = Math.min(Number(billingAnchorDay || start.day), daysInMonth(year, month));
  const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return candidate < startDate && firstCompetence === startDate.slice(0, 7) ? startDate : candidate;
}

export function buildClassificationSuggestions({ client = {}, startDate = "", billingPeriod = "monthly", firstCompetence, billingAnchorDay } = {}) {
  const start = parseDate(startDate);
  const anchor = Number(billingAnchorDay || start?.day || 1);
  const competence = firstCompetence || (start ? (billingPeriod === "annual" ? String(start.year) : startDate.slice(0, 7)) : "");
  const price = Number(client.planPriceMonthly ?? PLAN_MONTHLY_PRICES[normalizePlan(client.plan)] ?? 0);
  return {
    endDate: contractEndDate(startDate),
    billingAnchorDay: anchor,
    firstCompetence: competence,
    firstDueDate: dueDateFor({ startDate, billingPeriod, firstCompetence: competence, billingAnchorDay: anchor }),
    amount: price.toFixed(2).replace(".", ","),
  };
}

export function mergeUntouchedSuggestions(current, suggestions, touched = {}) {
  return Object.keys(suggestions).reduce((next, key) => touched[key] ? next : { ...next, [key]: suggestions[key] }, { ...current });
}
