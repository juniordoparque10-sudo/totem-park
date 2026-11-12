import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Clock3, CloudSun, Sparkles } from "lucide-react";
import QRCodeLayer from "../QRCodeLayer";
import { shouldRenderTemplateV2InternalVideo, shouldShowTemplateMediaPlaceholder } from "./render-mode";
import { getTemplateV2ImageAssetUrl } from "./player-preload";
import { confirmTemplateImageForPaint } from "./player-execution";
import { buildTickerContentModel, getTickerDurationSeconds } from "./ticker-speed";
import TemplateBrand from "./TemplateLogo";

let clockSnapshot = Date.now();
let clockTimer = null;
const clockListeners = new Set();
function subscribeClock(listener) {
  clockListeners.add(listener);
  if (!clockTimer) clockTimer = setInterval(() => { clockSnapshot = Date.now(); clockListeners.forEach((notify) => notify()); }, 1000);
  return () => { clockListeners.delete(listener); if (!clockListeners.size && clockTimer) { clearInterval(clockTimer); clockTimer = null; } };
}
const getClockSnapshot = () => clockSnapshot;
const TemplateVisualReadyContext = createContext(null);

export function TemplateV2VisualReadyProvider({ value, children }) {
  return <TemplateVisualReadyContext.Provider value={value}>{children}</TemplateVisualReadyContext.Provider>;
}

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
  const visualReady = useContext(TemplateVisualReadyContext);
  const imageRef = useRef(null);
  const readinessRef = useRef("");
  const readinessKey = `${visualReady?.playbackExecutionId ?? "preview"}|${assetUrl}`;

  async function confirmVisualReady(image) {
    if (!visualReady?.onVisualEvent || !image || !assetUrl || asset?.type === "video") return;
    if (readinessRef.current === readinessKey) return;
    readinessRef.current = readinessKey;
    try {
      await confirmTemplateImageForPaint(image, (event) => {
        if (readinessRef.current === readinessKey) visualReady.onVisualEvent(event, { url:assetUrl });
      });
    } catch {
      if (readinessRef.current === readinessKey) readinessRef.current = "";
      return;
    }
    if (readinessRef.current !== readinessKey) return;
  }

  useEffect(() => {
    readinessRef.current = "";
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) confirmVisualReady(image);
    return () => { readinessRef.current = ""; };
  // The execution and authoritative URL are the visual readiness boundary.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readinessKey]);

  if (!assetUrl) return <div className={`tpv2-media-fallback ${visiblePlaceholder ? "is-editor-placeholder" : "is-empty"}`}>{visiblePlaceholder && <><Sparkles /><span>Selecione uma imagem da biblioteca</span></>}</div>;
  if (asset.type === "video") return shouldRenderTemplateV2InternalVideo(mode)
    ? <video src={assetUrl} muted autoPlay loop playsInline style={{ objectFit:fit, objectPosition:position }} />
    : <div className="tpv2-media-fallback is-empty" />;
  return <img ref={imageRef} src={assetUrl} alt="" style={{ objectFit:fit, objectPosition:position }} onLoad={(event) => confirmVisualReady(event.currentTarget)} />;
}

export function TemplateLogo({ asset, name, showLogo = true, showName = true }) {
  const assetUrl = getTemplateV2ImageAssetUrl(asset);
  return <TemplateBrand src={assetUrl} name={name} showLogo={showLogo} showName={showName} fallback={<span className="tpv2-brand-mark">TP</span>} />;
}

export function TemplateCTA({ config = {} }) { return config.enabled ? <span className="tpv2-cta">{config.label || "Saiba mais"}</span> : null; }
export function TemplateQRCode({ config = {}, logicalWidth = 1920 }) { return <QRCodeLayer config={config} logicalWidth={logicalWidth} />; }
export function TemplateNewsTicker({ items = [], config = {}, orientation = "Paisagem" }) {
  const content = buildTickerContentModel(items);
  const trackRef = useRef(null);
  const [tickerMetrics, setTickerMetrics] = useState({ windowWidth:0, travelDistance:0 });
  const distanceBasedSpeed = config.distanceBasedSpeed === true;
  const contentKey = content.items.join("|");
  useLayoutEffect(() => {
    if (!distanceBasedSpeed) return undefined;
    const track = trackRef.current;
    if (!track) return undefined;
    const measure = () => {
      const windowWidth = Math.max(0, track.parentElement?.clientWidth || 0);
      const travelDistance = Math.max(windowWidth, track.firstElementChild?.scrollWidth || 0);
      setTickerMetrics((current) => current.windowWidth === windowWidth && current.travelDistance === travelDistance ? current : { windowWidth, travelDistance });
    };
    measure();
    if (typeof ResizeObserver !== "function") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    if (track.parentElement) observer.observe(track.parentElement);
    return () => observer.disconnect();
  }, [distanceBasedSpeed, contentKey]);
  const duration = distanceBasedSpeed && !content.unavailable
    ? getTickerDurationSeconds(tickerMetrics.travelDistance, config.tickerSpeed)
    : config.tickerSpeed === "slow" ? 70 : config.tickerSpeed === "fast" ? 28 : 46;
  const opacity = 100 - Math.max(0, Math.min(100, Number(config.tickerTransparency) || 0));
  const customAccent = config.tickerAccentColor || "";
  return <div className={`tpv2-news-ticker size-${config.tickerSize || "normal"} ${orientation === "Retrato" ? "is-portrait" : "is-landscape"} ${customAccent ? "has-custom-accent" : ""} ${content.unavailable ? "is-unavailable" : ""}`} style={{"--ticker-duration":`${duration}s`,"--ticker-distance":distanceBasedSpeed ? `${tickerMetrics.travelDistance}px` : "50%","--ticker-window-width":`${tickerMetrics.windowWidth}px`,"--ticker-background":config.tickerBackground || "#07111f","--ticker-text":config.tickerTextColor || "#fff",...(customAccent ? {"--ticker-accent":customAccent} : {}),"--ticker-opacity":`${opacity}%`}}><strong>{config.tickerLabel || "Últimas notícias"}</strong><div className="tpv2-ticker-window"><div ref={trackRef} className="tpv2-ticker-track">{Array.from({ length:content.copies },(_,copyIndex) => <div className="tpv2-ticker-group" key={copyIndex} aria-hidden={copyIndex > 0}>{content.items.map((title,index) => <span key={`${index}-${title}`}>{title}</span>)}</div>)}</div></div></div>;
}
