export function buildQrUrl(value, size = 520) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return "";
  const safeSize = Math.max(180, Math.min(800, Number(size) || 520));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${safeSize}x${safeSize}&data=${encodeURIComponent(cleanValue)}`;
}
