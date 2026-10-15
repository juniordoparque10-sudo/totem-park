import { TemplateLogo, TemplateMedia } from "../TemplateV2Modules";
import { useDynamicRotation } from "../dynamic-layout/useDynamicRotation.js";
import "./news-editorial-dynamic.css";

export default function NewsEditorialDynamicRenderer({ config, orientation, name, dynamicData, mode = "player", playbackExecutionId, effectiveDurationSeconds }) {
  const items = Array.isArray(dynamicData?.news) ? dynamicData.news : [];
  const options = config.dynamicNews || {};
  const frame = useDynamicRotation({ itemIds: items.map((item) => item.id || item.link || item.title), effectiveDurationMs: Number(effectiveDurationSeconds || config.display?.duration || 15) * 1000, rotation: options.rotation, secondarySlots: Number(options.secondarySlots || 3), enabled: mode === "player", executionId: playbackExecutionId || `news-${mode}` });
  const byId = (id) => items.find((item) => (item.id || item.link || item.title) === id);
  const featured = byId(frame.featuredId) || items[0];
  const secondary = frame.secondaryIds.map(byId).filter(Boolean);
  return <section data-secondary-count={secondary.length} className={`tpv2-root tpv2-news-dynamic layout-${options.layout || "A"} ${orientation === "Retrato" ? "is-portrait" : "is-landscape"} ${mode === "thumbnail" ? "is-thumbnail" : ""} ${secondary.length ? "" : "has-no-secondary"}`} style={{ "--tpv2-primary":config.style?.primaryColor, "--tpv2-secondary":config.style?.secondaryColor, "--tpv2-bg":config.style?.backgroundColor, "--tpv2-text":config.style?.textColor, "--secondary-count":Math.max(1,secondary.length) }}>
    <div className="tpv2-news-background"><TemplateMedia asset={config.media?.primary} mode={mode}/></div>
    <header><TemplateLogo asset={config.content?.logo} name={name}/><span>NOTÍCIAS</span></header>
    {!featured ? <div className="tpv2-dynamic-empty">Notícias temporariamente indisponíveis</div> : <main>
      <article className="featured">{options.showImage !== false && featured.image && <img src={featured.image} alt=""/>}<div>{options.showSource !== false && <span>{featured.source}</span>}<h2>{featured.title}</h2>{options.showSummary !== false && <p>{featured.summary}</p>}{options.showDate !== false && featured.date && <time>{new Date(featured.date).toLocaleDateString("pt-BR")}</time>}</div></article>
      {secondary.length>0&&<div className="secondary">{secondary.map((item) => <article key={item.id || item.link || item.title}>{options.showImage !== false && item.image && <img src={item.image} alt=""/>}<div><h3>{item.title}</h3>{options.showSource !== false && <span>{item.source}</span>}</div></article>)}</div>}
    </main>}
  </section>;
}
