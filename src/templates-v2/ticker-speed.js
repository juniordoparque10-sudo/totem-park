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
