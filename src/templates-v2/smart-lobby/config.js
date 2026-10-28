import { normalizeDynamicCollection } from "../dynamic-collections/config.js";

export function getSmartLobbyPanelAlpha(config = {}) {
  return (100 - Math.max(0, Math.min(100, Number(config.style?.panelTransparency ?? 0)))) / 100;
}

export function getSmartLobbyOverlayAlpha(config = {}) {
  return Math.max(0, Math.min(100, Number(config.style?.overlayOpacity ?? 0))) / 100;
}

export function normalizeSmartLobbyConfig(value = {}) {
  const intervalSeconds = Math.max(5, Math.min(60, Number.isFinite(Number(value.rotation?.intervalSeconds)) ? Number(value.rotation.intervalSeconds) : Number(value.rotation?.featuredSeconds) || 8));
  const normalized = normalizeDynamicCollection({ layout:"A",secondarySlots:3,...value,rotation:{ ...(value.rotation || {}),featuredSeconds:intervalSeconds,secondarySeconds:intervalSeconds } });
  const scale = (input) => Math.max(80, Math.min(140, Math.round((Number(input) || 100) / 5) * 5));
  const typography = { titleScale:scale(value.typography?.titleScale), primaryTextScale:scale(value.typography?.primaryTextScale), secondaryTextScale:scale(value.typography?.secondaryTextScale) };
  return { ...normalized, typography, rotation:{ ...normalized.rotation, intervalSeconds } };
}
