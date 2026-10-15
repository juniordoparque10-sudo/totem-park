import { normalizeDynamicCollection, selectActiveDynamicItems } from "../dynamic-collections/config.js";

export function normalizeAgendaInfoConfig(value = {}) {
  const normalized = normalizeDynamicCollection({ layout:"A",secondarySlots:3,rotation:{featuredSeconds:8,secondarySeconds:5,transition:"fade"},...value });
  return { ...normalized,items:normalized.items.map((item)=>({ ...item,eventAt:item.eventAt || "",location:String(item.location || "").trim(),priority:Number(item.priority || 0) })) };
}

export function selectAgendaEvents(items = [], now = new Date()) {
  const instant = now.getTime();
  return selectActiveDynamicItems(items,now).filter((item)=>!item.eventAt || Date.parse(item.eventAt) >= instant).sort((left,right)=>(Date.parse(left.eventAt)||Infinity)-(Date.parse(right.eventAt)||Infinity)||(Number(right.priority)||0)-(Number(left.priority)||0));
}
