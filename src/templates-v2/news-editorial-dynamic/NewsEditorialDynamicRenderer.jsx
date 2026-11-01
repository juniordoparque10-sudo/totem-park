import { TemplateMedia, TemplateNewsTicker } from "../TemplateV2Modules";
import TemplateLogo from "../TemplateLogo";
import { getTemplateV2ImageAssetUrl } from "../player-preload";
import { useDynamicRotation } from "../dynamic-layout/useDynamicRotation.js";
import { buildNewsEditorialFeedItems, getNewsEditorialAppearanceStyle, getNewsEditorialTextFrame, normalizeNewsEditorialDynamicConfig } from "./config.js";
import "./news-editorial-dynamic.css";

export default function NewsEditorialDynamicRenderer({ config, orientation, name, dynamicData, mode = "player", playbackExecutionId, effectiveDurationSeconds, previewPlayback = null }) {
  const options = normalizeNewsEditorialDynamicConfig(config.dynamicNews, config.modules?.news);
  const appearance = getNewsEditorialAppearanceStyle(options, orientation);
  const visibility = config.visibility || {};
  const items = Array.isArray(dynamicData?.editorialNews) ? dynamicData.editorialNews : Array.isArray(dynamicData?.news) ? dynamicData.news : [];
  let feedItems = buildNewsEditorialFeedItems(dynamicData?.feedNews, dynamicData?.feedWeather);
  if (options.feed.enabled && options.feed.includeWeather && !options.feed.weatherCities.length && !options.feed.news.enabled && !feedItems.length) feedItems = [{ title:"Selecione uma cidade para exibir o clima no feed" }];
  const tickerConfig = { ...options.feed, selectedNewsSources:options.feed.news.selectedNewsSources, distanceBasedSpeed:true };
  const frame = useDynamicRotation({ itemIds: items.map((item) => item.id || item.link || item.title), effectiveDurationMs: mode === "preview" ? Infinity : Number(effectiveDurationSeconds || config.display?.duration || 15) * 1000, rotation: options.rotation, secondarySlots: Number(options.secondarySlots || 3), enabled: mode === "player" || mode === "preview", executionId: playbackExecutionId || `news-${mode}`, controlledElapsedMs:mode === "preview" ? previewPlayback?.elapsedMs : null });
  const byId = (id) => items.find((item) => (item.id || item.link || item.title) === id);
  const featured = byId(frame.featuredId) || items[0];
  const secondary = frame.secondaryIds.map(byId).filter(Boolean);
  const textFrame = getNewsEditorialTextFrame({ orientation, secondaryCount:secondary.length });
  return <section data-secondary-count={secondary.length} data-preview-elapsed-ms={mode === "preview" ? Math.round(previewPlayback?.elapsedMs || 0) : undefined} data-featured-seconds={options.rotation.featuredSeconds} data-featured-id={frame.featuredId || ""} className={`tpv2-root tpv2-news-dynamic layout-${options.layout || "A"} feed-position-${appearance.position} ${orientation === "Retrato" ? "is-portrait" : "is-landscape"} ${mode === "thumbnail" ? "is-thumbnail" : ""} ${previewPlayback?.paused ? "is-preview-paused" : ""} ${secondary.length ? "" : "has-no-secondary"} ${options.feed.enabled ? `has-news-ticker ticker-${options.feed.tickerSize}` : ""}`} style={{ "--tpv2-primary":config.style?.primaryColor, "--tpv2-secondary":config.style?.secondaryColor, "--tpv2-bg":config.style?.backgroundColor, "--tpv2-text":config.style?.textColor, "--featured-card-alpha":appearance.featuredBackgroundAlpha, "--secondary-card-alpha":appearance.secondaryBackgroundAlpha, "--news-editorial-footer-gap":appearance.editorialFooterGap, "--secondary-count":Math.max(1,secondary.length), "--featured-title-lines":textFrame.featuredTitleLines, "--featured-summary-lines":textFrame.featuredSummaryLines, "--secondary-title-lines":textFrame.secondaryTitleLines }}>
    <div className="tpv2-news-background"><TemplateMedia asset={config.media?.primary} mode={mode}/></div>
    <header>{visibility.showLogo !== false&&<TemplateLogo className="news-dynamic-logo" src={getTemplateV2ImageAssetUrl(config.content?.logo)} alt={name}/>}<span>NOTÍCIAS</span></header>
    {visibility.showContent !== false&&(!featured ? <div className="tpv2-dynamic-empty">Notícias temporariamente indisponíveis</div> : <main>
      <article className="featured">{options.showImage !== false && featured.image && <img src={featured.image} alt="" loading="eager" decoding="async" fetchPriority="high"/>}<div>{options.showSource !== false && <span>{featured.source}</span>}{visibility.showHeadline !== false&&<h2>{featured.title}</h2>}{visibility.showSubtitle !== false&&options.showSummary !== false&&<p>{featured.summary}</p>}{options.showDate !== false && featured.date && <time>{new Date(featured.date).toLocaleDateString("pt-BR")}</time>}</div></article>
      {visibility.showServices !== false&&secondary.length>0&&<div className="secondary">{secondary.map((item) => <article key={item.id || item.link || item.title}>{options.showImage !== false && item.image && <img src={item.image} alt="" loading="eager" decoding="async"/>}<div><h3>{item.title}</h3>{options.showSource !== false && <span>{item.source}</span>}</div></article>)}</div>}
    </main>)}
    {options.feed.enabled&&<TemplateNewsTicker key={playbackExecutionId || "ticker"} items={feedItems} config={tickerConfig} orientation={orientation}/>}
  </section>;
}
