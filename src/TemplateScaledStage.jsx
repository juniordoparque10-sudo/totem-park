import { useEffect, useMemo, useRef, useState } from "react";
import { getTemplateStageGeometry } from "./template-stage-geometry";

export default function TemplateScaledStage({ orientation = "Paisagem", logicalWidth, logicalHeight, zoom = 1, className = "", children }) {
  const areaRef = useRef(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const logical = logicalWidth > 0 && logicalHeight > 0
    ? { width: logicalWidth, height: logicalHeight }
    : orientation === "Retrato"
      ? { width: 1080, height: 1920 }
      : { width: 1920, height: 1080 };

  useEffect(() => {
    const node = areaRef.current;
    if (!node) return undefined;
    const measure = () => {
      const next = { width: node.clientWidth, height: node.clientHeight };
      setFrame((current) => current.width === next.width && current.height === next.height ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(() => getTemplateStageGeometry({
    frameWidth: frame.width,
    frameHeight: frame.height,
    logicalWidth: logical.width,
    logicalHeight: logical.height,
    zoom,
  }), [frame.height, frame.width, logical.height, logical.width, zoom]);

  return <div ref={areaRef} className={`template-scaled-area ${className}`.trim()}>
    {geometry.scale > 0 && <div className="template-scaled-stage" style={{ width: geometry.width, height: geometry.height }}>
      <div className="template-logical-stage" style={{ width: logical.width, height: logical.height, transform: `scale(${geometry.scale})` }}>
        {children}
      </div>
    </div>}
  </div>;
}
