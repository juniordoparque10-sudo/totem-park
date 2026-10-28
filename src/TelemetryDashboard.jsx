import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Clock3, Database, Download, FileText, Monitor, RefreshCw, Search, Wifi, X } from "lucide-react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { compareTelemetryScreens, createPortalScreenOrderTracker, formatRelativeCommunication, getPortalLastSignalMs, getPortalScreenStatus, getTelemetryVisualState, sortClientsAlphabetically, timestampMs } from "./portal-status";
import { bindingForScreen, linkedAtForScreen, measured } from "./telemetry-v1";
import { aggregateCurrentPlaybackOrigins, aggregateSchema4Traffic, formatSessionStartedAt, getCurrentSourceGroup, getTelemetryCardData, reportedAppVersion } from "./telemetry-card-data";
import { renderTelemetryPdfReport } from "./telemetry-pdf-report";
import { buildTelemetryActivityPeriods, normalizeTelemetryActivityEvents, summarizeTelemetryActivity } from "./telemetry-activity-history";
import { historicalDateRange } from "./telemetry-history-dashboard";
import { readTelemetryHistory } from "./telemetry-history-reader";
import { formatBytes } from "./format-bytes";
import totemLogo from "./assets/logo.png";
import "./telemetry-v2.css";

const EMPTY = "—";
const fmtBytes = formatBytes;
const TELEMETRY_LABELS = { DISABLED: "Telemetria Off", WAITING_FIRST_SIGNAL: "Aguardando primeiro sinal", ACTIVE: "Ativa", STALE: "Dados desatualizados", SCREEN_OFFLINE: "Tela offline", NO_DATA_PERIOD: "Sem dados no período", READ_ERROR: "Erro de leitura" };
const telemetryLabel = (screen, now) => screen.telemetryState === "STALE" ? `Dados desatualizados ${formatRelativeCommunication(screen.telemetryUpdatedAt, now)}` : TELEMETRY_LABELS[screen.telemetryState];
const STATUS_LABELS = { ONLINE: "Online", ATTENTION: "Atenção", OFFLINE: "Offline" };
const fmtDuration = (value) => {
  if (value === null || value === undefined) return EMPTY;
  const minutes = Math.floor(Number(value) / 60000);
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes} min`;
};
const sourceMeta = (screen) => getCurrentSourceGroup(screen);
const cacheStatus = (screen) => {
  const status = String(screen?.cacheStatus || "").trim().toLowerCase();
  return ["pronto", "preparando", "parcial", "erro"].includes(status) ? status : "";
};
const cacheLabel = (screen) => cacheStatus(screen)
  ? `Cache ${cacheStatus(screen)}`
  : screen?.telemetry?.schemaVersion >= 3 ? "Cache não instrumentado" : "Cache não informado";
const appVersion = (screen) => reportedAppVersion(screen) || EMPTY;
const trafficSnapshot = (screen) => Number(screen?.telemetry?.schemaVersion) >= 4 && screen?.telemetry?.traffic
  ? screen.telemetry.traffic
  : null;
const mediaCounters = (screen) => {
  const traffic = trafficSnapshot(screen);
  if (traffic) return {
    localPlaybackCount: traffic.cachePlaybackHits,
    remotePlaybackCount: Number(traffic.remotePlaybackCount || 0) + Number(traffic.fallbackPlaybackCount || 0),
    bytesDownloaded: traffic.mediaDownloadedBytes,
    appInternetReceivedBytes: traffic.networkMeasurementSupported ? traffic.appInternetReceivedBytes : null,
    estimatedTrafficSaved: traffic.trafficAvoidedBytes,
    cacheHits: traffic.cachePlaybackHits,
    cacheMisses: Number(traffic.remotePlaybackCount || 0) + Number(traffic.fallbackPlaybackCount || 0),
    playbackErrors: null,
    downloadTimeouts: null,
    displayTimeMs: null,
  };
  return null;
};
const trafficValue = (screen, key) => {
  const traffic = trafficSnapshot(screen);
  return traffic && traffic[key] !== null && traffic[key] !== undefined ? formatBytes(traffic[key]) : "Não instrumentado";
};
const lastCommunication = (screen) => getPortalLastSignalMs(screen);
const scrollToTelemetry = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
const isoDate = (value) => new Date(value).toISOString().slice(0, 10);
const activityRangeFor = (dateValue, periodValue) => {
  const selected = new Date(`${dateValue}T00:00:00`);
  if (!Number.isFinite(selected.getTime())) return { startMs: 0, endMs: 0 };
  const start = new Date(selected);
  if (periodValue === "week") start.setDate(start.getDate() - start.getDay());
  if (periodValue === "month") start.setDate(1);
  const end = new Date(start);
  if (periodValue === "day") end.setDate(end.getDate() + 1);
  if (periodValue === "week") end.setDate(end.getDate() + 7);
  if (periodValue === "month") end.setMonth(end.getMonth() + 1);
  return { startMs: start.getTime(), endMs: end.getTime() };
};
const activityStateLabel = (state) => ({ ACTIVE:"Ativa", RECOVERED:"Ativa", OFFLINE:"Desligada", INTERRUPTED:"Desligada", ATTENTION:"Atenção", IDLE:"Atenção" }[state] || state);
const activityTone = (state) => ["ACTIVE", "RECOVERED"].includes(state) ? "active" : ["OFFLINE", "INTERRUPTED"].includes(state) ? "offline" : "attention";

function MetricCard({ icon, title, value, detail, tone = "blue" }) {
  const measuredValue = title === "Falhas de mídia" ? EMPTY : value;
  const measuredDetail = title === "Falhas de mídia" ? "Não instrumentado" : detail;
  return <article className={`telemetry-metric-card tone-${tone}`}><div className="telemetry-metric-icon">{icon}</div><div><span>{title}</span><strong>{measuredValue}</strong><small>{measuredDetail}</small></div></article>;
}

function Donut({ segments, centerValue, caption }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;
  const gradient = total ? segments.map((segment) => {
    const start = cursor;
    cursor += segment.value * 100 / total;
    return `${segment.color} ${start}% ${cursor}%`;
  }).join(",") : "#263a5e 0 100%";
  return <div className="telemetry-donut-component"><div className="telemetry-donut-wrap"><div className="telemetry-donut" style={{ background: `conic-gradient(${gradient})` }}><div><strong>{centerValue}</strong></div></div><div className="telemetry-donut-legend">{segments.map((segment) => <p key={segment.label}><i style={{ background: segment.color }} /><span>{segment.label}</span><b>{total ? `${Math.round(segment.value * 100 / total)}%` : EMPTY}</b></p>)}</div></div><p className="telemetry-donut-caption">{caption}</p></div>;
}

function TrafficComparison({ metrics }) {
  const rows = [
    ["Downloads de mídia", metrics.mediaDownloadedBytes, metrics.downloadedScreens, "download"],
    ["Reutilizado do cache", metrics.localMediaReusedBytes, metrics.reusedScreens, "reuse"],
    ["Internet utilizada", metrics.appInternetReceivedBytes, metrics.networkScreens, "internet"],
    ["Tráfego evitado", metrics.trafficAvoidedBytes, metrics.avoidedScreens, "avoided"],
  ];
  const maximum = Math.max(1, ...rows.filter((row) => row[2]).map((row) => row[1]));
  return <div className="telemetry-traffic-summary">{rows.map(([label,value,screens,tone]) => <div className={`telemetry-traffic-row tone-${tone}`} key={label}><div><span>{label}</span><strong>{screens ? formatBytes(value) : EMPTY}</strong></div><div className="telemetry-traffic-bar" aria-label={`${label}: ${screens ? formatBytes(value) : "não instrumentado"}`}><i style={{ width:screens ? `${Math.max(3, value * 100 / maximum)}%` : "0%" }} /></div><small>{screens ? `${screens} tela(s) schema 4 online` : "Não instrumentado"}</small></div>)}</div>;
}

export default function TelemetryDashboard({ focusScreen }) {
  const [clients, setClients] = useState([]);
  const [screens, setScreens] = useState([]);
  const [bindings, setBindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [period, setPeriod] = useState("today");
  const [customStart, setCustomStart] = useState(() => isoDate(Date.now()));
  const [customEnd, setCustomEnd] = useState(() => isoDate(Date.now()));
  const [historyState, setHistoryState] = useState({ status:"loading", rows:[], totals:{}, missingDateKeys:[], errors:[], estimatedReads:0 });
  const [clientId, setClientId] = useState("all");
  const [screenId, setScreenId] = useState("all");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [version, setVersion] = useState("all");
  const [search, setSearch] = useState("");
  const [reportScope, setReportScope] = useState("general");
  const [reportTarget, setReportTarget] = useState("");
  const [selectedKey, setSelectedKey] = useState(() => focusScreen ? `${focusScreen.clientId}/${focusScreen.id}` : null);
  const [config, setConfig] = useState({ enabled: false, clientIds: [], screenIds: [], deviceIds: [], syncIntervalMs: 300000 });
  const [configDraft, setConfigDraft] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [activityClientId, setActivityClientId] = useState("all");
  const [activityScreenId, setActivityScreenId] = useState("all");
  const [activityPeriod, setActivityPeriod] = useState("day");
  const [activityDate, setActivityDate] = useState(() => isoDate(Date.now()));
  const [screenOrder] = useState(() => createPortalScreenOrderTracker({
    getKey: (screen) => `${screen.clientId}/${screen.id}`,
    sortOfflineByLastSignal: true,
  }));

  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 5_000); return () => clearInterval(interval); }, []);
  useEffect(() => {
    const screenUnsubs = [];
    const unsubscribe = onSnapshot(collection(db, "clients"), (snapshot) => {
      screenUnsubs.splice(0).forEach((stop) => stop());
      const nextClients = sortClientsAlphabetically(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      const activeClientIds = new Set(nextClients.map((client) => client.id));
      setClients(nextClients); setScreens((current) => current.filter((screen) => activeClientIds.has(screen.clientId))); setError("");
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
  useEffect(() => onSnapshot(collection(db, "playerDeviceBindings"), (snapshot) => {
    setBindings(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, () => setBindings([])), []);

  async function savePilotConfig(nextEnabled = config.enabled) {
    setConfigSaving(true);
    try { await setDoc(doc(db, "settings", "telemetry2a2c"), { enabled: nextEnabled, clientIds: config.clientIds || [], deviceIds: config.deviceIds || [], screenIds: configDraft.split(/[\s,;]+/).filter(Boolean), syncIntervalMs: Math.max(60000, Number(config.syncIntervalMs || 300000)), updatedAt: serverTimestamp() }, { merge: true }); }
    finally { setConfigSaving(false); }
  }

  const enriched = useMemo(() => screens.map((screen) => ({ ...screen, portalStatus: getPortalScreenStatus(screen, now), telemetryState: getTelemetryVisualState({ config, screen, now, readError: Boolean(error) }) })), [screens, now, config, error]);
  const activityClients = useMemo(() => sortClientsAlphabetically(clients), [clients]);
  const activityScreens = useMemo(() => enriched
    .filter((item) => activityClientId === "all" || item.clientId === activityClientId)
    .sort((left, right) => String(left.name || left.code || left.id).localeCompare(String(right.name || right.code || right.id), "pt-BR")), [enriched, activityClientId]);
  const activityRange = useMemo(() => activityRangeFor(activityDate, activityPeriod), [activityDate, activityPeriod]);
  const activityPeriods = useMemo(() => activityScreens
    .filter((item) => activityScreenId === "all" || item.id === activityScreenId)
    .flatMap((item) => buildTelemetryActivityPeriods(normalizeTelemetryActivityEvents(item, activityRange), activityRange))
    .sort((left, right) => left.startMs - right.startMs || left.id.localeCompare(right.id)), [activityScreens, activityScreenId, activityRange]);
  const activitySummary = useMemo(() => summarizeTelemetryActivity(activityPeriods), [activityPeriods]);
  const selected = enriched.find((item) => `${item.clientId}/${item.id}` === selectedKey);
  const versions = useMemo(() => [...new Set(enriched.map(appVersion).filter((item) => item !== EMPTY))].sort(), [enriched]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const ordered = screenOrder.sort(enriched, now);
    return ordered.filter((item) => (clientId === "all" || item.clientId === clientId) && (screenId === "all" || item.id === screenId) && (status === "all" || item.portalStatus === status) && (source === "all" || sourceMeta(item).key === source) && (version === "all" || appVersion(item) === version) && (!term || [item.name, item.code, item.clientName, item.location].some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(term))));
  }, [enriched, clientId, screenId, status, source, version, search, now, screenOrder]);
  const historyToday = isoDate(now);
  const historicalRange = useMemo(() => historicalDateRange(period, { now:`${historyToday}T12:00:00.000Z`, customStart, customEnd }), [period, historyToday, customStart, customEnd]);
  const historicalScreens = useMemo(() => screens.filter((item) =>
    (clientId === "all" || item.clientId === clientId) && (screenId === "all" || item.id === screenId)), [screens, clientId, screenId]);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) setHistoryState((current) => ({ ...current, status:"loading" })); });
    readTelemetryHistory(db, historicalScreens, historicalRange).then((result) => {
      if (!active) return;
      setHistoryState({ ...result, status:result.permissionDenied ? "permission-denied" : result.hasData ? "ready" : "empty" });
    }).catch((reason) => {
      if (active) setHistoryState({ status:"error", rows:[], totals:{}, missingDateKeys:[], errors:[{ error:reason }], estimatedReads:0 });
    });
    return () => { active = false; };
  }, [historicalScreens, historicalRange]);
  const metrics = useMemo(() => aggregateSchema4Traffic(filtered), [filtered]);
  const historical = historyState.totals || {};
  const cacheTotal = metrics.cacheHits + metrics.cacheMisses;
  const countStatus = (value) => filtered.filter((item) => item.portalStatus === value).length;
  const activeTelemetry = filtered.filter((item) => item.telemetryState === "ACTIVE").length;
  const waitingTelemetry = filtered.filter((item) => item.telemetryState === "WAITING_FIRST_SIGNAL").length;
  const cardData = useMemo(() => getTelemetryCardData(filtered), [filtered]);
  const originSample = useMemo(() => aggregateCurrentPlaybackOrigins(filtered), [filtered]);
  const originCounts = originSample.counts;
  const originReported = originSample.total - originCounts.unknown;
  const originSegments = [
    { label:"Local (cache)", value:originCounts.local, color:"#34d399" },
    { label:"Internet", value:originCounts.remote, color:"#ff647c" },
    { label:"Fallback", value:originCounts.fallback, color:"#f8c963" },
    { label:"Template", value:originCounts.template, color:"#4bc7ff" },
    { label:"Misto", value:originCounts.mixed, color:"#a78bfa" },
    { label:"Sem informação", value:originCounts.unknown, color:"#7188ad" },
  ];
  const statusSegments = [{ label: "Online", value: countStatus("ONLINE"), color: "#34d399" }, { label: "Atenção", value: countStatus("ATTENTION"), color: "#f8c963" }, { label: "Offline", value: countStatus("OFFLINE"), color: "#7188ad" }];
  const clearFilters = () => { setSearch(""); setClientId("all"); setScreenId("all"); setStatus("all"); setSource("all"); setVersion("all"); };
  const reportScreens = filtered.filter((item) => {
    if (reportScope === "client" && item.clientId !== reportTarget) return false;
    if (reportScope === "screen" && `${item.clientId}:${item.id}` !== reportTarget) return false;
    return true;
  });
  const generatePdfReport = async () => {
    const ordered = [...reportScreens].sort((left, right) => compareTelemetryScreens(left, right, now));
    if (!ordered.length) { window.alert("Nenhuma tela corresponde ao escopo, período e filtros selecionados."); return; }
    const reportClientId = ordered.every((item) => item.clientId === ordered[0].clientId) ? ordered[0].clientId : null;
    const reportClient = clients.find((item) => item.id === reportClientId);
    const rows = ordered.map((item) => ({
      name: item.name || item.code || item.id,
      clientName: item.clientName,
      status: item.portalStatus,
      lastCommunication: formatRelativeCommunication(lastCommunication(item), now),
      telemetry: telemetryLabel(item, now),
      cache: cacheStatus(item) ? `${cacheLabel(item)}${measured(item.cachedItems) && measured(item.totalCacheableItems) ? ` ${item.cachedItems}/${item.totalCacheableItems}` : ""}` : cacheLabel(item),
      version: appVersion(item),
      origin: sourceMeta(item, now).label,
      activeTimeMs: item.telemetry?.schemaVersion >= 3 ? Number(item.telemetry?.session?.uptimeSeconds) * 1000 : null,
    }));
    const reportHistory = await readTelemetryHistory(db, ordered, historicalRange);
    const html = renderTelemetryPdfReport({
      rows,
      clientName: reportClient?.name || (reportScope === "screen" ? ordered[0].clientName : "Todos os clientes"),
      clientLogoUrl: reportClient?.logoUrl || "",
      totemLogoUrl: new URL(totemLogo, window.location.origin).href,
      totemIconUrl: new URL("/logo.png", window.location.origin).href,
      generatedAt: now,
      periodLabel: `${historicalRange.start} a ${historicalRange.end}`,
      historicalSummary: reportHistory.hasData ? reportHistory.totals : null,
      missingDateKeys: reportHistory.missingDateKeys,
    });
    const popup = window.open("", "_blank");
    if (!popup) { window.alert("O navegador bloqueou a janela do relatório. Libere pop-ups e tente novamente."); return; }
    popup.opener = null;
    popup.document.write(html);
    popup.document.close();
  };

  if (loading) return <section className="telemetry-page"><div className="telemetry-state">Carregando telemetria…</div></section>;
  return <section className="telemetry-page telemetry-v2" onClickCapture={(event) => { if (selected && !event.target.closest(".telemetry-detail")) { event.stopPropagation(); setSelectedKey(null); } }}>
    <header className="telemetry-v2-header"><div><span>MONITORAMENTO OPERACIONAL</span><h1>Telemetria das Telas</h1><p>Acompanhe em tempo real o desempenho, rede, cache e reprodução das suas telas.</p></div><div className="telemetry-v2-header-actions"><div className="telemetry-report-controls"><select aria-label="Escopo do relatório" value={reportScope} onChange={(event) => { setReportScope(event.target.value); setReportTarget(""); }}><option value="general">Relatório geral</option><option value="client">Por cliente</option><option value="screen">Por tela</option></select>{reportScope === "client" && <select aria-label="Cliente do relatório" value={reportTarget} onChange={(event) => setReportTarget(event.target.value)}><option value="">Selecione o cliente</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}{reportScope === "screen" && <select aria-label="Tela do relatório" value={reportTarget} onChange={(event) => setReportTarget(event.target.value)}><option value="">Selecione a tela</option>{[...enriched].sort((left, right) => compareTelemetryScreens(left, right, now)).map((item) => <option key={`${item.clientId}-${item.id}`} value={`${item.clientId}:${item.id}`}>{item.name || item.code || item.id} - {item.clientName}</option>)}</select>}<button onClick={generatePdfReport}><FileText size={17} />Gerar PDF</button></div><select aria-label="Período histórico" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="today">Hoje</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option><option value="custom">Personalizado</option></select>{period === "custom" && <div className="telemetry-history-custom"><input aria-label="Início do período" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /><input aria-label="Fim do período" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></div>}<b><i />Atualização em tempo real</b></div></header>
    {error && <div className="telemetry-state error"><strong>Erro de leitura</strong><span>{error}</span></div>}
    <div className="telemetry-main-filters"><select value={clientId} onChange={(event) => { setClientId(event.target.value); setScreenId("all"); }}><option value="all">Todos os clientes</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={screenId} onChange={(event) => setScreenId(event.target.value)}><option value="all">Todas as telas</option>{enriched.filter((item) => clientId === "all" || item.clientId === clientId).map((item) => <option key={`${item.clientId}-${item.id}`} value={item.id}>{item.name || item.code || item.id}</option>)}</select><select value={source} onChange={(event) => setSource(event.target.value)}><option value="all">Todas as origens</option><option value="local">Local (cache)</option><option value="remote">Internet</option><option value="fallback">Fallback</option><option value="template">Template</option><option value="mixed">Misto</option><option value="unknown">Sem informação</option></select><select value={version} onChange={(event) => setVersion(event.target.value)}><option value="all">Todas as versões</option>{versions.map((item) => <option key={item}>{item}</option>)}</select></div>
    <details className="telemetry-config"><summary>Ativação piloto <b>{config.enabled ? "ATIVA" : "DESATIVADA"}</b></summary><p>A coleta só funciona quando a flag está ativa e o dispositivo corresponde à allowlist.</p><label>Screen IDs piloto<textarea value={configDraft} onChange={(event) => setConfigDraft(event.target.value)} placeholder="Um screenId por linha" /></label><div><button disabled={configSaving} onClick={() => savePilotConfig(config.enabled)}>Salvar allowlist</button><button className={config.enabled ? "danger" : "enable"} disabled={configSaving} onClick={() => savePilotConfig(!config.enabled)}>{config.enabled ? "Desativar telemetria" : "Ativar somente allowlist"}</button></div></details>
    <section className="telemetry-current-session" aria-labelledby="telemetry-current-title"><h2 id="telemetry-current-title">Sessão atual</h2><p>Último estado recebido em tempo real; telas offline podem apresentar o último snapshot conhecido.</p><div className="telemetry-primary-kpis"><MetricCard icon={<Monitor />} title="Telas online" value={`${countStatus("ONLINE")} de ${filtered.length}`} detail={`${countStatus("ATTENTION")} em atenção · ${countStatus("OFFLINE")} offline`} tone="green" /><MetricCard icon={<Wifi />} title="Internet utilizada pelo aplicativo" value={metrics.networkScreens ? formatBytes(metrics.appInternetReceivedBytes) : EMPTY} detail={metrics.networkScreens ? `Snapshot atual de ${metrics.networkScreens} tela(s) schema 4 · inclui Firebase, APIs, downloads, mídia remota e dados dinâmicos` : "Não instrumentado"} /><MetricCard icon={<Download />} title="Tráfego evitado pelo cache" value={metrics.avoidedScreens ? formatBytes(metrics.trafficAvoidedBytes) : EMPTY} detail={metrics.avoidedScreens ? `Dado atual de ${metrics.avoidedScreens} tela(s) online · equivalente ao reutilizado do cache` : "Não instrumentado"} tone="cyan" /><MetricCard icon={<Database />} title="Cache hit rate" value={cacheTotal ? `${Math.round(metrics.cacheHits * 100 / cacheTotal)}%` : EMPTY} detail={cacheTotal ? `${metrics.cacheHits} hits · ${metrics.cacheMisses} misses · ${metrics.cacheRateScreens} tela(s) online` : metrics.cacheRateScreens ? "Nenhuma reprodução cacheável" : "Não instrumentado"} tone="green" /><MetricCard icon={<AlertTriangle />} title="Falhas de mídia" value={metrics.currentSchema4Screens ? "0" : EMPTY} detail={metrics.currentSchema4Screens ? "0 timeouts · offline não é falha de mídia" : "Não instrumentado"} tone="red" /></div></section>
    <section className="telemetry-history-summary" aria-labelledby="telemetry-history-title"><div className="telemetry-history-heading"><div><h2 id="telemetry-history-title">Histórico do período</h2><p>{historicalRange.start} a {historicalRange.end} · resumos diários persistidos, independentes do status online atual.</p></div><small>{historyState.estimatedReads || 0} documento(s) diário(s) lido(s)</small></div>{historyState.status === "loading" ? <div className="telemetry-state">Carregando histórico…</div> : historyState.status === "permission-denied" ? <div className="telemetry-state error"><strong>Permissão insuficiente</strong><span>As Rules atuais não permitem consultar o histórico para este escopo.</span></div> : historyState.status === "error" ? <div className="telemetry-state error"><strong>Erro ao carregar histórico</strong><span>Tente novamente sem alterar os dados atuais.</span></div> : historyState.status === "empty" ? <div className="telemetry-state"><strong>Sem histórico no período</strong><span>Nenhum resumo diário foi encontrado. Isso não representa consumo ou tempo zero.</span></div> : <><div className="telemetry-primary-kpis"><MetricCard icon={<Wifi />} title="Internet histórica (RX + TX)" value={formatBytes(historical.internetTotalBytes)} detail={`RX ${formatBytes(historical.internetRxBytes)} · TX ${formatBytes(historical.internetTxBytes)}`} /><MetricCard icon={<Download />} title="Downloads reais de mídia" value={formatBytes(historical.mediaDownloadedBytes)} detail="Bytes de mídia efetivamente baixados" tone="cyan" /><MetricCard icon={<Database />} title="Economia estimada pelo cache" value={formatBytes(historical.cacheReusedBytes)} detail={historical.cacheHitRate === null ? "Sem reproduções cacheáveis" : `Cache hit rate ${(historical.cacheHitRate * 100).toLocaleString("pt-BR", { maximumFractionDigits:1 })}%`} tone="green" /><MetricCard icon={<Clock3 />} title="Funcionamento observado" value={fmtDuration(historical.observedUptimeSeconds * 1000)} detail={`Reprodução comprovada ${fmtDuration(historical.provedPlaybackSeconds * 1000)}`} /><MetricCard icon={<AlertTriangle />} title="Sessões e interrupções" value={`${historical.sessionCount} sessão(ões)`} detail={`${historical.failureCount} falha(s) · ${historical.unknownInterruptionCount} interrupção(ões) desconhecida(s)`} tone="red" /></div>{historyState.missingScreenDays > 0 && <p className="telemetry-history-gaps"><AlertTriangle size={16} />Há {historyState.missingScreenDays} combinação(ões) de tela/dia sem dados. Dias totalmente ausentes: {historyState.missingDateKeys.join(", ") || "nenhum"}. Esses períodos não entram nos totais.</p>}<div className="telemetry-history-chart" role="img" aria-label="Evolução diária do consumo total de internet">{historyState.rows.map((item) => { const maximum = Math.max(1, ...historyState.rows.map((row) => row.internetRxBytes + row.internetTxBytes)); const total = item.internetRxBytes + item.internetTxBytes; return <div key={`${item.clientId}-${item.screenId}-${item.dateKey}`} title={`${item.dateKey}: ${formatBytes(total)}`}><i style={{ height:`${Math.max(3, total * 100 / maximum)}%` }} /><span>{item.dateKey.slice(5)}</span></div>; })}</div></>}</section>
    <nav className="telemetry-section-nav"><button onClick={() => scrollToTelemetry("telemetry-overview")}>Visão Geral</button><button onClick={() => scrollToTelemetry("telemetry-screens")}>Telas</button><button onClick={() => scrollToTelemetry("telemetry-traffic")}>Consumo de Mídia</button><button onClick={() => scrollToTelemetry("telemetry-cache")}>Cache</button><button onClick={() => scrollToTelemetry("telemetry-status")}>Rede e Conexão</button><button onClick={() => scrollToTelemetry("telemetry-events")}>Eventos e Logs</button></nav>
    <div className="telemetry-overview-grid" id="telemetry-overview"><article className="telemetry-visual-card"><h2>Origem atual reportada pelas telas</h2>{originSample.total ? <Donut segments={originSegments} centerValue={originReported.toLocaleString("pt-BR")} caption="Com origem atual" /> : <div className="telemetry-chart-empty"><Activity /><strong>Nenhuma tela online</strong><span>A origem aparecerá quando uma tela estiver reproduzindo.</span></div>}</article><article className="telemetry-visual-card traffic-chart-card" id="telemetry-traffic"><h2>Resumo de tráfego — schema 4 atual</h2>{metrics.currentSchema4Screens ? <TrafficComparison metrics={metrics} /> : <div className="telemetry-chart-empty"><Activity /><strong>Não instrumentado</strong><span>Nenhuma tela online possui snapshot schema 4 válido.</span></div>}</article><article className="telemetry-visual-card" id="telemetry-status"><h2>Status das telas</h2><Donut segments={statusSegments} centerValue={filtered.length} caption="Telas monitoradas" /></article></div>
    <div className="telemetry-secondary-kpis"><MetricCard icon={<Clock3 />} title="Tempo ativo do Player" value={cardData.activeScreens ? fmtDuration(cardData.activeTimeMs) : EMPTY} detail={cardData.activeScreens ? `${cardData.activeScreens} tela(s) com tempo ativo reportado` : "Não instrumentado"} /><MetricCard icon={<Download />} title="Downloads de mídia acumulados" value={metrics.downloadedScreens ? formatBytes(metrics.mediaDownloadedBytes) : EMPTY} detail={metrics.downloadedScreens ? `${metrics.downloadedScreens} tela(s) schema 4 online · timestamp individual não disponível` : "Último download de mídia: não disponível"} tone="cyan" /><MetricCard icon={<Database />} title="Itens em cache" value={cardData.cacheScreens ? cardData.cacheItems.toLocaleString("pt-BR") : EMPTY} detail={cardData.cacheScreens ? `Último estado conhecido de ${cardData.cacheScreens} tela(s)${cardData.cacheOfflineScreens ? ` · ${cardData.cacheOfflineScreens} offline` : ""}` : "Nenhum dado de cache disponível"} tone="green" /><MetricCard icon={<RefreshCw />} title="Versão mais recente reportada" value={cardData.latestVersionScreen ? appVersion(cardData.latestVersionScreen) : EMPTY} detail={cardData.latestVersionScreen ? `${cardData.versionCount} tela(s) nesta versão · mais instalada: ${cardData.mostInstalledVersion} (${cardData.mostInstalledCount})` : "Versão ainda não informada"} /></div>
    <section className={`telemetry-v2-activity${activityExpanded ? " is-expanded" : ""}`} aria-labelledby="telemetry-activity-title">
      <div className="telemetry-v2-activity-heading"><div><h2 id="telemetry-activity-title"><Activity size={20} />Histórico de atividade das telas</h2><p>Visualize somente os períodos comprovados por eventos enviados pela Telemetria V2-A.</p></div><button type="button" onClick={() => setActivityExpanded((value) => !value)}>{activityExpanded ? "Recolher timeline detalhada" : "Ver timeline detalhada"}</button></div>
      <div className="telemetry-v2-activity-filters">
        <label><span>Cliente</span><select value={activityClientId} onChange={(event) => { setActivityClientId(event.target.value); setActivityScreenId("all"); }}><option value="all">Todos os clientes</option>{activityClients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Tela</span><select value={activityScreenId} onChange={(event) => setActivityScreenId(event.target.value)}><option value="all">Todas as telas</option>{activityScreens.map((item) => <option key={`${item.clientId}-${item.id}`} value={item.id}>{item.name || item.code || item.id}</option>)}</select></label>
        <label><span>Período</span><select value={activityPeriod} onChange={(event) => setActivityPeriod(event.target.value)}><option value="day">Dia</option><option value="week">Semana</option><option value="month">Mês</option></select></label>
        <label><span>Data</span><input type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} /></label>
      </div>
      <div className="telemetry-v2-activity-summary"><article><span>Reprodução comprovada</span><strong>{activityPeriods.length ? fmtDuration(activitySummary.totalActiveMs) : EMPTY}</strong></article><article><span>Tempo online comprovado</span><strong>{activitySummary.onlinePeriods ? fmtDuration(activitySummary.totalOnlineMs) : EMPTY}</strong></article><article><span>Tempo offline comprovado</span><strong>{activitySummary.offlinePeriods ? fmtDuration(activitySummary.totalOfflineMs) : EMPTY}</strong></article><article><span>Última interrupção</span><strong>{activitySummary.lastDeactivationAtMs ? new Date(activitySummary.lastDeactivationAtMs).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }) : EMPTY}</strong></article></div>
      {!activityPeriods.length ? <div className="telemetry-v2-activity-empty"><Activity /><strong>Aguardando dados da Telemetria V2-A</strong><span>O histórico será exibido quando existirem eventos reais e fechados no período selecionado.</span></div> : activityExpanded && <div className="telemetry-v2-activity-details">
        <div className="telemetry-v2-activity-legend"><span><i className="active" />Ativa</span><span><i className="offline" />Desligada</span><span><i className="attention" />Atenção</span></div>
        <div className="telemetry-v2-activity-timeline-scroll"><div className="telemetry-v2-activity-timeline">{activityPeriods.map((item) => <i key={item.id} className={activityTone(item.state)} style={{ width:`${Math.max(1.5, item.durationMs * 100 / Math.max(1, activityRange.endMs - activityRange.startMs))}%` }} title={`${activityStateLabel(item.state)} · ${fmtDuration(item.durationMs)}`} />)}</div></div>
        <div className="telemetry-v2-activity-detail-grid"><article><span>Tempo ligado</span><strong>{fmtDuration(activitySummary.totalActiveMs)}</strong><small>{activitySummary.activePeriods} período(s)</small></article><article><span>Tempo desligado</span><strong>{fmtDuration(activitySummary.totalOfflineMs)}</strong><small>{activitySummary.offlinePeriods} período(s)</small></article><article><span>Primeira ativação</span><strong>{activitySummary.firstActivationAtMs ? new Date(activitySummary.firstActivationAtMs).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }) : EMPTY}</strong></article><article><span>Última desativação</span><strong>{activitySummary.lastDeactivationAtMs ? new Date(activitySummary.lastDeactivationAtMs).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }) : EMPTY}</strong></article></div>
        <div className="telemetry-v2-activity-table"><div className="head"><span>Início</span><span>Fim</span><span>Duração</span><span>Status</span></div>{activityPeriods.map((item) => <div key={item.id}><span>{new Date(item.startMs).toLocaleString("pt-BR")}</span><span>{new Date(item.endMs).toLocaleString("pt-BR")}</span><span>{fmtDuration(item.durationMs)}</span><span><i className={activityTone(item.state)} />{activityStateLabel(item.state)}</span></div>)}</div>
        <p className="telemetry-v2-activity-copy">Os totais incluem exclusivamente intervalos encerrados por eventos reais. Lacunas e o último evento sem sucessor não são contabilizados.</p>
      </div>}
    </section>
    <section className="telemetry-screens-section" id="telemetry-screens"><div className="telemetry-table-toolbar"><div><h2>Telas</h2><p>Status, reprodução, cache e comunicação em uma visão operacional.</p></div><label><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, cliente ou local…" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos os status</option><option value="ONLINE">Online</option><option value="ATTENTION">Atenção</option><option value="OFFLINE">Offline</option></select><button className="telemetry-clear" onClick={clearFilters}><X size={16} />Limpar filtros</button></div>
      {!filtered.length ? <div className="telemetry-state"><strong>Sem telas para os filtros selecionados</strong><span>Ajuste ou limpe os filtros para visualizar outros dispositivos.</span></div> : <div className="telemetry-table-v2"><div className="head"><span>Status</span><span>Nome da tela</span><span>Cliente / local</span><span>Reprodução atual</span><span>Origem</span><span>Tráfego reportado</span><span>Última comunicação</span><span>Telemetria</span><span>Versão do app</span></div>{filtered.map((item) => { const meta = sourceMeta(item, now); return <button key={`${item.clientId}-${item.id}`} onClick={() => setSelectedKey(`${item.clientId}/${item.id}`)}><span><i className={`screen-state-dot ${item.portalStatus.toLowerCase()}`} />{STATUS_LABELS[item.portalStatus]}</span><span><strong>{item.name || item.code || item.id}</strong><small>{item.currentPlaylistName || item.telemetry?.current?.playlistId || "Playlist não informada"}</small></span><span><strong>{item.clientName}</strong><small>{item.location || "Local não informado"} · Vinculada desde: {linkedAtForScreen(item, bindings) ? new Date(timestampMs(linkedAtForScreen(item, bindings))).toLocaleDateString("pt-BR") : EMPTY}</small></span><span><strong>{item.nowPlayingTitle || item.telemetry?.current?.currentItemId || "Não informado"}</strong><small>{item.telemetry?.schemaVersion >= 3 && item.nowPlayingTitle ? "Último registro do Player · " : ""}{item.nowPlayingIndex && item.nowPlayingTotal ? `Item ${item.nowPlayingIndex}/${item.nowPlayingTotal}` : "Posição não informada"}</small></span><span className="telemetry-origin-cell"><b className={`origin-badge ${meta.className}`}>{meta.label}</b><small>{cacheLabel(item)}</small></span><span>{mediaCounters(item) ? fmtBytes(mediaCounters(item).bytesDownloaded) : EMPTY}</span><span>{formatRelativeCommunication(lastCommunication(item), now)}</span><span>{telemetryLabel(item, now)}</span><span className="telemetry-app-version">{appVersion(item)}</span></button>; })}</div>}
    </section>
    <section className="telemetry-events-summary" id="telemetry-events"><h2>Eventos e Logs</h2><p>Selecione uma tela na tabela para visualizar os eventos recentes disponíveis.</p><div><span>Telemetria ativa <b>{activeTelemetry}</b></span><span>Aguardando primeiro sinal <b>{waitingTelemetry}</b></span><span>Dados desatualizados <b>{filtered.filter((item) => item.telemetryState === "STALE").length}</b></span></div></section>
    {selected && <div className="telemetry-detail"><button className="close" onClick={() => setSelectedKey(null)}>Fechar</button><span>{selected.clientName}</span><h2>{selected.name || selected.code || selected.id}</h2><div className="detail-grid"><p><b>Status da tela</b>{STATUS_LABELS[selected.portalStatus]}</p><p><b>Última comunicação</b>{formatRelativeCommunication(lastCommunication(selected), now)}</p><p><b>Status da telemetria</b>{telemetryLabel(selected, now)}</p><p><b>Vinculada desde</b>{linkedAtForScreen(selected, bindings) ? new Date(timestampMs(linkedAtForScreen(selected, bindings))).toLocaleString("pt-BR") : EMPTY}</p><p><b>Início da sessão</b>{formatSessionStartedAt(selected.telemetry?.session?.sessionStartedAt)}</p><p><b>Tempo ativo</b>{selected.telemetry?.schemaVersion >= 3 && measured(selected.telemetry?.session?.uptimeSeconds) ? fmtDuration(Number(selected.telemetry.session.uptimeSeconds) * 1000) : EMPTY}</p><p><b>Estado do Player</b>{selected.telemetry?.player?.state || EMPTY}</p><p><b>Conectividade</b>{selected.telemetry?.schemaVersion >= 3 ? selected.telemetry?.current?.networkStatus || EMPTY : EMPTY}</p><p><b>Último heartbeat</b>{selected.telemetry?.schemaVersion >= 3 && timestampMs(selected.telemetry?.session?.lastHeartbeatAt) ? formatRelativeCommunication(selected.telemetry.session.lastHeartbeatAt, now) : EMPTY}</p><p><b>Último dado de telemetria</b>{timestampMs(selected.telemetryUpdatedAt) ? formatRelativeCommunication(selected.telemetryUpdatedAt, now) : "Aguardando dados"}</p><p><b>Versão do app</b>{appVersion(selected)}</p><p><b>Origem atual</b>{sourceMeta(selected, now).label}</p><p><b>Cache</b>{cacheStatus(selected) ? `${cacheLabel(selected)} ${selected.cachedItems || 0}/${selected.totalCacheableItems || 0}` : cacheLabel(selected)}</p><p><b>Dispositivo</b>{bindingForScreen(selected, bindings)?.deviceId || selected.connectedDeviceId || selected.activeDeviceId || EMPTY}</p><p><b>Item atual</b>{selected.nowPlayingIndex && selected.nowPlayingTotal ? `${selected.nowPlayingIndex}/${selected.nowPlayingTotal}` : EMPTY}</p></div><h3>Tráfego e cache</h3><div className="detail-grid"><p title="Inclui Firebase, APIs, downloads, mídia remota e dados dinâmicos."><b>Internet utilizada pelo aplicativo</b>{trafficSnapshot(selected) ? trafficSnapshot(selected).networkMeasurementSupported ? formatBytes(trafficSnapshot(selected).appInternetReceivedBytes) : "Indisponível" : "Não instrumentado"}</p><p><b>Reutilizado do cache</b>{trafficValue(selected, "localMediaReusedBytes")}</p><p><b>Tráfego evitado</b>{trafficValue(selected, "trafficAvoidedBytes")}</p><p><b>Cache hit rate</b>{trafficSnapshot(selected) ? trafficSnapshot(selected).cacheHitRate === null ? "Sem reproduções cacheáveis" : `${(trafficSnapshot(selected).cacheHitRate * 100).toLocaleString("pt-BR", { maximumFractionDigits:1 })}%` : "Não instrumentado"}</p><p><b>Downloads de mídia</b>{trafficValue(selected, "mediaDownloadedBytes")}</p></div><h3>Eventos recentes</h3><div className="telemetry-events"><p className="empty-copy">A telemetria envia contadores agregados, sem logs individuais de reprodução.</p></div></div>}
  </section>;
}
