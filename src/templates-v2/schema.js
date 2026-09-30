export const TEMPLATE_V2_SCHEMA_VERSION = 2;
export const TEMPLATE_V2_RENDERER = "template-v2";

export const HERO_BUSINESS_TYPE = "hero-business";
export const SMART_LOBBY_TYPE = "smart-lobby";
export const CLOCK_PRO_TYPE = "clock-pro";
export const WEATHER_PREMIUM_TYPE = "weather-premium";
export const NEWS_EDITORIAL_TYPE = "news-editorial";
export const AGENDA_INFO_TYPE = "agenda-info";
export const PROMOTION_CAMPAIGN_TYPE = "promotion-campaign";
export const DIGITAL_MENU_TYPE = "digital-menu";
export const KPI_INDICATORS_TYPE = "kpi-indicators";
export const QR_INTERACTION_TYPE = "qr-interaction";
export const SPORTS_PREMIUM_TYPE = "sports-premium-v2";

const HERO_DEFAULTS = {
  display: {
    duration: 15,
    supportedOrientations: ["Paisagem", "Retrato"],
    defaultOrientation: "Paisagem",
  },
  layout: { contentPosition: "left" },
  content: {
    logo: null,
    headline: "Soluções que conectam o seu negócio.",
    subtitle: "Tecnologia, atendimento e confiança para transformar ideias em resultados.",
    services: [
      { id: "service-1", title: "Sistemas", description: "Soluções personalizadas" },
      { id: "service-2", title: "Consultoria", description: "Estratégia para crescer" },
      { id: "service-3", title: "Suporte", description: "Atendimento especializado" },
    ],
    cta: { enabled: true, label: "Conheça nossas soluções", url: "" },
  },
  visibility: { showLogo:true, showContent:true, showHeadline:true, showSubtitle:true, showCta:true, showServices:true },
  media: {
    primary: null,
  },
  style: {
    preset: "corporate",
    primaryColor: "#1597ff",
    secondaryColor: "#7755ff",
    backgroundColor: "#07111f",
    textColor: "#ffffff",
    mutedTextColor: "#c5d2e3",
    overlayOpacity: 52,
    panelTransparency: 0,
    mediaLayout: "split",
    mediaFit: "cover",
    mediaPosition: "center",
    typography: {
      headline: { fontSize: 78, lineHeight: 0.96, blockSpacing: 24, fontWeight: 900 },
      subtitle: { fontSize: 26, lineHeight: 1.35, blockSpacing: 20, fontWeight: 500 },
      cta: { fontSize: 15, lineHeight: 1.2, blockSpacing: 0, fontWeight: 900 },
      service: { fontSize: 17, lineHeight: 1.15, blockSpacing: 10, fontWeight: 800 },
    },
  },
  modules: {
    clock: { enabled: true, format: "24h", showDate: true, showLocal: true },
    weather: { enabled: false, city: "Sua cidade", showCity: true, showCurrent: true, showFeelsLike: true, showForecast: true, forecastDays: 5 },
    news: { enabled: false, newsSource: "", newsFeedUrl: "", selectedNewsSources: [], tickerSpeed: "normal", tickerSize: "normal", tickerBackground: "#07111f", tickerTextColor: "#ffffff", tickerTransparency: 8, tickerLabel: "Últimas notícias" },
    qrCode: { enabled: false, type: "link", countryCode: "55", phone: "", message: "", link: "", text: "", value: "", position: "bottom-right", size: "medium", margin: 32 },
  },
  orientationLayouts: {
    landscape: { contentOrder: "content-media" },
    portrait: { contentOrder: "media-content" },
  },
};

