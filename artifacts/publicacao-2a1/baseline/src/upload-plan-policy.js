export const UPLOAD_PLAN_MB = { Start: { video: 50, image: 5 }, Business: { video: 100, image: 10 }, Professional: { video: 150, image: 15 }, Enterprise: { video: 200, image: 20 } };
export function uploadLimitBytes(plan, kind) { return UPLOAD_PLAN_MB[plan]?.[kind] * 1024 * 1024 || 0; }
export function uploadSizeNotice(plan, kind, size, limit) {
  if (size <= limit) return null;
  const upgrade = Object.entries(UPLOAD_PLAN_MB).find(([, limits]) => limits[kind] * 1024 * 1024 >= size && limits[kind] * 1024 * 1024 > limit);
  return { plan, limitMb: limit / (1024 * 1024), upgrade: upgrade?.[0], upgradeMb: upgrade?.[1][kind], kind };
}
