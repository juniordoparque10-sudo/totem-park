import { normalizeDynamicCollection } from "../dynamic-collections/config.js";

export function normalizeSmartLobbyConfig(value = {}) {
  const intervalSeconds = Math.max(5, Math.min(60, Number.isFinite(Number(value.rotation?.intervalSeconds)) ? Number(value.rotation.intervalSeconds) : Number(value.rotation?.featuredSeconds) || 8));
  const normalized = normalizeDynamicCollection({ layout:"A",secondarySlots:3,...value,rotation:{ ...(value.rotation || {}),featuredSeconds:intervalSeconds,secondarySeconds:intervalSeconds } });
  return { ...normalized, rotation:{ ...normalized.rotation, intervalSeconds } };
}