const TEMPLATE_PRESETS = {
  [HERO_BUSINESS_TYPE]: {},
  [SMART_LOBBY_TYPE]: { content: { headline: "Seja bem-vindo!", subtitle: "Informações e serviços para você.", services: [{ id:"1",title:"Atendimento",description:"Apoio ao visitante"},{id:"2",title:"Serviços",description:"Acesso rápido"},{id:"3",title:"Informações",description:"Comunicados úteis"}] }, style: { preset:"institutional",primaryColor:"#1458c7",secondaryColor:"#38bdf8",backgroundColor:"#eef5ff",textColor:"#102a56",mutedTextColor:"#39577e" } },
  [CLOCK_PRO_TYPE]: { content: { headline:"10:24",subtitle:"Segunda-feira, 22 de Setembro",services:[] }, style: { preset:"ambient",primaryColor:"#fbbf24",secondaryColor:"#fb7185",backgroundColor:"#071426" }, modules:{clock:{enabled:true,format:"24h"},weather:{enabled:true,city:"Sua cidade"},news:{enabled:true,newsSource:"Fonte configurada",newsFeedUrl:"",selectedNewsSources:[]}} },
  [WEATHER_PREMIUM_TYPE]: { content:{headline:"Previsão do tempo",subtitle:"Condições atuais e próximos dias",services:[]},style:{preset:"glass",primaryColor:"#38bdf8",secondaryColor:"#fbbf24",backgroundColor:"#082f49"},modules:{weather:{enabled:true,city:"Sua cidade"}} },
  [NEWS_EDITORIAL_TYPE]: { content:{headline:"Notícia principal",subtitle:"Resumo da informação em destaque.",services:[{id:"1",title:"Notícia secundária",description:"Resumo breve"},{id:"2",title:"Mais informações",description:"Atualização editorial"}]},style:{preset:"editorial",primaryColor:"#dc2626",secondaryColor:"#2563eb",backgroundColor:"#f8fafc",textColor:"#111827",mutedTextColor:"#475569"},modules:{news:{enabled:true,newsSource:"Fonte configurada",newsFeedUrl:"",selectedNewsSources:[]}} },
  [AGENDA_INFO_TYPE]: { content:{headline:"Agenda do dia",subtitle:"Reuniões, eventos e comunicados",services:[{id:"1",title:"09:00",description:"Primeiro compromisso"},{id:"2",title:"14:00",description:"Segundo compromisso"},{id:"3",title:"16:00",description:"Comunicado"}]},style:{preset:"agenda",primaryColor:"#2563eb",secondaryColor:"#06b6d4",backgroundColor:"#f8fafc",textColor:"#172554",mutedTextColor:"#475569"} },
  [PROMOTION_CAMPAIGN_TYPE]: { content:{headline:"Sua ideia ganha vida aqui.",subtitle:"Uma campanha com presença e impacto.",services:[{id:"1",title:"Benefício",description:"Destaque da campanha"}],cta:{enabled:true,label:"Saiba mais",url:""}},style:{preset:"cinematic",primaryColor:"#a855f7",secondaryColor:"#ec4899",backgroundColor:"#10051f"} },
  [DIGITAL_MENU_TYPE]: { content:{headline:"Menu especial",subtitle:"Produtos preparados para bons momentos",services:[{id:"1",title:"Produto destaque",description:"R$ 0,00"},{id:"2",title:"Produto",description:"R$ 0,00"},{id:"3",title:"Produto",description:"R$ 0,00"},{id:"4",title:"Produto",description:"R$ 0,00"}]},style:{preset:"cafe",primaryColor:"#d97706",secondaryColor:"#f59e0b",backgroundColor:"#1c1009"} },
  [KPI_INDICATORS_TYPE]: { content:{headline:"Indicadores",subtitle:"Visão geral do período",services:[{id:"1",title:"Indicador 01",description:"0"},{id:"2",title:"Indicador 02",description:"0"},{id:"3",title:"Meta",description:"0%"},{id:"4",title:"Variação",description:"0%"}]},style:{preset:"data",primaryColor:"#8b5cf6",secondaryColor:"#22d3ee",backgroundColor:"#07111f"} },
  [QR_INTERACTION_TYPE]: { content:{headline:"Acompanhe nosso conteúdo!",subtitle:"Aponte a câmera e conecte-se.",services:[],cta:{enabled:true,label:"Acesse agora",url:""}},style:{preset:"social",primaryColor:"#ef4444",secondaryColor:"#ffffff",backgroundColor:"#18050a"},modules:{qrCode:{enabled:true,value:""}} },
  [SPORTS_PREMIUM_TYPE]: { content:{headline:"Resultados Esportivos Premium",subtitle:"Sistema visual multiesportes",services:[]},style:{preset:"broadcast-dark",primaryColor:"#22d3ee",secondaryColor:"#8b5cf6",backgroundColor:"#07111f",overlayOpacity:58},modules:{news:{enabled:false,newsSource:"",newsFeedUrl:"",selectedNewsSources:[],tickerSpeed:"normal",tickerSize:"normal",tickerBackground:"#07111f",tickerTextColor:"#ffffff",tickerTransparency:8,tickerLabel:"Notícias esportivas"}},sports:{provider:"thesportsdb",mode:"single",selectedSport:"football",selectedSports:["football"],primarySport:"football",transition:"fade",visualPreset:"broadcast-dark"} },
};

export function cloneTemplateV2Config(config = HERO_DEFAULTS) {
  return JSON.parse(JSON.stringify(config));
}

