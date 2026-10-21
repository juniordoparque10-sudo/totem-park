import { normalizeTemplateV2Orientation } from "./orientation.js";
import { normalizeNewsEditorialDynamicConfig } from "./news-editorial-dynamic/config.js";
import { normalizeSmartLobbyConfig } from "./smart-lobby/config.js";
import { normalizeAgendaInfoConfig } from "./agenda-info/config.js";
import { normalizePromotionCampaignConfig } from "./promotion-campaign/config.js";
import { normalizeDigitalMenuConfig } from "./digital-menu/config.js";
import { normalizeKpiIndicatorsConfig } from "./kpi-indicators/config.js";
import { normalizeQrInteractionConfig } from "./qr-interaction/config.js";

export const TEMPLATE_V2_SCHEMA_VERSION = 2;
export const TEMPLATE_V2_RENDERER = "template-v2";

export const HERO_BUSINESS_TYPE = "hero-business";
export const SMART_LOBBY_TYPE = "smart-lobby";
export const CLOCK_PRO_TYPE = "clock-pro";
export const WEATHER_PREMIUM_TYPE = "weather-premium";
export const NEWS_EDITORIAL_TYPE = "news-editorial";
export const NEWS_EDITORIAL_DYNAMIC_TYPE = "news-editorial-dynamic";
export const MARKET_PREMIUM_TYPE = "market-premium";
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
  [SMART_LOBBY_TYPE]: { dynamicTemplate:true,content: { headline: "Seja bem-vindo!", subtitle: "Informações e serviços para você.", services: [] }, style: { preset:"institutional",primaryColor:"#1458c7",secondaryColor:"#38bdf8",backgroundColor:"#eef5ff",textColor:"#102a56",mutedTextColor:"#39577e" },smartLobby:{layout:"A",secondarySlots:3,items:[],rotation:{intervalSeconds:8,featuredSeconds:8,secondarySeconds:8,transition:"fade"}} },
  [CLOCK_PRO_TYPE]: { content: { headline:"10:24",subtitle:"Segunda-feira, 22 de Setembro",services:[] }, style: { preset:"ambient",primaryColor:"#fbbf24",secondaryColor:"#fb7185",backgroundColor:"#071426" }, modules:{clock:{enabled:true,format:"24h"},weather:{enabled:true,city:"Sua cidade"},news:{enabled:true,newsSource:"Fonte configurada",newsFeedUrl:"",selectedNewsSources:[]}} },
  [WEATHER_PREMIUM_TYPE]: { content:{headline:"Previsão do tempo",subtitle:"Condições atuais e próximos dias",services:[]},style:{preset:"glass",primaryColor:"#38bdf8",secondaryColor:"#fbbf24",backgroundColor:"#082f49"},modules:{weather:{enabled:true,city:"Sua cidade"}} },
  [NEWS_EDITORIAL_TYPE]: { content:{headline:"Notícia principal",subtitle:"Resumo da informação em destaque.",services:[{id:"1",title:"Notícia secundária",description:"Resumo breve"},{id:"2",title:"Mais informações",description:"Atualização editorial"}]},style:{preset:"editorial",primaryColor:"#dc2626",secondaryColor:"#2563eb",backgroundColor:"#f8fafc",textColor:"#111827",mutedTextColor:"#475569"},modules:{news:{enabled:true,newsSource:"Fonte configurada",newsFeedUrl:"",selectedNewsSources:[]}} },
  [NEWS_EDITORIAL_DYNAMIC_TYPE]: { dynamicTemplate:true,content:{headline:"Notícias em destaque",subtitle:"Atualização editorial dinâmica",services:[]},style:{preset:"editorial-dynamic",primaryColor:"#22d3ee",secondaryColor:"#8b5cf6",backgroundColor:"#07111f",textColor:"#ffffff",mutedTextColor:"#cbd5e1"},modules:{news:{enabled:true,dynamicStrict:true,newsSource:"",newsFeedUrl:"",selectedNewsSources:[]}},dynamicNews:{layout:"A",showImage:true,showSummary:true,showSource:true,showDate:true,secondarySlots:3,rotation:{intervalSeconds:12,featuredSeconds:12,secondarySeconds:12,transition:"fade"}} },
  [MARKET_PREMIUM_TYPE]: { dynamicTemplate:true,content:{headline:"Ofertas da semana",subtitle:"Qualidade e economia",services:[]},style:{preset:"market-premium",primaryColor:"#22d3ee",secondaryColor:"#8b5cf6",backgroundColor:"#061426",textColor:"#ffffff",mutedTextColor:"#b8c8df"},market:{layout:"A",segment:"Supermercado",catalog:[],rotation:{intervalSeconds:10,featuredSeconds:10,secondarySeconds:10,transition:"fade"}} },
  [AGENDA_INFO_TYPE]: { dynamicTemplate:true,content:{headline:"Agenda do dia",subtitle:"Reuniões, eventos e comunicados",services:[]},style:{preset:"agenda",primaryColor:"#2563eb",secondaryColor:"#06b6d4",backgroundColor:"#f8fafc",textColor:"#172554",mutedTextColor:"#475569"},agenda:{layout:"A",secondarySlots:3,items:[],rotation:{featuredSeconds:8,secondarySeconds:5,transition:"fade"}} },
  [PROMOTION_CAMPAIGN_TYPE]: { dynamicTemplate:true,content:{headline:"Sua ideia ganha vida aqui.",subtitle:"Uma campanha com presença e impacto.",services:[],cta:{enabled:true,label:"Saiba mais",url:""}},style:{preset:"cinematic",primaryColor:"#a855f7",secondaryColor:"#ec4899",backgroundColor:"#10051f"},campaign:{layout:"A",secondarySlots:3,items:[],rotation:{featuredSeconds:8,secondarySeconds:5,transition:"fade"}} },
  [DIGITAL_MENU_TYPE]: { dynamicTemplate:true,content:{headline:"Menu especial",subtitle:"Produtos preparados para bons momentos",services:[]},style:{preset:"cafe",primaryColor:"#d97706",secondaryColor:"#f59e0b",backgroundColor:"#1c1009"},digitalMenu:{layout:"A",categories:[],products:[],rotation:{featuredSeconds:8,secondarySeconds:5,transition:"fade"}} },
  [KPI_INDICATORS_TYPE]: { dynamicTemplate:true,content:{headline:"Indicadores",subtitle:"Visão geral do período",services:[]},style:{preset:"data",primaryColor:"#8b5cf6",secondaryColor:"#22d3ee",backgroundColor:"#07111f"},kpi:{layout:"A",secondarySlots:3,items:[],rotation:{featuredSeconds:8,secondarySeconds:5,transition:"fade"}} },
  [QR_INTERACTION_TYPE]: { dynamicTemplate:true,content:{headline:"Acompanhe nosso conteúdo!",subtitle:"Aponte a câmera e conecte-se.",services:[],cta:{enabled:true,label:"Acesse agora",url:""}},style:{preset:"social",primaryColor:"#ef4444",secondaryColor:"#ffffff",backgroundColor:"#18050a"},interaction:{layout:"A",secondarySlots:3,items:[],rotation:{featuredSeconds:8,secondarySeconds:5,transition:"fade"}},modules:{qrCode:{enabled:false,value:""}} },
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
  const draft = createHeroBusinessDraft({ ...seeded, ...overrides, layout:{...seeded.layout,...(overrides.layout||{})}, content:{...seeded.content,...(overrides.content||{})}, media:{...seeded.media,...(overrides.media||{})}, style:{...seeded.style,...(overrides.style||{})}, modules:{...seeded.modules,...(overrides.modules||{})} });
  if (type === NEWS_EDITORIAL_DYNAMIC_TYPE) draft.dynamicNews = normalizeNewsEditorialDynamicConfig(draft.dynamicNews, draft.modules.news);
  if (type === SMART_LOBBY_TYPE) draft.smartLobby = normalizeSmartLobbyConfig(draft.smartLobby);
  if (type === AGENDA_INFO_TYPE) draft.agenda = normalizeAgendaInfoConfig(draft.agenda);
  if (type === PROMOTION_CAMPAIGN_TYPE) draft.campaign = normalizePromotionCampaignConfig(draft.campaign);
  if (type === DIGITAL_MENU_TYPE) draft.digitalMenu = normalizeDigitalMenuConfig(draft.digitalMenu);
  if (type === KPI_INDICATORS_TYPE) draft.kpi = normalizeKpiIndicatorsConfig(draft.kpi);
  if (type === QR_INTERACTION_TYPE) draft.interaction = normalizeQrInteractionConfig(draft.interaction);
  return draft;
}

