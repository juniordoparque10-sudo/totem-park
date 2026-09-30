import { useEffect, useMemo, useState } from "react";
import { TemplateLogo, TemplateMedia, TemplateNewsTicker } from "../TemplateV2Modules";
import { normalizeSportsV2Config, SPORTS_V2_MODES } from "./config";
import { SPORTS_V2_CARD_COMPONENTS } from "./cards/SportsCards";
import "./sports-v2.css";

function SportsCard({ type, item, snapshot, compact }) {
  const Card = SPORTS_V2_CARD_COMPONENTS[type] || SPORTS_V2_CARD_COMPONENTS.football;
  return <Card item={item} snapshot={snapshot} compact={compact}/>;
}

function useSportsRotation(config, enabled) {
  const [index,setIndex] = useState(0);
  const signature = config.selectedSports.map((type)=>`${type}:${config.items[type]?.duration}`).join("|");
  const selectedIndex = Math.max(0,config.selectedSports.indexOf(config.selectedSport));
  const activeIndex = (selectedIndex + index) % config.selectedSports.length;
  useEffect(() => {
    if (!enabled || config.selectedSports.length < 2) return undefined;
    const type = config.selectedSports[activeIndex];
    const timer = setTimeout(() => setIndex((current)=>(current+1)%config.selectedSports.length), Math.max(1,Number(config.items[type]?.duration)||5)*1000);
    return () => clearTimeout(timer);
  }, [activeIndex, config, enabled, signature]);
  return activeIndex;
}

function SplitLayout({ config, data }) {
  const selected = config.selectedSports.slice(0,4);
  const ordered = config.primarySport && selected.includes(config.primarySport) ? [config.primarySport,...selected.filter((type)=>type!==config.primarySport)] : selected;
  return <div className={`sports-v2-split panels-${ordered.length}`}>{ordered.map((type,index)=><SportsCard key={type} type={type} item={config.items[type]} snapshot={data[type]} compact={ordered.length>2 || index>0}/>)}</div>;
}

export default function SportsPremiumRenderer({ config, orientation, name, dynamicData, mode="player" }) {
  const sports = useMemo(()=>normalizeSportsV2Config(config.sports),[config.sports]);
  const data = dynamicData?.sports || {};
  const rotationEnabled = sports.mode === SPORTS_V2_MODES.ROTATION && mode !== "thumbnail";
  const rotationIndex = useSportsRotation(sports, rotationEnabled);
  const activeType = sports.mode === SPORTS_V2_MODES.SINGLE ? sports.selectedSport : sports.selectedSports[rotationIndex] || sports.selectedSport;
  const ticker = config.modules?.news;
  const visibility = config.visibility || {};
  useEffect(() => {
    if (import.meta.env.VITE_APP_MODE !== "playerRc") return;
    console.log("[TP-V2-DIAG] SPORTS_RENDERER_RECEIVED", { timestamp:Date.now(), receivedSportsData:Object.keys(data).length>0, sports:Object.fromEntries(Object.entries(data).map(([sport,snapshot])=>[sport,{results:Number(snapshot?.data?.results?.length||0),upcoming:Number(snapshot?.data?.upcoming?.length||0),standings:Number(snapshot?.data?.standings?.length||0),events:Number(snapshot?.data?.events?.length||0)}])) });
  }, [data]);
  return <section className={`tpv2-root sports-v2-root ${orientation === "Retrato" ? "is-portrait" : "is-landscape"} mode-${sports.mode} preset-${sports.visualPreset} ${ticker?.enabled ? `has-news-ticker ticker-${ticker.tickerSize||"normal"}` : ""}`} style={{"--sports-v2-primary":config.style?.primaryColor||"#22d3ee","--sports-v2-secondary":config.style?.secondaryColor||"#8b5cf6","--sports-v2-bg":config.style?.backgroundColor||"#07111f","--sports-v2-overlay":`${config.style?.overlayOpacity??55}%`,"--tpv2-text":"#ffffff","--tpv2-muted":"#cbd5e1"}}>
    <div className="sports-v2-backdrop"><TemplateMedia asset={config.media?.primary} fit={config.style?.mediaFit||"cover"} position={config.style?.mediaPosition||"center"} mode="player"/><i/></div>
    {visibility.showContent !== false && <div className="sports-v2-shell"><div className="sports-v2-brand">{visibility.showLogo !== false && <TemplateLogo asset={config.content?.logo} name={name}/>}<span>Sistema multiesportes · Dados dinâmicos</span></div>
      {!dynamicData || dynamicData.loading ? <div className="sports-v2-loading"><i/><i/><i/><span>Carregando dados esportivos</span></div> : sports.mode === SPORTS_V2_MODES.SPLIT ? <SplitLayout config={sports} data={data}/> : <div className={`sports-v2-single transition-${sports.transition}`} key={activeType}><SportsCard type={activeType} item={sports.items[activeType]} snapshot={data[activeType]} compact={false}/>{sports.mode===SPORTS_V2_MODES.ROTATION&&<nav>{sports.selectedSports.map((type,index)=><i key={type} className={index===rotationIndex?"active":""}/>)}</nav>}</div>}
    </div>}
    {ticker?.enabled && <TemplateNewsTicker items={dynamicData?.news} config={ticker} orientation={orientation}/>} 
  </section>;
}
