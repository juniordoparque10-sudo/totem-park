const PIXELS_PER_SECOND = Object.freeze({ slow:45, normal:75, fast:110 });
const FALLBACK_DURATION_SECONDS = Object.freeze({ slow:70, normal:46, fast:28 });

export function getTickerPixelsPerSecond(speed) {
  return PIXELS_PER_SECOND[speed] || PIXELS_PER_SECOND.normal;
}

export function getTickerDurationSeconds(distancePx, speed) {
  const distance = Number(distancePx);
  if (!(distance > 0)) return FALLBACK_DURATION_SECONDS[speed] || FALLBACK_DURATION_SECONDS.normal;
  return Math.max(1, distance / getTickerPixelsPerSecond(speed));
}

export function buildTickerContentModel(items = [], { unavailableLabel = "Notícias temporariamente indisponíveis" } = {}) {
  const headlines = (Array.isArray(items) ? items : [])
    .map((item) => String(item?.title || item?.headline || "").trim())
    .filter(Boolean);
  if (!headlines.length) return { items:[unavailableLabel], copies:1, unavailable:true };
  return { items:headlines, copies:2, unavailable:false };
}
