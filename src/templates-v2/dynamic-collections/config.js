const ALLOWED_SOURCES = new Set(["manual","rss","weather","clock","configured-value"]);
const clean = (value) => String(value || "").trim();
const validTime = (value) => {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
};

export function normalizeDynamicCollection(config = {}, options = {}) {
  const maxItems = Math.max(1,Number(options.maxItems || 40));
  const maxCategories = Math.max(1,Number(options.maxCategories || 12));
  const items = (Array.isArray(config.items) ? config.items : []).slice(0,maxItems).map((item,index)=>({
    ...item,
    id:clean(item?.id) || `item-${index + 1}`,
    title:clean(item?.title),
    subtitle:clean(item?.subtitle),
    order:Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
    active:item?.active !== false,
    source:ALLOWED_SOURCES.has(item?.source) ? item.source : "manual",
    startsAt:validTime(item?.startsAt) === null ? "" : new Date(validTime(item.startsAt)).toISOString(),
    endsAt:validTime(item?.endsAt) === null ? "" : new Date(validTime(item.endsAt)).toISOString(),
  }));
  const categories = [...new Set((Array.isArray(config.categories) ? config.categories : []).map(clean).filter(Boolean))].slice(0,maxCategories);
  return { ...config, items, categories, secondarySlots:Math.max(1,Math.min(3,Math.trunc(Number(config.secondarySlots)) || 3)) };
}

export function selectActiveDynamicItems(items = [], now = new Date()) {
  const instant = now instanceof Date ? now.getTime() : new Date(now).getTime();
  return (Array.isArray(items) ? items : []).filter((item)=>{
    if (item?.active === false || !clean(item?.title)) return false;
    const startsAt = validTime(item.startsAt);
    const endsAt = validTime(item.endsAt);
    return !(startsAt !== null && startsAt > instant) && !(endsAt !== null && endsAt < instant);
  }).sort((left,right)=>(Number(left.order)||0)-(Number(right.order)||0)||clean(left.id).localeCompare(clean(right.id))).slice(0,24);
}
