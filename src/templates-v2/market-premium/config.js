import { getDynamicRotationFrame, normalizeDynamicRotation } from "../dynamic-layout/rotation.js";

const cleanText = (value, max) => String(value || "").trim().slice(0, max);

export function normalizeMarketPremiumConfig(config = {}) {
  let activeCount = 0;
  const catalog = (Array.isArray(config.catalog) ? config.catalog : []).slice(0, 40).map((item, index) => {
    const active = item.active !== false && activeCount < 24;
    if (active) activeCount += 1;
    return { id: cleanText(item.id || `product-${index + 1}`, 80), name: cleanText(item.name, 80), category: cleanText(item.category, 40), normalPrice: item.normalPrice === "" || item.normalPrice == null ? null : Number(item.normalPrice), promotionalPrice: Number(item.promotionalPrice || 0), unit: cleanText(item.unit || "un", 16), badge: cleanText(item.badge, 32), image: item.image || null, order: Number.isFinite(Number(item.order)) ? Number(item.order) : index, active };
  }).sort((a, b) => a.order - b.order);
  const categories = [...new Set(catalog.map((item) => item.category).filter(Boolean))].slice(0, 12);
  const intervalSeconds = Math.max(5, Math.min(60, Number.isFinite(Number(config.rotation?.intervalSeconds)) ? Number(config.rotation.intervalSeconds) : 10));
  return { layout: ["A", "B"].includes(config.layout) ? config.layout : "A", segment: cleanText(config.segment || "Mercado", 40), categories, catalog, rotation: { ...normalizeDynamicRotation({ ...config.rotation, featuredSeconds:intervalSeconds, secondarySeconds:intervalSeconds }), intervalSeconds } };
}

const imageUrl = (asset) => String(asset?.url || asset?.preview || asset?.publicUrl || asset?.remotePreview || "").trim();

export function getMarketPreloadImageUrls(config = {}, { secondarySlots = 6, frameCount = 2, startFrame = 0 } = {}) {
  const normalized = normalizeMarketPremiumConfig(config);
  const active = normalized.catalog.filter((item) => item.active);
  const urls = new Set();
  for (let frameIndex = 0; frameIndex < Math.max(1, frameCount); frameIndex += 1) {
    const frame = getDynamicRotationFrame({ itemIds:active.map((item) => item.id), elapsedMs:(startFrame + frameIndex) * normalized.rotation.intervalSeconds * 1000, effectiveDurationMs:Infinity, ...normalized.rotation, secondarySlots });
    [frame.featuredId, ...frame.secondaryIds].forEach((id) => {
      const url = imageUrl(active.find((item) => item.id === id)?.image);
      if (url) urls.add(url);
    });
  }
  return [...urls];
}

export function selectMarketFrame(config = {}, frameOptions = {}) {
  const normalized = normalizeMarketPremiumConfig(config);
  const active = normalized.catalog.filter((item) => item.active);
  const frame = getDynamicRotationFrame({ itemIds: active.map((item) => item.id), ...normalized.rotation, ...frameOptions });
  return { ...frame, featured: active.find((item) => item.id === frame.featuredId) || null, secondary: frame.secondaryIds.map((id) => active.find((item) => item.id === id)).filter(Boolean) };
}
