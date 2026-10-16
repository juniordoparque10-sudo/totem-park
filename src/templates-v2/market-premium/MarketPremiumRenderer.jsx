import { TemplateClock, TemplateMedia } from "../TemplateV2Modules";
import TemplateLogo from "../TemplateLogo";
import { getTemplateV2ImageAssetUrl } from "../player-preload";
import { useDynamicRotation } from "../dynamic-layout/useDynamicRotation.js";
import { normalizeMarketPremiumConfig } from "./config.js";
import "./market-premium.css";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits:2, maximumFractionDigits:2 });
function ProductImage({ product }) { const src=product?.image?.url||product?.image?.publicUrl; return src?<img src={src} alt=""/>:<div className="market-image-empty"/>; }

export default function MarketPremiumRenderer({ config, orientation, name, mode="player", playbackExecutionId, effectiveDurationSeconds }) {
  const market=normalizeMarketPremiumConfig(config.market);
  const visibility=config.visibility||{};
  const active=market.catalog.filter((item)=>item.active);
  const frame=useDynamicRotation({ itemIds:active.map((item)=>item.id),effectiveDurationMs:Number(effectiveDurationSeconds||config.display?.duration||15)*1000,rotation:market.rotation,secondarySlots:orientation==="Retrato"?4:6,enabled:mode==="player",executionId:playbackExecutionId||`market-${mode}` });
  const featured=active.find((item)=>item.id===frame.featuredId)||active[0];
  const secondary=frame.secondaryIds.map((id)=>active.find((item)=>item.id===id)).filter(Boolean);
  return <section className={`tpv2-root tpv2-market-premium layout-${market.layout} ${orientation==="Retrato"?"is-portrait":"is-landscape"} ${mode === "thumbnail" ? "is-thumbnail" : ""} ${secondary.length ? "" : "has-no-secondary"}`} style={{"--market-primary":config.style?.primaryColor||"#22d3ee","--market-secondary":config.style?.secondaryColor||"#8b5cf6","--market-bg":config.style?.backgroundColor||"#061426","--market-text":config.style?.textColor||"#fff","--market-overlay":Math.max(0,Math.min(90,Number(config.style?.overlayOpacity??52)))/100,"--secondary-count":Math.max(1,secondary.length)}}><div className="market-background"><TemplateMedia asset={config.media?.primary} fit={config.style?.mediaFit||"cover"} position={config.style?.mediaPosition||"center"} mode={mode}/><i/></div><header>{visibility.showLogo!==false&&<TemplateLogo className="market-logo" src={getTemplateV2ImageAssetUrl(config.content?.logo)} alt={name}/>}<strong>{market.segment}</strong><TemplateClock format="24h"/></header>{visibility.showContent!==false&&(!featured?<div className="tpv2-dynamic-empty">Cadastre ao menos uma oferta ativa</div>:<main><article className="market-featured"><ProductImage product={featured}/><div className="market-featured-copy">{featured.badge&&<span>{featured.badge}</span>}{visibility.showHeadline!==false&&<h2>{featured.name}</h2>}{featured.normalPrice!=null&&<del>R$ {money(featured.normalPrice)}</del>}<strong><small>R$</small>{money(featured.promotionalPrice)}<em>/{featured.unit}</em></strong></div></article>{visibility.showServices!==false&&secondary.length>0&&<aside><div className="market-categories">{market.categories.map((category)=><span key={category}>{category}</span>)}</div><div className="market-list">{secondary.map((product)=><article key={product.id}><ProductImage product={product}/><div><b>{product.name}</b><small>{product.category}</small></div><strong>R$ {money(product.promotionalPrice)} <small>/{product.unit}</small></strong></article>)}</div></aside>}</main>)}</section>;
}
