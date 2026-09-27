import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Clock3, Database, Download, FileText, Monitor, RefreshCw, Search, Wifi, X } from "lucide-react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { compareTelemetryScreens, formatRelativeCommunication, getPortalScreenStatus, getTelemetryVisualState, sortClientsAlphabetically, timestampMs } from "./portal-status";

const EMPTY = "—";
const TELEMETRY_LABELS = { DISABLED: "Telemetria desativada", WAITING_FIRST_SIGNAL: "Aguardando primeiro sinal", ACTIVE: "Ativa", STALE: "Dados desatualizados", SCREEN_OFFLINE: "Tela offline", NO_DATA_PERIOD: "Sem dados no período", READ_ERROR: "Erro de leitura" };
const STATUS_LABELS = { ONLINE: "Online", ATTENTION: "Atenção", OFFLINE: "Offline" };
const SOURCE_META = {
  CACHE_LOCAL: { label: "Local", className: "local" },
  INTERNET_FALLBACK: { label: "Internet", className: "internet" },
  DOWNLOADING_TO_CACHE: { label: "Baixando", className: "downloading" },
  mixed: { label: "Híbrido", className: "hybrid" },
  cache: { label: "Local", className: "local" },
  local: { label: "Local", className: "local" },
  remote: { label: "Internet", className: "internet" },
  internet: { label: "Internet", className: "internet" },
};
const fmtBytes = (value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return EMPTY;
  const bytes = Number(value);
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / (1024 ** index)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${units[index]}`;
};
const fmtDuration = (value) => {
  if (value === null || value === undefined) return EMPTY;
  const minutes = Math.floor(Number(value) / 60000);
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes} min`;
};
const sourceMeta = (screen) => SOURCE_META[screen?.telemetry?.current?.mediaSource || screen?.currentMediaSource] || { label: "Não informada", className: "unknown" };
const appVersion = (screen) => screen?.telemetry?.session?.appVersion || screen?.appVersion || screen?.playerAppVersion || EMPTY;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
const scrollToTelemetry = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

