import { useSyncExternalStore } from "react";
import { Clock3, CloudSun, Sparkles } from "lucide-react";
import QRCodeLayer from "../QRCodeLayer";
import { shouldRenderTemplateV2InternalVideo, shouldShowTemplateMediaPlaceholder } from "./render-mode";
import { getTemplateV2ImageAssetUrl } from "./player-preload";

let clockSnapshot = Date.now();
let clockTimer = null;
const clockListeners = new Set();
function subscribeClock(listener) {
  clockListeners.add(listener);
  if (!clockTimer) clockTimer = setInterval(() => { clockSnapshot = Date.now(); clockListeners.forEach((notify) => notify()); }, 1000);
  return () => { clockListeners.delete(listener); if (!clockListeners.size && clockTimer) { clearInterval(clockTimer); clockTimer = null; } };
}
const getClockSnapshot = () => clockSnapshot;

export function TemplateClock({ format = "24h", large = false }) {
  const snapshot = useSyncExternalStore(subscribeClock, getClockSnapshot, getClockSnapshot);
  return <strong className={large ? "tpv2-clock-large" : ""}><Clock3 /> {new Date(snapshot).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit", hour12:format === "12h" })}</strong>;
}

export function TemplateDate() {
  const snapshot = useSyncExternalStore(subscribeClock, getClockSnapshot, getClockSnapshot);
  const value = new Date(snapshot).toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long" });
  return <span className="tpv2-date">{value.charAt(0).toUpperCase() + value.slice(1)}</span>;
}

export function TemplateWeather({ config = {}, data }) {
  return <span><CloudSun /> {data?.temperature != null ? `${data.temperature}° · ` : ""}{data?.condition || data?.city || config.city || "Sua cidade"}</span>;
}

export function TemplateMedia({ asset, fit = "cover", position = "center", mode = "player" }) {
  const visiblePlaceholder = shouldShowTemplateMediaPlaceholder(mode);
  const assetUrl = getTemplateV2ImageAssetUrl(asset);
  if (!assetUrl) return <div className={`tpv2-media-fallback ${visiblePlaceholder ? "is-editor-placeholder" : "is-empty"}`}>{visiblePlaceholder && <><Sparkles /><span>Selecione uma imagem da biblioteca</span></>}</div>;
  if (asset.type === "video") return shouldRenderTemplateV2InternalVideo(mode)
    ? <video src={assetUrl} muted autoPlay loop playsInline style={{ objectFit:fit, objectPosition:position }} />
    : <div className="tpv2-media-fallback is-empty" />;
  return <img src={assetUrl} alt="" style={{ objectFit:fit, objectPosition:position }} />;
}

export function TemplateLogo({ asset, name }) {
  return <>{asset?.url ? <img src={asset.url} alt="" /> : <span className="tpv2-brand-mark">TP</span>}<strong>{name}</strong></>;
}

export function TemplateCTA({ config = {} }) { return config.enabled ? <span className="tpv2-cta">{config.label || "Saiba mais"}</span> : null; }
export function TemplateQRCode({ config = {}, logicalWidth = 1920 }) { return <QRCodeLayer config={config} logicalWidth={logicalWidth} />; }
export function TemplateNewsTicker({ items = [], config = {}, orientation = "Paisagem" }) {
  const headlines = items.map((item) => item?.title || item?.headline).filter(Boolean);
  const content = headlines.length ? headlines : [`Aguardando notícias de ${(config.selectedNewsSources || []).join(", ") || "fonte selecionada"}`];
  const duration = config.tickerSpeed === "slow" ? 70 : config.tickerSpeed === "fast" ? 28 : 46;
  const opacity = 100 - Math.max(0, Math.min(100, Number(config.tickerTransparency) || 0));
  return <div className={`tpv2-news-ticker size-${config.tickerSize || "normal"} ${orientation === "Retrato" ? "is-portrait" : "is-landscape"}`} style={{"--ticker-duration":`${duration}s`,"--ticker-background":config.tickerBackground || "#07111f","--ticker-text":config.tickerTextColor || "#fff","--ticker-opacity":`${opacity}%`}}><strong>{config.tickerLabel || "Últimas notícias"}</strong><div className="tpv2-ticker-window"><div className="tpv2-ticker-track">{[...content,...content].map((title,index) => <span key={`${index}-${title}`}>{title}</span>)}</div></div></div>;
}
