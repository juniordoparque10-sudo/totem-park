import { normalizeDynamicCollection } from "../dynamic-collections/config.js";

const validIso = (value) => Number.isFinite(Date.parse(value || "")) ? new Date(value).toISOString() : "";
export function normalizeKpiIndicatorsConfig(value = {}) {
  const normalized=normalizeDynamicCollection({layout:"A",secondarySlots:3,rotation:{featuredSeconds:8,secondarySeconds:5,transition:"fade"},...value},{maxItems:24});
  return {...normalized,items:normalized.items.map((item)=>{ const numeric=item.value === "" || item.value == null ? null : Number(item.value); const source=item.source === "configured-value" || item.source === "manual" ? "configured-value" : item.source; const hasValue=Number.isFinite(numeric); return {...item,value:hasValue?numeric:null,unit:String(item.unit||"").trim().slice(0,16),source,sourceLabel:!hasValue?"Dados indisponíveis":source === "configured-value" ? "Valor administrado" : String(item.sourceLabel||"").trim() || "Fonte informada",updatedAt:validIso(item.updatedAt)};})};
}
