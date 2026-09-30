import TemplateV2Renderer from "../TemplateV2Renderer";
import TemplateScaledStage from "../../TemplateScaledStage";

export default function TemplateV2ScaledStage({ template, config, orientation, zoom = "fit", className = "", dynamicData = null, mode = "thumbnail" }) {
  const factor = zoom === "50" ? 0.5 : zoom === "75" ? 0.75 : 1;
  return <TemplateScaledStage className={`tpv2-scaled-area ${className}`} orientation={orientation} zoom={factor}>
    <TemplateV2Renderer template={template} config={config} orientation={orientation} dynamicData={dynamicData} mode={mode} />
  </TemplateScaledStage>;
}
