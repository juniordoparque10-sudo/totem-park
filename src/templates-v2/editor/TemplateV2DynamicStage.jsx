import TemplateV2ScaledStage from "./TemplateV2ScaledStage";
import useTemplateV2DynamicData from "./useTemplateV2DynamicData";

export default function TemplateV2DynamicStage({ config, loadWeather, loadNews, ...stageProps }) {
  const dynamicData = useTemplateV2DynamicData(config, { loadWeather, loadNews });
  return <TemplateV2ScaledStage {...stageProps} config={config} dynamicData={dynamicData} />;
}
