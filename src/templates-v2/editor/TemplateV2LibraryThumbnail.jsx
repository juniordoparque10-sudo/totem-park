import { useEffect, useRef, useState } from "react";
import { SPORTS_PREMIUM_TYPE } from "../schema";
import TemplateV2DynamicStage from "./TemplateV2DynamicStage";
import TemplateV2ScaledStage from "./TemplateV2ScaledStage";

function hasTemplateV2NewsTicker(template, config = {}) {
  const type = template?.identity?.templateType || template?.templateType || "";
  if (type === SPORTS_PREMIUM_TYPE) return false;
  if (config.dynamicNews) return config.dynamicNews.feed?.enabled === true && config.dynamicNews.feed?.news?.enabled === true;
  return config.modules?.news?.enabled === true;
}

export default function TemplateV2LibraryThumbnail({ template, config, orientation, loadWeather, loadNews }) {
  const rootRef = useRef(null);
  const [isVisible, setIsVisible] = useState(() => typeof globalThis.IntersectionObserver !== "function");
  const hasTicker = hasTemplateV2NewsTicker(template, config);

  useEffect(() => {
    if (!hasTicker) return undefined;
    if (typeof globalThis.IntersectionObserver !== "function") return undefined;
    const observer = new globalThis.IntersectionObserver(([entry]) => setIsVisible(entry?.isIntersecting === true), { rootMargin:"80px 0px" });
    const visibilityTarget = rootRef.current?.closest("article") || rootRef.current;
    if (visibilityTarget) observer.observe(visibilityTarget);
    return () => observer.disconnect();
  }, [hasTicker]);

  const stageProps = { className:"tpv2-created-thumbnail", template, config, orientation, mode:"thumbnail" };
  return <div ref={rootRef} className={`tpv2-library-live-thumbnail ${isVisible && hasTicker ? "is-visible" : ""}`}>
    {isVisible && hasTicker
      ? <TemplateV2DynamicStage {...stageProps} loadWeather={loadWeather} loadNews={loadNews}/>
      : hasTicker
        ? <TemplateV2ScaledStage {...stageProps}/>
        : <TemplateV2DynamicStage {...stageProps} loadWeather={loadWeather} loadNews={loadNews}/>
    }
  </div>;
}
