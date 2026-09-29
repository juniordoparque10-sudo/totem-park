export const TEMPLATES_V2_OVERRIDE = Object.freeze({
  INHERITED: "inherited",
  ALLOWED: "allowed",
  BLOCKED: "blocked",
});

const PLAN_ACCESS = Object.freeze({
  demonstracao: false,
  start: false,
  business: false,
  professional: true,
  enterprise: true,
});

export function normalizeTemplatesV2Override(value) {
  return Object.values(TEMPLATES_V2_OVERRIDE).includes(value) ? value : TEMPLATES_V2_OVERRIDE.INHERITED;
}
export function resolveTemplatesV2Entitlement({ planKey, override, isMaster = false } = {}) {
  const normalizedOverride = normalizeTemplatesV2Override(override);
  if (isMaster) return { allowed: true, source: "master", override: normalizedOverride };
  if (normalizedOverride === TEMPLATES_V2_OVERRIDE.ALLOWED) return { allowed: true, source: "override", override: normalizedOverride };
  if (normalizedOverride === TEMPLATES_V2_OVERRIDE.BLOCKED) return { allowed: false, source: "override", override: normalizedOverride };
  return { allowed: PLAN_ACCESS[String(planKey || "").toLowerCase()] === true, source: "plan", override: normalizedOverride };
}
