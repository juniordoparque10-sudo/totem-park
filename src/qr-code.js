export function buildQrUrl(value, size = 520) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return "";
  const safeSize = Math.max(180, Math.min(800, Number(size) || 520));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${safeSize}x${safeSize}&data=${encodeURIComponent(cleanValue)}`;
}

export const QR_CODE_TYPES = Object.freeze({
  LINK: "link",
  WHATSAPP: "whatsapp",
  TEXT: "text",
});

export function normalizePhoneDigits(phone, countryCode = "55") {
  const rawPhone = String(phone || "").trim();
  const phoneDigits = rawPhone.replace(/\D/g, "");
  const safeCountryCode = String(countryCode || "").replace(/\D/g, "");
  if (!phoneDigits) return "";
  if (rawPhone.startsWith("+")) return phoneDigits.length >= 8 && phoneDigits.length <= 15 ? phoneDigits : "";
  const combined = safeCountryCode && !phoneDigits.startsWith(safeCountryCode)
    ? `${safeCountryCode}${phoneDigits}`
    : phoneDigits;
  return combined.length >= 8 && combined.length <= 15 ? combined : "";
}

export function normalizeQRCodeConfig(config = {}) {
  if (typeof config === "string") {
    const value = config.trim();
    return { type: /^https?:\/\//i.test(value) ? QR_CODE_TYPES.LINK : QR_CODE_TYPES.TEXT, link: value, text: value, value };
  }
  const legacyValue = String(config.value || config.qrText || "").trim();
  const inferredType = /^https?:\/\/(?:wa\.me|api\.whatsapp\.com)\//i.test(legacyValue)
    ? QR_CODE_TYPES.WHATSAPP
    : /^https?:\/\//i.test(legacyValue)
      ? QR_CODE_TYPES.LINK
      : QR_CODE_TYPES.TEXT;
  const type = Object.values(QR_CODE_TYPES).includes(config.type) ? config.type : inferredType;
  return {
    enabled: Boolean(config.enabled),
    type,
    countryCode: String(config.countryCode || "55").replace(/\D/g, "") || "55",
    phone: String(config.phone || config.whatsapp || ""),
    message: String(config.message || ""),
    link: String(config.link || (type === QR_CODE_TYPES.LINK ? legacyValue : "")),
    text: String(config.text || (type === QR_CODE_TYPES.TEXT ? legacyValue : "")),
    value: legacyValue,
    position: config.position || "bottom-right",
    size: config.size || "medium",
    margin: Math.max(16, Math.min(96, Number(config.margin) || 32)),
  };
}

export function buildQRCodeValue(config = {}) {
  if (typeof config === "string") return config.trim();
  const normalized = normalizeQRCodeConfig(config);
  if (normalized.type === QR_CODE_TYPES.WHATSAPP) {
    const phone = normalizePhoneDigits(normalized.phone, normalized.countryCode);
    if (!phone) return "";
    const message = normalized.message.trim();
    return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  }
  if (normalized.type === QR_CODE_TYPES.LINK) return normalized.link.trim();
  return normalized.text.trim();
}

export function getQRCodeValidationError(config = {}) {
  const normalized = normalizeQRCodeConfig(config);
  if (normalized.type === QR_CODE_TYPES.WHATSAPP && !normalizePhoneDigits(normalized.phone, normalized.countryCode)) {
    return "Informe um número de WhatsApp válido.";
  }
  if (normalized.type === QR_CODE_TYPES.LINK && !normalized.link.trim()) return "Informe a URL do QR Code.";
  if (normalized.type === QR_CODE_TYPES.TEXT && !normalized.text.trim()) return "Informe o conteúdo do QR Code.";
  return "";
}
