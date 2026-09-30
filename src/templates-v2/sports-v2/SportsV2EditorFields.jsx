import { distributeSportsV2Timing, getSportsV2Timing, normalizeSportsV2Config, SPORTS_V2_MODES, SPORTS_V2_TYPES } from "./config";

const labelFor = (type) => SPORTS_V2_TYPES.find(([value])=>value===type)?.[1] || type;

function TeamFields({ item, updateItem }) {
  return <div className="sports-v2-editor-grid"><label>Competição<input value={item.competition} onChange={(e)=>updateItem({competition:e.target.value})}/></label><label>Rodada/evento<input value={item.stage} onChange={(e)=>updateItem({stage:e.target.value})}/></label><label>Mandante<input value={item.home} onChange={(e)=>updateItem({home:e.target.value})}/></label><label>Visitante<input value={item.away} onChange={(e)=>updateItem({away:e.target.value})}/></label><label>Placar mandante<input value={item.homeScore} onChange={(e)=>updateItem({homeScore:e.target.value})}/></label><label>Placar visitante<input value={item.awayScore} onChange={(e)=>updateItem({awayScore:e.target.value})}/></label></div>;
}
function MotorsportFields({ item, updateItem }) { return <div className="sports-v2-editor-grid"><label>Competição<input value={item.competition} onChange={(e)=>updateItem({competition:e.target.value})}/></label><label>Evento<input value={item.stage} onChange={(e)=>updateItem({stage:e.target.value})}/></label><label>Circuito<input value={item.circuit} onChange={(e)=>updateItem({circuit:e.target.value})}/></label>{item.standings.slice(0,3).map((row,index)=><label key={index}>P{index+1} · Piloto<input value={row.name} onChange={(e)=>{const standings=structuredClone(item.standings);standings[index].name=e.target.value;updateItem({standings});}}/></label>)}</div>; }
function CombatFields({ item, updateItem }) { return <div className="sports-v2-editor-grid"><label>Evento<input value={item.competition} onChange={(e)=>updateItem({competition:e.target.value})}/></label><label>Categoria<input value={item.category} onChange={(e)=>updateItem({category:e.target.value})}/></label><label>Atleta A<input value={item.fighterA} onChange={(e)=>updateItem({fighterA:e.target.value})}/></label><label>Atleta B<input value={item.fighterB} onChange={(e)=>updateItem({fighterB:e.target.value})}/></label><label>Vencedor<input value={item.winner} onChange={(e)=>updateItem({winner:e.target.value})}/></label><label>Método<input value={item.method} onChange={(e)=>updateItem({method:e.target.value})}/></label><label>Round<input value={item.round} onChange={(e)=>updateItem({round:e.target.value})}/></label><label>Tempo<input value={item.time} onChange={(e)=>updateItem({time:e.target.value})}/></label></div>; }

export default function SportsV2EditorFields({ value, totalDuration, onChange }) {
  const config = normalizeSportsV2Config(value);
  const multi = config.mode !== SPORTS_V2_MODES.SINGLE;
  const editingType = config.selectedSport;
  const item = config.items[editingType];
  const timing = getSportsV2Timing(config,totalDuration);
  const update = (patch) => onChange({...config,...patch});
  const updateItem = (patch) => update({items:{...config.items,[editingType]:{...item,...patch}}});
  const toggleSport = (type) => {
    const exists=config.selectedSports.includes(type);
    let selected=exists?config.selectedSports.filter((value)=>value!==type):[...config.selectedSports,type];
    if (!selected.length) selected=[type];
    if (config.mode===SPORTS_V2_MODES.SPLIT) selected=selected.slice(0,4);
    update({selectedSports:selected,selectedSport:selected.includes(config.selectedSport)?config.selectedSport:selected[0],primarySport:selected.includes(config.primarySport)?config.primarySport:selected[0]});
  };
  return <div className="sports-v2-editor">
    <div className="sports-v2-editor-grid"><label>Modo de exibição<select value={config.mode} onChange={(e)=>update({mode:e.target.value,selectedSports:e.target.value===SPORTS_V2_MODES.SINGLE?[config.selectedSport]:config.selectedSports})}><option value="single">Esporte único</option><option value="rotation">Rotativo multiesportes</option><option value="split">Tela dividida</option></select></label><label>Preset visual<select value={config.visualPreset} onChange={(e)=>update({visualPreset:e.target.value})}><option value="broadcast-dark">Broadcast Dark</option><option value="clean-sports">Clean Sports</option><option value="stadium">Stadium</option><option value="neon-sports">Neon Sports</option></select></label></div>
    {multi && <div className="sports-v2-selector"><strong>Selecionar esportes {config.mode===SPORTS_V2_MODES.SPLIT&&"(2 a 4)"}</strong>{SPORTS_V2_TYPES.map(([type,label])=><label className="tpv2-check" key={type}><input type="checkbox" checked={config.selectedSports.includes(type)} onChange={()=>toggleSport(type)}/>{label}</label>)}</div>}
    {config.mode===SPORTS_V2_MODES.SINGLE&&<label>Esporte<select value={config.selectedSport} onChange={(e)=>update({selectedSport:e.target.value,selectedSports:[e.target.value],primarySport:e.target.value})}>{SPORTS_V2_TYPES.map(([type,label])=><option key={type} value={type}>{label}</option>)}</select></label>}
    {config.mode===SPORTS_V2_MODES.SPLIT&&<label>Esporte principal<select value={config.primarySport} onChange={(e)=>update({primarySport:e.target.value})}>{config.selectedSports.map((type)=><option key={type} value={type}>{labelFor(type)}</option>)}</select></label>}
    {multi&&<div className="sports-v2-edit-tabs">{config.selectedSports.map((type)=><button type="button" className={editingType===type?"active":""} key={type} onClick={()=>update({selectedSport:type})}>{labelFor(type)}</button>)}</div>}
    <div className="sports-v2-editor-card"><strong>{labelFor(editingType)} · entrada manual</strong><label>Status<select value={item.status} onChange={(e)=>updateItem({status:e.target.value})}><option>Agendado</option><option>Ao vivo</option><option>Intervalo</option><option>Final</option></select></label>{editingType==="motorsport"?<MotorsportFields item={item} updateItem={updateItem}/>:editingType==="combat"?<CombatFields item={item} updateItem={updateItem}/>:<TeamFields item={item} updateItem={updateItem}/>}</div>
    {config.mode===SPORTS_V2_MODES.ROTATION&&<div className={`sports-v2-timing ${timing.valid?"valid":"invalid"}`}><div><strong>Tempo distribuído: {timing.used} / {timing.total}s</strong><span>{timing.remaining>=0?`${timing.remaining}s restantes`:`Excedeu ${Math.abs(timing.remaining)}s`}</span></div><button type="button" onClick={()=>onChange(distributeSportsV2Timing(config,totalDuration))}>Distribuir tempo igualmente</button>{config.selectedSports.map((type)=><label key={type}>{labelFor(type)}<input type="number" min="1" value={config.items[type].duration} onChange={(e)=>onChange({...config,items:{...config.items,[type]:{...config.items[type],duration:Number(e.target.value)}}})}/></label>)}</div>}
  </div>;
}
