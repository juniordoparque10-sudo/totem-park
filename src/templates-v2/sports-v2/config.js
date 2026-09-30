export const SPORTS_V2_MODES = Object.freeze({ SINGLE: "single", ROTATION: "rotation", SPLIT: "split" });

export const SPORTS_V2_TYPES = [
  ["football", "Futebol"],
  ["basketball", "Basquete"],
  ["volleyball", "Vôlei"],
  ["futsal", "Futsal"],
  ["motorsport", "Automobilismo"],
  ["combat", "MMA / Lutas"],
];

const teamEvent = (type, home, away, extra = {}) => ({
  id: type, type, enabled: type === "football", competition: "Competição", stage: "Rodada / evento",
  status: "Final", home, away, homeScore: "0", awayScore: "0", homeLogo: null, awayLogo: null,
  displayMode: "result", duration: 10, ...extra,
});

export const SPORTS_V2_DEFAULT_ITEMS = Object.freeze({
  football: teamEvent("football", "Mandante", "Visitante", { enabled:true, competition:"Campeonato", stage:"Rodada 1", homeScore:"2", awayScore:"1", events:["Gol · 18 min", "Gol · 62 min"], stats:[{label:"Posse",home:"54%",away:"46%"},{label:"Finalizações",home:"12",away:"8"},{label:"Escanteios",home:"6",away:"4"}] }),
  basketball: teamEvent("basketball", "Equipe A", "Equipe B", { homeScore:"98", awayScore:"94", periods:["24×22","23×25","27×21","24×26"], stats:[{label:"Rebotes",home:"41",away:"37"},{label:"Assistências",home:"24",away:"21"}] }),
  volleyball: teamEvent("volleyball", "Equipe A", "Equipe B", { homeScore:"3", awayScore:"1", periods:["25×21","22×25","25×19","25×20"], stats:[{label:"Ataques",home:"48",away:"39"},{label:"Bloqueios",home:"9",away:"6"},{label:"Aces",home:"7",away:"4"}] }),
  futsal: teamEvent("futsal", "Mandante", "Visitante", { homeScore:"4", awayScore:"3", events:["Gol · 06 min", "Gol · 18 min"], stats:[{label:"Finalizações",home:"18",away:"14"},{label:"Faltas",home:"5",away:"6"}] }),
  motorsport: { id:"motorsport", type:"motorsport", enabled:false, competition:"Categoria", stage:"Grande Prêmio", status:"Final", circuit:"Circuito", duration:10, standings:[{position:1,name:"Piloto 1",team:"Equipe A",time:"1:32:04"},{position:2,name:"Piloto 2",team:"Equipe B",time:"+2.4s"},{position:3,name:"Piloto 3",team:"Equipe C",time:"+5.1s"}] },
  combat: { id:"combat", type:"combat", enabled:false, competition:"Evento", stage:"Card principal", status:"Final", category:"Categoria", fighterA:"Atleta A", fighterB:"Atleta B", winner:"Atleta A", method:"Decisão", round:"3", time:"5:00", duration:10, fighterAImage:null, fighterBImage:null },
});

export function createSportsV2Config() {
  return {
    provider: "manual", mode: SPORTS_V2_MODES.SINGLE, selectedSport: "football", selectedSports:["football"],
    primarySport:"football", transition:"fade", visualPreset:"broadcast-dark",
    items: Object.fromEntries(Object.entries(SPORTS_V2_DEFAULT_ITEMS).map(([key,value]) => [key, structuredClone(value)])),
  };
}

export function normalizeSportsV2Config(value = {}) {
  const base = createSportsV2Config();
  const items = Object.fromEntries(Object.keys(base.items).map((type) => [type, { ...base.items[type], ...(value.items?.[type] || {}), type, id:type }]));
  const allowed = new Set(SPORTS_V2_TYPES.map(([type]) => type));
  const selectedSports = [...new Set((value.selectedSports || []).filter((type) => allowed.has(type)))].slice(0,4);
  const selectedSport = allowed.has(value.selectedSport) ? value.selectedSport : selectedSports[0] || "football";
  return { ...base, ...value, items, selectedSport, selectedSports:selectedSports.length ? selectedSports : [selectedSport], primarySport:allowed.has(value.primarySport) ? value.primarySport : selectedSport };
}

export function getSportsV2Timing(sports, totalDuration) {
  const config = normalizeSportsV2Config(sports);
  const selected = config.selectedSports;
  const total = Math.max(5, Number(totalDuration) || 15);
  const used = selected.reduce((sum,type) => sum + Math.max(1,Number(config.items[type]?.duration)||1),0);
  return { total, used, remaining:total-used, valid:used === total };
}

export function distributeSportsV2Timing(sports, totalDuration) {
  const config = normalizeSportsV2Config(sports);
  const total = Math.max(5, Number(totalDuration) || 15);
  const count = config.selectedSports.length || 1;
  const base = Math.floor(total / count);
  let remainder = total - base * count;
  config.selectedSports.forEach((type) => { config.items[type].duration = base + (remainder-- > 0 ? 1 : 0); });
  return config;
}
