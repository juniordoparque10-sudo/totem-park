import CollectionRenderer from "../dynamic-collections/CollectionRenderer";
import { normalizeKpiIndicatorsConfig } from "./config.js";
import "./kpi-indicators.css";
export default function KpiIndicatorsRenderer(props) { const kpi=normalizeKpiIndicatorsConfig(props.config.kpi); const items=kpi.items.map((item)=>({...item,subtitle:item.value==null?"Dados indisponíveis":`${item.value}${item.unit?` ${item.unit}`:""} · ${item.sourceLabel}${item.updatedAt?` · ${new Date(item.updatedAt).toLocaleString("pt-BR")}`:""}`})); return <CollectionRenderer {...props} config={{...props.config,kpi:{...kpi,items}}} collectionKey="kpi" label="Indicadores"/>; }
