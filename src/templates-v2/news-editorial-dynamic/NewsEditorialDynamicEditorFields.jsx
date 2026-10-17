import { normalizeNewsEditorialDynamicConfig } from "./config.js";

function SourceFields({ title, value, newsSources, onChange }) {
  const selected = value.selectedNewsSources || [];
  const toggle = (source) => {
    const nextSelected = selected.includes(source.name) ? selected.filter((name)=>name !== source.name) : [...selected,source.name];
    const first = newsSources.find((item)=>item.name === nextSelected[0]);
    onChange({ ...value, selectedNewsSources:nextSelected, newsSource:nextSelected[0] || "", newsFeedUrl:first?.url || (nextSelected.length ? value.newsFeedUrl : "") });
  };
  return <div className="tpv2-news-source-list"><strong>{title}</strong>{newsSources.map((source)=><label className="tpv2-check" key={`${title}-${source.name}-${source.url}`}><input type="checkbox" checked={selected.includes(source.name)} onChange={()=>toggle(source)}/> {source.name}</label>)}<label>URL RSS personalizada<input value={value.newsFeedUrl || ""} onChange={(event)=>onChange({ ...value, newsFeedUrl:event.target.value })}/></label></div>;
}

export default function NewsEditorialDynamicEditorFields({ value = {}, legacyNews = {}, orientation, newsSources = [], weatherCities = [], onChange }) {
  const config = normalizeNewsEditorialDynamicConfig(value, legacyNews);
  const layouts = orientation === "Retrato" ? ["A", "B"] : ["A", "B", "C"];
  const update = (patch) => onChange({ ...config, ...patch });
  const updateFeed = (patch) => update({ feed:{ ...config.feed, ...patch } });
  const citiesText = config.feed.weatherCities.join(", ");
  return <div className="tpv2-specific-fields">
    <strong>Notícias Editorial Dinâmica</strong>
    <label>Layout<select value={config.layout} onChange={(event)=>update({ layout:event.target.value })}>{layouts.map((layout)=><option key={layout}>{layout}</option>)}</select></label>
    <div className="tpv2-inline-fields"><label>Destaque (s)<input type="number" min="3" max="60" value={config.rotation.featuredSeconds} onChange={(event)=>update({ rotation:{ ...config.rotation, featuredSeconds:Number(event.target.value) } })}/></label><label>Secundárias (s)<input type="number" min="3" max="60" value={config.rotation.secondarySeconds} onChange={(event)=>update({ rotation:{ ...config.rotation, secondarySeconds:Number(event.target.value) } })}/></label></div>
    <label>Cards secundários<input type="number" min="1" max="4" value={config.secondarySlots} onChange={(event)=>update({ secondarySlots:Number(event.target.value) })}/></label>
    <div className="tpv2-ticker-settings"><strong>Notícias editoriais</strong><SourceFields title="Fontes dos cards" value={config.editorial} newsSources={newsSources} onChange={(editorial)=>update({ editorial })}/></div>
    <div className="tpv2-ticker-settings"><strong>Feed inferior</strong><label className="tpv2-check"><input type="checkbox" checked={config.feed.enabled} onChange={(event)=>updateFeed({ enabled:event.target.checked })}/> Ativar feed inferior</label>{config.feed.enabled&&<><label className="tpv2-check"><input type="checkbox" checked={config.feed.news.enabled} onChange={(event)=>updateFeed({ news:{ ...config.feed.news, enabled:event.target.checked } })}/> Incluir manchetes RSS</label>{config.feed.news.enabled&&<SourceFields title="Fontes do feed" value={config.feed.news} newsSources={newsSources} onChange={(news)=>updateFeed({ news })}/>}<label className="tpv2-check"><input type="checkbox" checked={config.feed.includeWeather} onChange={(event)=>updateFeed({ includeWeather:event.target.checked })}/> Incluir previsão do tempo no feed</label>{config.feed.includeWeather&&<label>Cidades do feed<input list="tpv2-news-weather-cities" value={citiesText} placeholder="Busque ou informe cidades separadas por vírgula" onChange={(event)=>updateFeed({ weatherCities:event.target.value.split(",").map((city)=>city.trim()).filter(Boolean) })}/><datalist id="tpv2-news-weather-cities">{weatherCities.map((city)=><option key={city} value={city}/>)}</datalist>{!config.feed.weatherCities.length&&<span>Selecione ao menos uma cidade para incluir o clima.</span>}</label>}<div className="tpv2-inline-fields"><label>Velocidade<select value={config.feed.tickerSpeed} onChange={(event)=>updateFeed({ tickerSpeed:event.target.value })}><option value="slow">Lenta</option><option value="normal">Normal</option><option value="fast">Rápida</option></select></label><label>Tamanho<select value={config.feed.tickerSize} onChange={(event)=>updateFeed({ tickerSize:event.target.value })}><option value="compact">Compacta</option><option value="normal">Normal</option><option value="large">Grande</option></select></label></div><label>Identificação<input value={config.feed.tickerLabel} onChange={(event)=>updateFeed({ tickerLabel:event.target.value })}/></label></>}</div>
  </div>;
}

export function NewsEditorialDynamicAppearanceFields({ value = {}, legacyNews = {}, onChange }) {
  const config = normalizeNewsEditorialDynamicConfig(value, legacyNews);
  const update = (patch) => onChange({ ...config, ...patch });
  const updateCards = (patch) => update({ appearance:{ ...config.appearance, cards:{ ...config.appearance.cards, ...patch } } });
  const updateFeed = (patch) => update({ feed:{ ...config.feed, ...patch } });
  return <div className="tpv2-news-appearance-fields">
    <div className="tpv2-ticker-settings"><strong>Aparência dos cards</strong>
      <label>Transparência do card principal <input type="range" min="0" max="100" value={config.appearance.cards.featuredTransparency} onChange={(event)=>updateCards({ featuredTransparency:Number(event.target.value) })}/><span>{config.appearance.cards.featuredTransparency}%</span></label>
      <label>Transparência dos cards secundários <input type="range" min="0" max="100" value={config.appearance.cards.secondaryTransparency} onChange={(event)=>updateCards({ secondaryTransparency:Number(event.target.value) })}/><span>{config.appearance.cards.secondaryTransparency}%</span></label>
    </div>
    <div className="tpv2-ticker-settings"><strong>Aparência da barra RSS</strong>
      <div className="tpv2-color-grid"><label>Cor de fundo da barra<input type="color" value={config.feed.tickerBackground} onChange={(event)=>updateFeed({ tickerBackground:event.target.value })}/></label><label>Cor do texto<input type="color" value={config.feed.tickerTextColor} onChange={(event)=>updateFeed({ tickerTextColor:event.target.value })}/></label><label>Cor de destaque<input type="color" value={config.feed.tickerAccentColor} onChange={(event)=>updateFeed({ tickerAccentColor:event.target.value })}/></label></div>
      <label>Transparência da barra <input type="range" min="0" max="100" value={config.feed.tickerTransparency} onChange={(event)=>updateFeed({ tickerTransparency:Number(event.target.value) })}/><span>{config.feed.tickerTransparency}%</span></label>
      <div><span>Posição da barra RSS</span><div className="tpv2-news-position-options">{[["compact","Compacta"],["intermediate","Intermediária"],["expanded","Expandida"]].map(([position,label])=><button type="button" key={position} className={config.feed.position===position?"active":""} aria-pressed={config.feed.position===position} onClick={()=>updateFeed({ position })}>{label}</button>)}</div></div>
    </div>
  </div>;
}
