import { QrCode } from "lucide-react";
import { buildQRCodeValue, buildQrUrl, normalizeQRCodeConfig } from "./qr-code";

export const QR_CODE_SIZE_PERCENT = Object.freeze({ small: 8, medium: 10, large: 13 });

export default function QRCodeLayer({ config, logicalWidth = 1920, showLabel = true, className = "" }) {
  const normalized = normalizeQRCodeConfig(config);
  const value = buildQRCodeValue(normalized);
  const imageSize = normalized.size === "large" ? 720 : normalized.size === "small" ? 360 : 520;
  const source = buildQrUrl(value, imageSize);
  if (!source) return null;
  const marginPercent = (Math.max(16, Math.min(96, Number(normalized.margin) || 32)) / logicalWidth) * 100;

  return <div className={`qr-code-layer is-${normalized.position} size-${normalized.size} ${className}`.trim()} style={{ "--qr-size": `${QR_CODE_SIZE_PERCENT[normalized.size] || QR_CODE_SIZE_PERCENT.medium}cqw`, "--qr-margin": `${marginPercent}cqw` }}>
    <div className="qr-code-card"><img src={source} alt="QR Code"/>{showLabel && <span><QrCode/>Aponte a câmera</span>}</div>
  </div>;
}
