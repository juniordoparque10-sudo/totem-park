import { useEffect, useMemo, useRef, useState } from "react";
import TemplateV2Renderer from "../TemplateV2Renderer";

export default function TemplateV2ScaledStage({ template, config, orientation, zoom = "fit", className = "" }) {
  const areaRef = useRef(null);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const logical = orientation === "Retrato" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };

  useEffect(() => {
    const node = areaRef.current;
    if (!node) return undefined;
    const measure = () => {
      const next = { width: node.clientWidth, height: node.clientHeight };
      setAvailable((current) => current.width === next.width && current.height === next.height ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scale = useMemo(() => {
    if (!available.width || !available.height) return 0;
    const fitScale = Math.min(available.width / logical.width, available.height / logical.height);
    const factor = zoom === "50" ? 0.5 : zoom === "75" ? 0.75 : 1;
    return fitScale * factor;
  }, [available, logical.height, logical.width, zoom]);

  return (
    <div ref={areaRef} className={`tpv2-scaled-area ${className}`}>
      {scale > 0 && <div className="tpv2-scaled-stage" style={{ width: logical.width * scale, height: logical.height * scale }}>
        <div className="tpv2-logical-template" style={{ width: logical.width, height: logical.height, transform: `scale(${scale})` }}>
          <TemplateV2Renderer template={template} config={config} orientation={orientation} />
        </div>
      </div>}
    </div>
  );
}
