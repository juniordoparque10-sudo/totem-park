import {
  AGENDA_INFO_TYPE, CLOCK_PRO_TYPE, DIGITAL_MENU_TYPE, HERO_BUSINESS_TYPE,
  KPI_INDICATORS_TYPE, NEWS_EDITORIAL_TYPE, PROMOTION_CAMPAIGN_TYPE,
  QR_INTERACTION_TYPE, SMART_LOBBY_TYPE, WEATHER_PREMIUM_TYPE, createTemplateV2Draft,
  SPORTS_PREMIUM_TYPE,
} from "./schema.js";

const entries = [
  [HERO_BUSINESS_TYPE,"Hero Business","Corporativo","Marca, serviços e mídia em composição premium.","corporate",["clock","weather","qrCode"]],
  [SMART_LOBBY_TYPE,"Smart Lobby","Institucional","Recepção, boas-vindas, serviços e informações.","institutional",["clock","weather","news"]],
  [CLOCK_PRO_TYPE,"Hora Certa Pro","Informações","Hora, data, clima e notícias em destaque.","ambient",["clock","weather","news","ticker"]],
  [WEATHER_PREMIUM_TYPE,"Previsão do Tempo Premium","Informações","Condições atuais e previsão resumida.","glass",["weather","clock"]],
  [NEWS_EDITORIAL_TYPE,"Notícias Editorial","Notícias","Notícia principal e destaques secundários.","editorial",["news","clock"]],
  [AGENDA_INFO_TYPE,"Agenda & Informações","Informações","Horários, eventos, reuniões e comunicados.","agenda",["qrCode","clock"]],
  [PROMOTION_CAMPAIGN_TYPE,"Promoção / Campanha","Promoções","Campanhas visuais com CTA e benefícios.","cinematic",["qrCode","clock","weather"]],
  [DIGITAL_MENU_TYPE,"Menu Digital","Restaurantes","Produtos, preços e destaque comercial.","cafe",[]],
  [KPI_INDICATORS_TYPE,"KPI / Indicadores","Indicadores","Cards, metas e variações com dados informados.","data",[]],
  [QR_INTERACTION_TYPE,"QR Code / Interação","Interação","Campanhas, redes sociais e serviços.","social",["qrCode"]],
  [SPORTS_PREMIUM_TYPE,"Resultados Esportivos Premium V2","Esportes","Cards modulares, rotação multiesportes e tela dividida.","sports",["news"]],
];

export const TEMPLATE_V2_REGISTRY = Object.fromEntries(entries.map(([type,label,category,description,preset,modules]) => [type, {
  type, label, category, description, preset, modules, newsTicker:modules.includes("news"), orientations:["Paisagem","Retrato"], thumbnail:`template-v2-${type}`,
  createDraft:(overrides) => createTemplateV2Draft(type, overrides),
}]));

export const TEMPLATE_V2_CATEGORIES = ["Todos","Institucional","Promoções","Informações","Notícias","Corporativo","Restaurantes","Interação","Indicadores","Esportes"];

export function getTemplateV2Definition(type) {
  return TEMPLATE_V2_REGISTRY[type] || null;
}
export function listTemplateV2Definitions() { return Object.values(TEMPLATE_V2_REGISTRY); }