function MetricCard({ icon, title, value, detail, tone = "blue" }) {
  return <article className={`telemetry-metric-card tone-${tone}`}><div className="telemetry-metric-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

function Donut({ segments, centerValue, centerLabel }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;
  const gradient = total ? segments.map((segment) => {
    const start = cursor;
    cursor += segment.value * 100 / total;
    return `${segment.color} ${start}% ${cursor}%`;
  }).join(",") : "#263a5e 0 100%";
  return <div className="telemetry-donut-wrap"><div className="telemetry-donut" style={{ background: `conic-gradient(${gradient})` }}><div><strong>{centerValue}</strong><span>{centerLabel}</span></div></div><div className="telemetry-donut-legend">{segments.map((segment) => <p key={segment.label}><i style={{ background: segment.color }} /><span>{segment.label}</span><b>{total ? `${Math.round(segment.value * 100 / total)}%` : EMPTY}</b></p>)}</div></div>;
}

export default function TelemetryDashboard() {
  const [clients, setClients] = useState([]);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [period, setPeriod] = useState("today");
  const [clientId, setClientId] = useState("all");
  const [screenId, setScreenId] = useState("all");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [version, setVersion] = useState("all");
  const [search, setSearch] = useState("");
  const [reportScope, setReportScope] = useState("general");
  const [reportTarget, setReportTarget] = useState("");
  const [selected, setSelected] = useState(null);
  const [config, setConfig] = useState({ enabled: false, clientIds: [], screenIds: [], deviceIds: [], syncIntervalMs: 300000 });
  const [configDraft, setConfigDraft] = useState("");
  const [configSaving, setConfigSaving] = useState(false);

  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 5_000); return () => clearInterval(interval); }, []);
  useEffect(() => {
    const screenUnsubs = [];
    const unsubscribe = onSnapshot(collection(db, "clients"), (snapshot) => {
      screenUnsubs.splice(0).forEach((stop) => stop());
      const nextClients = sortClientsAlphabetically(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      setClients(nextClients); setScreens([]); setError("");
      nextClients.forEach((client) => screenUnsubs.push(onSnapshot(collection(db, "clients", client.id, "screens"), (screenSnapshot) => {
        const rows = screenSnapshot.docs.map((item) => ({ id: item.id, clientId: client.id, clientName: client.name, ...item.data() }));
        setScreens((current) => [...current.filter((row) => row.clientId !== client.id), ...rows]); setLoading(false);
      }, (reason) => { setError(reason.message); setLoading(false); })));
      if (!nextClients.length) setLoading(false);
    }, (reason) => { setError(reason.message); setLoading(false); });
    return () => { unsubscribe(); screenUnsubs.forEach((stop) => stop()); };
  }, []);
  useEffect(() => onSnapshot(doc(db, "settings", "telemetry2a2c"), (snapshot) => {
    const next = snapshot.exists() ? snapshot.data() : { enabled: false, clientIds: [], screenIds: [], deviceIds: [], syncIntervalMs: 300000 };
    setConfig(next); setConfigDraft((next.screenIds || []).join("\n"));
  }, (reason) => setError(reason.message)), []);

  async function savePilotConfig(nextEnabled = config.enabled) {
    setConfigSaving(true);
    try { await setDoc(doc(db, "settings", "telemetry2a2c"), { enabled: nextEnabled, clientIds: config.clientIds || [], deviceIds: config.deviceIds || [], screenIds: configDraft.split(/[\s,;]+/).filter(Boolean), syncIntervalMs: Math.max(60000, Number(config.syncIntervalMs || 300000)), updatedAt: serverTimestamp() }, { merge: true }); }
    finally { setConfigSaving(false); }
  }

  const enriched = useMemo(() => screens.map((screen) => ({ ...screen, portalStatus: getPortalScreenStatus(screen, now), telemetryState: getTelemetryVisualState({ config, screen, now, readError: Boolean(error) }) })), [screens, now, config, error]);
  const versions = useMemo(() => [...new Set(enriched.map(appVersion).filter((item) => item !== EMPTY))].sort(), [enriched]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return enriched.filter((item) => (clientId === "all" || item.clientId === clientId) && (screenId === "all" || item.id === screenId) && (status === "all" || item.portalStatus === status) && (source === "all" || sourceMeta(item).className === source) && (version === "all" || appVersion(item) === version) && (!term || [item.name, item.code, item.clientName, item.location].some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(term)))).sort((left, right) => compareTelemetryScreens(left, right, now));
  }, [enriched, clientId, screenId, status, source, version, search, now]);
  const metrics = useMemo(() => filtered.reduce((sum, item) => {
    const counters = item.telemetry?.counters;
    if (!counters) return sum;
    sum.reportedScreens += 1;
    Object.keys(sum.counters).forEach((key) => { sum.counters[key] += Number(counters[key] || 0); });
    return sum;
  }, { reportedScreens: 0, counters: { localPlaybackCount: 0, remotePlaybackCount: 0, bytesDownloaded: 0, estimatedTrafficSaved: 0, displayTimeMs: 0, cacheHits: 0, cacheMisses: 0, playbackErrors: 0, downloadTimeouts: 0 } }), [filtered]);
  const c = metrics.counters;
  const cacheTotal = c.cacheHits + c.cacheMisses;
  const countStatus = (value) => filtered.filter((item) => item.portalStatus === value).length;
  const activeTelemetry = filtered.filter((item) => item.telemetryState === "ACTIVE").length;
  const waitingTelemetry = filtered.filter((item) => item.telemetryState === "WAITING_FIRST_SIGNAL").length;
  const latestTransfer = [...filtered].filter((item) => timestampMs(item.lastMediaDownloadAt) && Number(item.lastMediaDownloadBytes) > 0).sort((a, b) => timestampMs(b.lastMediaDownloadAt) - timestampMs(a.lastMediaDownloadAt))[0];
  const latestApp = [...filtered].filter((item) => appVersion(item) !== EMPTY).sort((a, b) => timestampMs(b.telemetryUpdatedAt || b.lastSeenAt) - timestampMs(a.telemetryUpdatedAt || a.lastSeenAt))[0];
  const totalCacheBytes = filtered.reduce((sum, item) => sum + Number(item.cacheSizeBytes || 0), 0);
  const totalCacheFiles = filtered.reduce((sum, item) => sum + Number(item.cachedItems || 0), 0);
  const totalReproductions = c.localPlaybackCount + c.remotePlaybackCount;
  const originSegments = [{ label: "Local (cache)", value: c.localPlaybackCount, color: "#34d399" }, { label: "Internet", value: c.remotePlaybackCount, color: "#ff647c" }];
  const statusSegments = [{ label: "Online", value: countStatus("ONLINE"), color: "#34d399" }, { label: "Atenção", value: countStatus("ATTENTION"), color: "#f8c963" }, { label: "Offline", value: countStatus("OFFLINE"), color: "#7188ad" }];
  const clearFilters = () => { setSearch(""); setClientId("all"); setScreenId("all"); setStatus("all"); setSource("all"); setVersion("all"); };
  const reportScreens = reportScope === "client" ? enriched.filter((item) => item.clientId === reportTarget) : reportScope === "screen" ? enriched.filter((item) => `${item.clientId}:${item.id}` === reportTarget) : enriched;
  const generatePdfReport = () => {
    const ordered = [...reportScreens].sort((left, right) => compareTelemetryScreens(left, right, now));
    if (!ordered.length) { window.alert("Selecione um cliente ou uma tela com dados para gerar o relatório."); return; }
    const scopeLabel = reportScope === "client" ? `Cliente: ${ordered[0].clientName}` : reportScope === "screen" ? `Tela: ${ordered[0].name || ordered[0].code || ordered[0].id}` : "Relatório geral";
    const rows = ordered.map((item) => `<tr><td><b>${escapeHtml(item.name || item.code || item.id)}</b><small>${escapeHtml(item.clientName)}</small></td><td>${escapeHtml(STATUS_LABELS[item.portalStatus])}</td><td>${escapeHtml(formatRelativeCommunication(item.lastSeenAt, now))}</td><td>${escapeHtml(TELEMETRY_LABELS[item.telemetryState])}</td><td>${escapeHtml(fmtBytes(item.telemetry?.counters?.bytesDownloaded))}</td><td>${escapeHtml(item.cacheStatus || EMPTY)}</td><td>${escapeHtml(appVersion(item))}</td><td>${escapeHtml(sourceMeta(item).label)}</td></tr>`).join("");
    const popup = window.open("", "_blank");
    if (!popup) { window.alert("O navegador bloqueou a janela do relatório. Libere pop-ups e tente novamente."); return; }
    popup.opener = null;
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de Telemetria - Totem Park</title><style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#14213d;margin:0}header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1677ff;padding-bottom:12px;margin-bottom:18px}h1{font-size:24px;margin:0 0 5px}p{margin:0;color:#52627a}.meta{text-align:right;font-size:12px}.summary{display:flex;gap:12px;margin-bottom:16px}.summary div{border:1px solid #ccd7e6;border-radius:8px;padding:10px 14px}.summary b{display:block;font-size:20px;color:#1677ff}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#11284a;color:white;text-align:left;padding:8px}td{border-bottom:1px solid #d9e1ec;padding:8px;vertical-align:top}td small{display:block;color:#64748b;margin-top:3px}footer{margin-top:14px;text-align:right;color:#64748b;font-size:10px}@media print{button{display:none}}</style></head><body><header><div><h1>Totem Park - Telemetria das Telas</h1><p>${escapeHtml(scopeLabel)}</p></div><div class="meta">Gerado em ${escapeHtml(new Date(now).toLocaleString("pt-BR"))}<br>${ordered.length} tela(s)</div></header><div class="summary"><div><b>${ordered.filter((item) => item.portalStatus === "ONLINE").length}</b>Online</div><div><b>${ordered.filter((item) => item.portalStatus === "ATTENTION").length}</b>Atenção</div><div><b>${ordered.filter((item) => item.portalStatus === "OFFLINE").length}</b>Offline</div></div><table><thead><tr><th>Tela / cliente</th><th>Status</th><th>Última comunicação</th><th>Telemetria</th><th>Tráfego</th><th>Cache</th><th>Versão do app</th><th>Origem</th></tr></thead><tbody>${rows}</tbody></table><footer>Totem Park - Park Solutions</footer><script>window.onload=()=>window.print();</script></body></html>`);
    popup.document.close();
  };

  if (loading) return <section className="telemetry-page"><div className="telemetry-state">Carregando telemetria…</div></section>;
  return <section className="telemetry-page telemetry-v2">
    <header className="telemetry-v2-header"><div><span>MONITORAMENTO OPERACIONAL</span><h1>Telemetria das Telas</h1><p>Acompanhe em tempo real o desempenho, rede, cache e reprodução das suas telas.</p></div><div className="telemetry-v2-header-actions"><div className="telemetry-report-controls"><select aria-label="Escopo do relatório" value={reportScope} onChange={(event) => { setReportScope(event.target.value); setReportTarget(""); }}><option value="general">Relatório geral</option><option value="client">Por cliente</option><option value="screen">Por tela</option></select>{reportScope === "client" && <select aria-label="Cliente do relatório" value={reportTarget} onChange={(event) => setReportTarget(event.target.value)}><option value="">Selecione o cliente</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}{reportScope === "screen" && <select aria-label="Tela do relatório" value={reportTarget} onChange={(event) => setReportTarget(event.target.value)}><option value="">Selecione a tela</option>{[...enriched].sort((left, right) => compareTelemetryScreens(left, right, now)).map((item) => <option key={`${item.clientId}-${item.id}`} value={`${item.clientId}:${item.id}`}>{item.name || item.code || item.id} - {item.clientName}</option>)}</select>}<button onClick={generatePdfReport}><FileText size={17} />Gerar PDF</button></div><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="today">Hoje</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option></select><b><i />Atualização em tempo real</b></div></header>
    {error && <div className="telemetry-state error"><strong>Erro de leitura</strong><span>{error}</span></div>}
    <div className="telemetry-main-filters"><select value={clientId} onChange={(event) => { setClientId(event.target.value); setScreenId("all"); }}><option value="all">Todos os clientes</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={screenId} onChange={(event) => setScreenId(event.target.value)}><option value="all">Todas as telas</option>{enriched.filter((item) => clientId === "all" || item.clientId === clientId).map((item) => <option key={`${item.clientId}-${item.id}`} value={item.id}>{item.name || item.code || item.id}</option>)}</select><select value={source} onChange={(event) => setSource(event.target.value)}><option value="all">Todas as origens</option><option value="local">Local</option><option value="hybrid">Híbrido</option><option value="internet">Internet</option><option value="downloading">Baixando</option></select><select value={version} onChange={(event) => setVersion(event.target.value)}><option value="all">Todas as versões</option>{versions.map((item) => <option key={item}>{item}</option>)}</select></div>
    <details className="telemetry-config"><summary>Ativação piloto <b>{config.enabled ? "ATIVA" : "DESATIVADA"}</b></summary><p>A coleta só funciona quando a flag está ativa e o dispositivo corresponde à allowlist.</p><label>Screen IDs piloto<textarea value={configDraft} onChange={(event) => setConfigDraft(event.target.value)} placeholder="Um screenId por linha" /></label><div><button disabled={configSaving} onClick={() => savePilotConfig(config.enabled)}>Salvar allowlist</button><button className={config.enabled ? "danger" : "enable"} disabled={configSaving} onClick={() => savePilotConfig(!config.enabled)}>{config.enabled ? "Desativar telemetria" : "Ativar somente allowlist"}</button></div></details>
    <div className="telemetry-primary-kpis"><MetricCard icon={<Monitor />} title="Telas online" value={`${countStatus("ONLINE")} de ${filtered.length}`} detail={`${countStatus("ATTENTION")} em atenção · ${countStatus("OFFLINE")} offline`} tone="green" /><MetricCard icon={<Wifi />} title="Tráfego total de mídia" value={metrics.reportedScreens ? fmtBytes(c.bytesDownloaded) : EMPTY} detail={metrics.reportedScreens ? "transferido pela internet" : "Aguardando dados"} /><MetricCard icon={<Download />} title="Tráfego evitado pelo cache" value={metrics.reportedScreens ? fmtBytes(c.estimatedTrafficSaved) : EMPTY} detail={metrics.reportedScreens ? "conteúdo servido localmente" : "Sem dados no período"} tone="cyan" /><MetricCard icon={<Database />} title="Cache hit rate" value={cacheTotal ? `${Math.round(c.cacheHits * 100 / cacheTotal)}%` : EMPTY} detail={cacheTotal ? `${c.cacheHits} hits · ${c.cacheMisses} misses` : "Nenhum dado de cache disponível"} tone="green" /><MetricCard icon={<AlertTriangle />} title="Falhas de mídia" value={metrics.reportedScreens ? c.playbackErrors : EMPTY} detail={metrics.reportedScreens ? `${c.downloadTimeouts} timeout(s) de download` : "Nenhuma falha registrada"} tone="red" /></div>
    <nav className="telemetry-section-nav"><button onClick={() => scrollToTelemetry("telemetry-overview")}>Visão Geral</button><button onClick={() => scrollToTelemetry("telemetry-screens")}>Telas</button><button onClick={() => scrollToTelemetry("telemetry-traffic")}>Consumo de Mídia</button><button onClick={() => scrollToTelemetry("telemetry-cache")}>Cache</button><button onClick={() => scrollToTelemetry("telemetry-status")}>Rede e Conexão</button><button onClick={() => scrollToTelemetry("telemetry-events")}>Eventos e Logs</button></nav>
    <div className="telemetry-overview-grid" id="telemetry-overview"><article className="telemetry-visual-card"><h2>Origem da reprodução</h2>{totalReproductions ? <Donut segments={originSegments} centerValue={totalReproductions.toLocaleString("pt-BR")} centerLabel="reproduções" /> : <div className="telemetry-chart-empty"><Activity /><strong>Sem dados no período</strong><span>Ainda não há reproduções classificadas por origem.</span></div>}</article><article className="telemetry-visual-card traffic-chart-card" id="telemetry-traffic"><h2>Tráfego de mídia</h2><div className="telemetry-chart-empty"><Wifi /><strong>Ainda não há histórico suficiente</strong><span>Os totais atuais estão disponíveis acima; a base não fornece série temporal sem consulta adicional.</span></div></article><article className="telemetry-visual-card" id="telemetry-status"><h2>Status das telas</h2><Donut segments={statusSegments} centerValue={filtered.length} centerLabel="telas" /></article></div>
    <div className="telemetry-secondary-kpis"><MetricCard icon={<Clock3 />} title="Tempo de exibição" value={metrics.reportedScreens ? fmtDuration(c.displayTimeMs) : EMPTY} detail={metrics.reportedScreens ? `${fmtDuration(c.displayTimeMs / Math.max(1, metrics.reportedScreens))} em média por tela reportada` : "Sem dados no período"} /><MetricCard icon={<Download />} title="Última transferência" value={latestTransfer ? formatRelativeCommunication(latestTransfer.lastMediaDownloadAt, now) : EMPTY} detail={latestTransfer ? `${fmtBytes(latestTransfer.lastMediaDownloadBytes)} · ${latestTransfer.name || latestTransfer.code || "Tela"}` : "Nenhuma transferência registrada"} tone="cyan" /><MetricCard icon={<Database />} title="Armazenamento em cache" value={totalCacheFiles ? fmtBytes(totalCacheBytes) : EMPTY} detail={totalCacheFiles ? `${totalCacheFiles} arquivo(s) reportado(s)` : "Nenhum dado de cache disponível"} tone="green" /><MetricCard icon={<RefreshCw />} title="Versão do app" value={latestApp ? appVersion(latestApp) : EMPTY} detail={latestApp ? formatRelativeCommunication(latestApp.telemetryUpdatedAt || latestApp.lastSeenAt, now) : "Versão ainda não informada"} /></div>
    <section className="telemetry-screens-section" id="telemetry-screens"><div className="telemetry-table-toolbar"><div><h2>Telas</h2><p>Status, reprodução, cache e comunicação em uma visão operacional.</p></div><label><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, cliente ou local…" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos os status</option><option value="ONLINE">Online</option><option value="ATTENTION">Atenção</option><option value="OFFLINE">Offline</option></select><button className="telemetry-clear" onClick={clearFilters}><X size={16} />Limpar filtros</button></div>
      {!filtered.length ? <div className="telemetry-state"><strong>Sem telas para os filtros selecionados</strong><span>Ajuste ou limpe os filtros para visualizar outros dispositivos.</span></div> : <div className="telemetry-table-v2"><div className="head"><span>Status</span><span>Nome da tela</span><span>Cliente / local</span><span>Reprodução atual</span><span>Origem</span><span>Tráfego reportado</span><span>Última comunicação</span><span>Telemetria</span><span>Versão do app</span></div>{filtered.map((item) => { const meta = sourceMeta(item); return <button key={`${item.clientId}-${item.id}`} onClick={() => setSelected(item)}><span><i className={`screen-state-dot ${item.portalStatus.toLowerCase()}`} />{STATUS_LABELS[item.portalStatus]}</span><span><strong>{item.name || item.code || item.id}</strong><small>{item.currentPlaylistName || item.telemetry?.current?.playlistId || "Playlist não informada"}</small></span><span><strong>{item.clientName}</strong><small>{item.location || "Local não informado"}</small></span><span><strong>{item.nowPlayingTitle || item.telemetry?.current?.mediaName || EMPTY}</strong><small>{item.nowPlayingIndex && item.nowPlayingTotal ? `Item ${item.nowPlayingIndex}/${item.nowPlayingTotal}` : "Posição não informada"}</small></span><span><b className={`origin-badge ${meta.className}`}>{meta.label}</b><small>{item.cacheStatus ? `Cache ${item.cacheStatus}` : "Cache não informado"}</small></span><span>{item.telemetry?.counters ? fmtBytes(item.telemetry.counters.bytesDownloaded) : EMPTY}</span><span>{formatRelativeCommunication(item.lastSeenAt, now)}</span><span>{TELEMETRY_LABELS[item.telemetryState]}</span><span className="telemetry-app-version">{appVersion(item)}</span></button>; })}</div>}
    </section>
    <section className="telemetry-events-summary" id="telemetry-events"><h2>Eventos e Logs</h2><p>Selecione uma tela na tabela para visualizar os eventos recentes disponíveis.</p><div><span>Telemetria ativa <b>{activeTelemetry}</b></span><span>Aguardando primeiro sinal <b>{waitingTelemetry}</b></span><span>Dados desatualizados <b>{filtered.filter((item) => item.telemetryState === "STALE").length}</b></span></div></section>
    {selected && <div className="telemetry-detail"><button className="close" onClick={() => setSelected(null)}>Fechar</button><span>{selected.clientName}</span><h2>{selected.name || selected.code || selected.id}</h2><div className="detail-grid"><p><b>Status da tela</b>{STATUS_LABELS[selected.portalStatus]}</p><p><b>Última comunicação</b>{formatRelativeCommunication(selected.lastSeenAt, now)}</p><p><b>Status da telemetria</b>{TELEMETRY_LABELS[selected.telemetryState]}</p><p><b>Último dado de telemetria</b>{timestampMs(selected.telemetryUpdatedAt) ? formatRelativeCommunication(selected.telemetryUpdatedAt, now) : "Aguardando dados"}</p><p><b>Versão do app</b>{appVersion(selected)}</p><p><b>Origem atual</b>{sourceMeta(selected).label}</p><p><b>Cache</b>{selected.cacheStatus ? `${selected.cacheStatus} ${selected.cachedItems || 0}/${selected.totalCacheableItems || 0}` : EMPTY}</p><p><b>Dispositivo</b>{selected.connectedDeviceId || selected.activeDeviceId || EMPTY}</p><p><b>Item atual</b>{selected.nowPlayingIndex && selected.nowPlayingTotal ? `${selected.nowPlayingIndex}/${selected.nowPlayingTotal}` : EMPTY}</p></div><h3>Eventos recentes</h3><div className="telemetry-events">{selected.telemetry?.lastPlayerEvents?.length ? selected.telemetry.lastPlayerEvents.slice(-20).reverse().map((event, index) => <div key={`${event.timestamp}-${index}`}><time>{new Date(event.timestamp).toLocaleTimeString("pt-BR")}</time><strong>{event.event}</strong><span>{event.mediaId || EMPTY}</span></div>) : <p className="empty-copy">Nenhum evento registrado</p>}</div></div>}
  </section>;
}