export function createHeroBusinessDraft(overrides = {}) {
  const base = cloneTemplateV2Config(HERO_DEFAULTS);

  return {
    ...base,
    ...overrides,
    display: { ...base.display, ...(overrides.display || {}) },
    content: { ...base.content, ...(overrides.content || {}) },
    visibility: { ...base.visibility, ...(overrides.visibility || {}) },
    media: { ...base.media, ...(overrides.media || {}) },
    style: {
      ...base.style,
      ...(overrides.style || {}),
      typography: {
        ...base.style.typography,
        ...(overrides.style?.typography || {}),
        headline: { ...base.style.typography.headline, ...(overrides.style?.typography?.headline || {}) },
        subtitle: { ...base.style.typography.subtitle, ...(overrides.style?.typography?.subtitle || {}) },
        cta: { ...base.style.typography.cta, ...(overrides.style?.typography?.cta || {}) },
        service: { ...base.style.typography.service, ...(overrides.style?.typography?.service || {}) },
      },
    },
    modules: {
      ...base.modules,
      ...(overrides.modules || {}),
      clock: { ...base.modules.clock, ...(overrides.modules?.clock || {}) },
      weather: { ...base.modules.weather, ...(overrides.modules?.weather || {}) },
      news: { ...base.modules.news, ...(overrides.modules?.news || {}) },
      qrCode: { ...base.modules.qrCode, ...(overrides.modules?.qrCode || {}) },
    },
    orientationLayouts: {
      ...base.orientationLayouts,
      ...(overrides.orientationLayouts || {}),
    },
  };
}

export function createTemplateV2Draft(type = HERO_BUSINESS_TYPE, overrides = {}) {
  const preset = TEMPLATE_PRESETS[type] || TEMPLATE_PRESETS[HERO_BUSINESS_TYPE];
  const seeded = createHeroBusinessDraft(preset);
  return createHeroBusinessDraft({ ...seeded, ...overrides, layout:{...seeded.layout,...(overrides.layout||{})}, content:{...seeded.content,...(overrides.content||{})}, media:{...seeded.media,...(overrides.media||{})}, style:{...seeded.style,...(overrides.style||{})}, modules:{...seeded.modules,...(overrides.modules||{})} });
}

export function createTemplateV2Document({ name = "Hero Business", type = HERO_BUSINESS_TYPE, draft } = {}) {
  const safeDraft = createTemplateV2Draft(type, draft);

  return {
    schemaVersion: TEMPLATE_V2_SCHEMA_VERSION,
    renderer: TEMPLATE_V2_RENDERER,
    templateType: type,
    type,
    name,
    title: name,
    identity: {
      name,
      templateType: type,
      preset: safeDraft.style.preset || "corporate",
    },
    status: {
      enabled: true,
      publicationState: "draft",
      draftRevision: "",
      publishedRevision: "",
    },
    draft: safeDraft,
    published: null,
  };
}

export function isTemplateV2(template = {}) {
  return Number(template.schemaVersion) === TEMPLATE_V2_SCHEMA_VERSION && template.renderer === TEMPLATE_V2_RENDERER;
}

export function getTemplateV2Name(template = {}) {
  return template.identity?.name || template.name || "Template V2";
}

export function getTemplateV2PublishedConfig(template = {}) {
  return isTemplateV2(template) && template.published ? cloneTemplateV2Config(template.published) : null;
}

export function getTemplateV2DraftConfig(template = {}) {
  if (!isTemplateV2(template)) return createHeroBusinessDraft();
  return createTemplateV2Draft(template.identity?.templateType || template.templateType, template.draft || template.published || {});
}

export function getTemplateV2Assets(config = {}) {
  const assets = [];
  const candidates = [
    ["logo", config.content?.logo],
    ["primary", config.media?.primary],
    ["background", config.media?.background],
  ];
  Object.entries(config.sports?.items || {}).forEach(([sport,item]) => {
    [["homeLogo",item.homeLogo],["awayLogo",item.awayLogo],["fighterAImage",item.fighterAImage],["fighterBImage",item.fighterBImage]].forEach(([role,asset]) => candidates.push([`sports.${sport}.${role}`,asset]));
  });

  candidates.forEach(([role, asset]) => {
    if (!asset || (!asset.mediaId && !asset.url)) return;
    assets.push({
      role,
      mediaId: asset.mediaId || "",
      type: asset.type || "image",
      url: asset.url || asset.publicUrl || "",
      preview: asset.url || asset.publicUrl || "",
      remotePreview: asset.url || asset.publicUrl || "",
      storagePath: asset.storagePath || "",
      storageProvider: asset.storageProvider || asset.provider || "",
      fileHash: asset.fileHash || asset.hash || "",
      etag: asset.etag || "",
      sizeBytes: Number(asset.sizeBytes || 0),
    });
  });

  return assets;
}

export function stableTemplateV2Stringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableTemplateV2Stringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableTemplateV2Stringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function isTemplateV2Dirty(editorDraft, persistedDraft) {
  return stableTemplateV2Stringify(editorDraft) !== stableTemplateV2Stringify(persistedDraft);
}

export function getPublishedTemplateV2View(template = {}) {
  const published = getTemplateV2PublishedConfig(template);
  if (!published) return null;

  return {
    ...template,
    name: getTemplateV2Name(template),
    title: getTemplateV2Name(template),
    type: template.identity?.templateType || template.templateType || HERO_BUSINESS_TYPE,
    templateType: template.identity?.templateType || template.templateType || HERO_BUSINESS_TYPE,
    duration: Number(published.display?.duration || 15),
    orientation: published.display?.defaultOrientation || "Paisagem",
    published,
  };
}
