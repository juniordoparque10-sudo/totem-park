import { TemplateClock, TemplateCTA, TemplateDate, TemplateLogo, TemplateMedia, TemplateNewsTicker, TemplateQRCode, TemplateWeather } from "./TemplateV2Modules";
import { CLOCK_PRO_TYPE, HERO_BUSINESS_TYPE, KPI_INDICATORS_TYPE, WEATHER_PREMIUM_TYPE, getTemplateV2Name } from "./schema";
import "./template-v2.css";

function HeroBusiness({ config, orientation, name, compact, tv, type, dynamicData, mode }) {
  const style = config.style || {};
  const content = config.content || {};
  const modules = config.modules || {};
  const services = Array.isArray(content.services) ? content.services.slice(0, 4) : [];
  const typography = style.typography || {};
  const logicalWidth = orientation === "Retrato" ? 1080 : 1920;
  const contentRight = config.layout?.contentPosition === "right";
  const toContainerWidth = (value, fallback) => `${((Number(value) || fallback) / logicalWidth) * 100}cqw`;

  return (
    <section
      className={`tpv2-root tpv2-hero tpv2-kind-${type} ${orientation === "Retrato" ? "is-portrait" : "is-landscape"} ${contentRight ? "content-right" : "content-left"} ${style.mediaLayout === "full" ? "is-full-background" : "is-split"} ${modules.news?.enabled ? `has-news-ticker ticker-${modules.news.tickerSize || "normal"}` : ""} ${compact ? "is-compact" : ""} ${tv ? "is-tv" : ""}`}
      style={{
        "--tpv2-primary": style.primaryColor || "#1597ff",
        "--tpv2-secondary": style.secondaryColor || "#7755ff",
        "--tpv2-bg": style.backgroundColor || "#07111f",
        "--tpv2-text": style.textColor || "#fff",
        "--tpv2-muted": style.mutedTextColor || "#c5d2e3",
        "--tpv2-overlay": `${Math.max(0, Math.min(90, Number(style.overlayOpacity ?? 52)))}%`,
        "--tpv2-panel-opacity": `${100 - Math.max(0, Math.min(100, Number(style.panelTransparency ?? 0)))}%`,
        "--tpv2-headline-size": toContainerWidth(typography.headline?.fontSize, 78),
        "--tpv2-headline-line": Math.max(0.82, Math.min(1.5, Number(typography.headline?.lineHeight) || 0.96)),
        "--tpv2-headline-weight": Math.max(400, Math.min(950, Number(typography.headline?.fontWeight) || 900)),
        "--tpv2-subtitle-size": toContainerWidth(typography.subtitle?.fontSize, 26),
        "--tpv2-subtitle-line": Math.max(1, Math.min(1.8, Number(typography.subtitle?.lineHeight) || 1.35)),
        "--tpv2-subtitle-weight": Math.max(400, Math.min(900, Number(typography.subtitle?.fontWeight) || 500)),
        "--tpv2-cta-size": toContainerWidth(typography.cta?.fontSize, 15),
        "--tpv2-cta-line": Math.max(1, Math.min(1.6, Number(typography.cta?.lineHeight) || 1.2)),
        "--tpv2-service-size": toContainerWidth(typography.service?.fontSize, 17),
        "--tpv2-service-line": Math.max(1, Math.min(1.6, Number(typography.service?.lineHeight) || 1.15)),
        "--tpv2-message-gap": toContainerWidth(typography.headline?.blockSpacing, 24),
        "--tpv2-service-gap": toContainerWidth(typography.service?.blockSpacing, 10),
      }}
    >
      <div className="tpv2-copy">
        <header className="tpv2-brand">
          <TemplateLogo asset={content.logo} name={name} />
        </header>

        <div className="tpv2-message">
          <span className="tpv2-kicker">Soluções profissionais</span>
          <h2>{type === CLOCK_PRO_TYPE && modules.clock?.enabled ? <TemplateClock format={modules.clock.format} large /> : content.headline}</h2>
          <p>{content.subtitle}</p>
        </div>

        {services.length > 0 && (
          <div className="tpv2-services">
            {services.map((service, index) => (
              <article key={service.id || `${service.title}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{service.title}</strong><small>{service.description}</small></div>
              </article>
            ))}
          </div>
        )}

        <footer className="tpv2-footer">
          <TemplateCTA config={content.cta} />
        </footer>
      </div>

      <div className="tpv2-media">
        <TemplateMedia asset={config.media?.primary} fit={style.mediaFit || "cover"} position={style.mediaPosition || "center"} mode={mode} />
        <div className="tpv2-media-shade" />
        <div className="tpv2-live-modules">
          {modules.weather?.enabled && <TemplateWeather config={modules.weather} data={dynamicData?.weather} />}
          {modules.clock?.enabled && type !== CLOCK_PRO_TYPE && <TemplateClock format={modules.clock.format} />}
        </div>
        {modules.news?.enabled && <TemplateNewsTicker items={dynamicData?.news} config={modules.news} orientation={orientation} />}
      </div>
      {modules.qrCode?.enabled && <TemplateQRCode config={modules.qrCode} />}
    </section>
  );
}

function dynamicStyle(config) {
  const style = config.style || {};
  return {"--tpv2-primary":style.primaryColor || "#38bdf8","--tpv2-secondary":style.secondaryColor || "#fbbf24","--tpv2-bg":style.backgroundColor || "#071426","--tpv2-text":style.textColor || "#fff","--tpv2-muted":style.mutedTextColor || "#cbd5e1","--tpv2-overlay":`${Math.max(0,Math.min(90,Number(style.overlayOpacity ?? 52)))}%`,"--tpv2-panel-opacity":`${100-Math.max(0,Math.min(100,Number(style.panelTransparency ?? 0)))}%`};
}

function DynamicBackdrop({ config, mode }) { return <div className="tpv2-dynamic-backdrop"><TemplateMedia asset={config.media?.primary} fit={config.style?.mediaFit || "cover"} position={config.style?.mediaPosition || "center"} mode={mode}/><div className="tpv2-media-shade"/></div>; }

function ClockPro({ config, orientation, name, dynamicData, mode }) {
  const modules = config.modules || {};
  const weather = dynamicData?.weather;
  return <section className={`tpv2-root tpv2-clock-pro ${orientation === "Retrato" ? "is-portrait" : "is-landscape"} ${modules.news?.enabled ? `has-news-ticker ticker-${modules.news.tickerSize || "normal"}` : ""}`} style={dynamicStyle(config)}><DynamicBackdrop config={config} mode={mode}/><div className="tpv2-dynamic-panel"><header><TemplateLogo asset={config.content?.logo} name={name}/></header><main><TemplateClock format={modules.clock?.format} large/>{modules.clock?.showDate && <TemplateDate/>}{modules.clock?.showLocal && <span className="tpv2-clock-location">{weather?.city || modules.weather?.city}</span>}{modules.weather?.enabled && <TemplateWeather config={modules.weather} data={weather}/>}</main></div>{modules.news?.enabled && <TemplateNewsTicker items={dynamicData?.news} config={modules.news} orientation={orientation}/>}</section>;
}

function WeatherPremium({ config, orientation, name, dynamicData, mode }) {
  const weatherConfig = config.modules?.weather || {};
  const weather = dynamicData?.weather;
  const loading = dynamicData?.loading;
  const forecast = (weather?.forecast || []).slice(0,Math.max(3,Math.min(5,Number(weatherConfig.forecastDays)||5)));
  return <section className={`tpv2-root tpv2-weather-premium ${orientation === "Retrato" ? "is-portrait" : "is-landscape"} ${config.modules?.news?.enabled ? `has-news-ticker ticker-${config.modules.news.tickerSize || "normal"}` : ""}`} style={dynamicStyle(config)}><DynamicBackdrop config={config} mode={mode}/><div className="tpv2-weather-shell"><header><TemplateLogo asset={config.content?.logo} name={name}/>{weatherConfig.showCity && <span>{weather?.city || weatherConfig.city}</span>}</header>{loading ? <div className="tpv2-weather-loading"><i/><i/><i/></div> : weather?.unavailable || !weather ? <div className="tpv2-weather-unavailable">Previsão temporariamente indisponível</div> : <><main>{weatherConfig.showCurrent && <><span className="tpv2-weather-icon">{weather.icon}</span><strong>{weather.temperature}°C</strong><div><b>{weather.condition}</b>{weatherConfig.showFeelsLike && <small>Sensação térmica {weather.sensation}°C</small>}</div></>}</main>{weatherConfig.showForecast && <div className="tpv2-forecast-grid">{forecast.map((day) => <article key={day.date}><span>{day.day}</span><b>{day.icon}</b><strong>{day.max}°</strong><small>{day.min}°</small></article>)}</div>}</>}</div>{config.modules?.news?.enabled && <TemplateNewsTicker items={dynamicData?.news} config={config.modules.news} orientation={orientation}/>}</section>;
}

export default function TemplateV2Renderer({ template, config, orientation, compact = false, tv = false, dynamicData = null, mode = "player" }) {
  const resolvedConfig = config || template?.published;
  if (!resolvedConfig) return null;
  const type = template?.identity?.templateType || template?.templateType || HERO_BUSINESS_TYPE;
  const resolvedOrientation = orientation || resolvedConfig.display?.defaultOrientation || "Paisagem";

  if (type === CLOCK_PRO_TYPE) return <ClockPro config={resolvedConfig} orientation={resolvedOrientation} name={getTemplateV2Name(template)} dynamicData={dynamicData} mode={mode}/>;
  if (type === WEATHER_PREMIUM_TYPE) return <WeatherPremium config={resolvedConfig} orientation={resolvedOrientation} name={getTemplateV2Name(template)} dynamicData={dynamicData} mode={mode}/>;
  return <HeroBusiness config={resolvedConfig} orientation={resolvedOrientation} name={getTemplateV2Name(template)} compact={compact} tv={tv} type={type} dynamicData={dynamicData} mode={mode} isKpi={type === KPI_INDICATORS_TYPE} />;
}
