import { CircleGauge, Flag, Swords, Trophy } from "lucide-react";

const initials = (name = "") => name.split(/\s+/).map((word) => word[0]).join("").slice(0,2).toUpperCase();
function Identity({ image, name }) { return <span className="sports-v2-identity">{image?.url ? <img src={image.url} alt=""/> : <i>{initials(name)}</i>}<strong>{name}</strong></span>; }
function Header({ item, icon, label }) { return <header><span>{icon}<b>{label}</b></span><em className={item.status === "Ao vivo" ? "live" : ""}>{item.status || "Agendado"}</em></header>; }
function TeamScore({ item, compact, periodsLabel }) { return <><div className="sports-v2-score"><Identity image={item.homeLogo} name={item.home}/><strong>{item.homeScore}<small>×</small>{item.awayScore}</strong><Identity image={item.awayLogo} name={item.away}/></div>{!compact && item.periods?.length > 0 && <div className="sports-v2-periods"><b>{periodsLabel}</b>{item.periods.map((period,index)=><span key={`${period}-${index}`}>{period}</span>)}</div>}</>; }
function Stats({ item, compact }) { return !compact && item.stats?.length ? <div className="sports-v2-stats">{item.stats.slice(0,4).map((stat)=><div key={stat.label}><b>{stat.home}</b><span>{stat.label}</span><b>{stat.away}</b></div>)}</div> : null; }
function TeamCard({ item, compact, sport, periodsLabel }) { return <article className={`sports-v2-card sport-${sport} ${compact ? "compact" : "full"}`}><Header item={item} icon={<Trophy/>} label={item.competition}/><div className="sports-v2-stage">{item.stage}</div><TeamScore item={item} compact={compact} periodsLabel={periodsLabel}/><Stats item={item} compact={compact}/>{!compact && item.events?.length > 0 && <footer>{item.events.slice(0,3).join(" · ")}</footer>}</article>; }

export function FootballCard({ item, compact=false }) { return <TeamCard item={item} compact={compact} sport="football"/>; }
export function BasketballCard({ item, compact=false }) { return <TeamCard item={item} compact={compact} sport="basketball" periodsLabel="Quartos"/>; }
export function VolleyballCard({ item, compact=false }) { return <TeamCard item={item} compact={compact} sport="volleyball" periodsLabel="Sets"/>; }
export function FutsalCard({ item, compact=false }) { return <TeamCard item={item} compact={compact} sport="futsal"/>; }

export function MotorsportCard({ item, compact=false }) { return <article className={`sports-v2-card sport-motorsport ${compact ? "compact" : "full"}`}><Header item={item} icon={<Flag/>} label={item.competition}/><div className="sports-v2-stage">{item.stage} · {item.circuit}</div><div className="sports-v2-standing">{(item.standings||[]).slice(0,compact?3:6).map((row)=><div key={`${row.position}-${row.name}`}><b>{row.position}</b><span><strong>{row.name}</strong><small>{row.team}</small></span><em>{row.time}</em></div>)}</div></article>; }

export function CombatCard({ item, compact=false }) { return <article className={`sports-v2-card sport-combat ${compact ? "compact" : "full"}`}><Header item={item} icon={<Swords/>} label={item.competition}/><div className="sports-v2-stage">{item.stage} · {item.category}</div><div className="sports-v2-fight"><Identity image={item.fighterAImage} name={item.fighterA}/><strong>VS</strong><Identity image={item.fighterBImage} name={item.fighterB}/></div><div className="sports-v2-result"><CircleGauge/><span><b>{item.winner}</b>{compact ? item.method : `${item.method} · Round ${item.round} · ${item.time}`}</span></div></article>; }

// eslint-disable-next-line react-refresh/only-export-components
export const SPORTS_V2_CARD_COMPONENTS = { football:FootballCard, basketball:BasketballCard, volleyball:VolleyballCard, futsal:FutsalCard, motorsport:MotorsportCard, combat:CombatCard };