export function createTemplateV2Document({ name = "Hero Business", type = HERO_BUSINESS_TYPE, draft } = {}) {
  const safeDraft = createTemplateV2Draft(type, draft);
  const orientation = normalizeTemplateV2Orientation(safeDraft.display?.defaultOrientation);

  return {
    schemaVersion: TEMPLATE_V2_SCHEMA_VERSION,
    renderer: TEMPLATE_V2_RENDERER,
    templateType: type,
    type,
    name,
    title: name,
    orientation,
    aspectRatio: orientation === "Retrato" ? "9:16" : "16:9",
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
  const source = template.draft || template.published || {};
  const orientation = normalizeTemplateV2Orientation(
    source.display?.defaultOrientation,
    normalizeTemplateV2Orientation(template.orientation || template.aspectRatio)
  );
  return createTemplateV2Draft(template.identity?.templateType || template.templateType, {
    ...source,
    display: { ...(source.display || {}), defaultOrientation: orientation },
  });
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
  (config.market?.catalog || []).forEach((product) => {
    if (product?.image) candidates.push([`market.product.${product.id || "item"}`, product.image]);
  });
  [["smartLobby",config.smartLobby?.items],["agenda",config.agenda?.items],["campaign",config.campaign?.items],["digitalMenu",config.digitalMenu?.products],["kpi",config.kpi?.items],["interaction",config.interaction?.items]].forEach(([group,items]) => {
    (items || []).forEach((item) => { if (item?.image) candidates.push([`${group}.item.${item.id || "item"}`,item.image]); });
  });

  const seen = new Set();
  candidates.forEach(([role, asset]) => {
    if (!asset || (!asset.mediaId && !asset.url)) return;
    const assetKey = asset.mediaId || asset.url || asset.publicUrl;
    if (seen.has(assetKey)) return;
    seen.add(assetKey);
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
  const orientation = normalizeTemplateV2Orientation(
    published.display?.defaultOrientation,
    normalizeTemplateV2Orientation(template.orientation || template.aspectRatio)
  );

  return {
    ...template,
    name: getTemplateV2Name(template),
    title: getTemplateV2Name(template),
    type: template.identity?.templateType || template.templateType || HERO_BUSINESS_TYPE,
    templateType: template.identity?.templateType || template.templateType || HERO_BUSINESS_TYPE,
    duration: Number(published.display?.duration || 15),
    orientation,
    aspectRatio: orientation === "Retrato" ? "9:16" : "16:9",
    published,
  };
}

function templateV2PreviewFingerprint(config) {
  const source = stableTemplateV2Stringify(config);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getTemplateV2LibraryPreviewState(template = {}) {
  const publishedView = getPublishedTemplateV2View(template);
  const draft = getTemplateV2DraftConfig(template);
  const hasUnpublishedChanges = Boolean(publishedView && isTemplateV2Dirty(draft, publishedView.published));
  const source = hasUnpublishedChanges || !publishedView ? "draft" : "published";
  const config = source === "draft" ? draft : publishedView.published;
  const revision = source === "draft" ? template.status?.draftRevision : template.status?.publishedRevision;
  return {
    config,
    source,
    hasUnpublishedChanges,
    versionKey:`${template.id || "template"}:${source}:${revision || templateV2PreviewFingerprint(config)}`,
  };
}
