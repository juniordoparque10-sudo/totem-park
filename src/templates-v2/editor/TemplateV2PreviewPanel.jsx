import { ExternalLink } from "lucide-react";
import TemplateV2ScaledStage from "./TemplateV2ScaledStage";

export default function TemplateV2PreviewPanel({ template, config, orientation, onOrientationChange, scale, onScaleChange, onOpen, dynamicData }) {
  return (
    <aside className="tpv2-preview-panel">
      <div className="tpv2-preview-head">
        <div><span>Preview ao vivo</span><strong>{orientation} · sem publicar</strong></div>
        <button type="button" onClick={onOpen}><ExternalLink /> Abrir prévia</button>
      </div>
      <div className="tpv2-preview-controls">
        <div><button type="button" className={orientation === "Paisagem" ? "active" : ""} onClick={() => onOrientationChange("Paisagem")}>Paisagem 16:9</button><button type="button" className={orientation === "Retrato" ? "active" : ""} onClick={() => onOrientationChange("Retrato")}>Retrato 9:16</button></div>
        <select value={scale} onChange={(event) => onScaleChange(event.target.value)} aria-label="Escala do preview"><option value="fit">Ajustar</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option></select>
      </div>
      <TemplateV2ScaledStage className={`tpv2-preview-viewport ${orientation === "Retrato" ? "portrait" : "landscape"}`} template={template} config={config} orientation={orientation} zoom={scale} dynamicData={dynamicData} mode="editor" />
    </aside>
  );
}
