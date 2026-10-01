import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Clock3, Database, Download, FileText, Monitor, RefreshCw, Search, Wifi, X } from "lucide-react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { compareTelemetryScreens, formatRelativeCommunication, getPortalLastSignalMs, getPortalScreenStatus, getTelemetryVisualState, sortClientsAlphabetically, timestampMs } from "./portal-status";
import { bindingForScreen, linkedAtForScreen, measured } from "./telemetry-v1";
import { aggregateSchema4Traffic, getCurrentSourceGroup, getTelemetryCardData, reportedAppVersion } from "./telemetry-card-data";
import { renderTelemetryPdfReport } from "./telemetry-pdf-report";
import { formatBytes } from "./format-bytes";
import totemLogo from "./assets/logo.png";

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
    playbackErrors: 0,
    downloadTimeouts: 0,
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

function MetricCard({ icon, title, value, detail, tone = "blue" }) {
  return <article className={`telemetry-metric-card tone-${tone}`}><div className="telemetry-metric-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong><small>{detail}</small></div></article>;
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
  useEffect(() => onSnapshot(collection(db, "playerDeviceBindings"), (snapshot) => {
    setBindings(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, () => setBindings([])), []);

  async function savePilotConfig(nextEnabled = config.enabled) {
    setConfigSaving(true);
    try { await setDoc(doc(db, "settings", "telemetry2a2c"), { enabled: nextEnabled, clientIds: config.clientIds || [], deviceIds: config.deviceIds || [], screenIds: configDraft.split(/[\s,;]+/).filter(Boolean), syncIntervalMs: Math.max(60000, Number(config.syncIntervalMs || 300000)), updatedAt: serverTimestamp() }, { merge: true }); }
    finally { setConfigSaving(false); }
  }

  const enriched = useMemo(() => screens.map((screen) => ({ ...screen, portalStatus: getPortalScreenStatus(screen, now), telemetryState: getTelemetryVisualState({ config, screen, now, readError: Boolean(error) }) })), [screens, now, config, error]);
  const selected = enriched.find((item) => `${item.clientId}/${item.id}` === selectedKey);
  const versions = useMemo(() => [...new Set(enriched.map(appVersion).filter((item) => item !== EMPTY))].sort(), [enriched]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return enriched.filter((item) => (clientId === "all" || item.clientId === clientId) && (screenId === "all" || item.id === screenId) && (status === "all" || item.portalStatus === status) && (source === "all" || sourceMeta(item).key === source) && (version === "all" || appVersion(item) === version) && (!term || [item.name, item.code, item.clientName, item.location].some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(term)))).sort((left, right) => compareTelemetryScreens(left, right, now));
  }, [enriched, clientId, screenId, status, source, version, search, now]);
  const metrics = useMemo(() => aggregateSchema4Traffic(filtered), [filtered]);
  const cacheTotal = metrics.cacheHits + metrics.cacheMisses;
  const countStatus = (value) => filtered.filter((item) => item.portalStatus === value).length;
  const activeTelemetry = filtered.filter((item) => item.telemetryState === "ACTIVE").length;
  const waitingTelemetry = filtered.filter((item) => item.telemetryState === "WAITING_FIRST_SIGNAL").length;
  const cardData = useMemo(() => getTelemetryCardData(filtered), [filtered]);
  const originCounts = filtered.reduce((counts, item) => {
    const origin = sourceMeta(item).key;
    counts[origin] += 1;
    return counts;
  }, { local:0, remote:0, fallback:0, template:0, mixed:0, unknown:0 });
  const originReported = filtered.length - originCounts.unknown;
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
    const communicatedAt = timestampMs(lastCommunication(item));
    if (!communicatedAt) return false;
    if (period === "today") return communicatedAt >= new Date(now).setHours(0, 0, 0, 0);
    if (period === "7d") return communicatedAt >= now - 7 * 86400000;
    if (period === "30d") return communicatedAt >= now - 30 * 86400000;
    return true;
  });
  const generatePdfReport = () => {
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
    const html = renderTelemetryPdfReport({
      rows,
      clientName: reportClient?.name || (reportScope === "screen" ? ordered[0].clientName : "Todos os clientes"),
      clientLogoUrl: reportClient?.logoUrl || "",
      totemLogoUrl: new URL(totemLogo, window.location.origin).href,
      totemIconUrl: new URL("/logo.png", window.location.origin).href,
      generatedAt: now,
    });
    const popup = window.open("", "_blank");
    if (!popup) { window.alert("O navegador bloqueou a janela do relatório. Libere pop-ups e tente novamente."); return; }
    popup.opener = null;
    popup.document.write(html);
    popup.document.close();
  };

  if (loading) return <section className="telemetry-page"><div className="telemetry-state">Carregando telemetria…</div></section>;
  return <section className="telemetry-page telemetry-v2">
    <header className="telemetry-v2-header"><div><span>MONITORAMENTO OPERACIONAL</span><h1>Telemetria das Telas</h1><p>Acompanhe em tempo real o desempenho, rede, cache e reprodução das suas telas.</p></div><div className="telemetry-v2-header-actions"><div className="telemetry-report-controls"><select aria-label="Escopo do relatório" value={reportScope} onChange={(event) => { setReportScope(event.target.value); setReportTarget(""); }}><option value="general">Relatório geral</option><option value="client">Por cliente</option><option value="screen">Por tela</option></select>{reportScope === "client" && <select aria-label="Cliente do relatório" value={reportTarget} onChange={(event) => setReportTarget(event.target.value)}><option value="">Selecione o cliente</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}{reportScope === "screen" && <select aria-label="Tela do relatório" value={reportTarget} onChange={(event) => setReportTarget(event.target.value)}><option value="">Selecione a tela</option>{[...enriched].sort((left, right) => compareTelemetryScreens(left, right, now)).map((item) => <option key={`${item.clientId}-${item.id}`} value={`${item.clientId}:${item.id}`}>{item.name || item.code || item.id} - {item.clientName}</option>)}</select>}<button onClick={generatePdfReport}><FileText size={17} />Gerar PDF</button></div><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="today">Hoje</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option></select><b><i />Atualização em tempo real</b></div></header>
    {error && <div className="telemetry-state error"><strong>Erro de leitura</strong><span>{error}</span></div>}
    <div className="telemetry-main-filters"><select value={clientId} onChange={(event) => { setClientId(event.target.value); setScreenId("all"); }}><option value="all">Todos os clientes</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={screenId} onChange={(event) => setScreenId(event.target.value)}><option value="all">Todas as telas</option>{enriched.filter((item) => clientId === "all" || item.clientId === clientId).map((item) => <option key={`${item.clientId}-${item.id}`} value={item.id}>{item.name || item.code || item.id}</option>)}</select><select value={source} onChange={(event) => setSource(event.target.value)}><option value="all">Todas as origens</option><option value="local">Local (cache)</option><option value="remote">Internet</option><option value="fallback">Fallback</option><option value="template">Template</option><option value="mixed">Misto</option><option value="unknown">Sem informação</option></select><select value={version} onChange={(event) => setVersion(event.target.value)}><option value="all">Todas as versões</option>{versions.map((item) => <option key={item}>{item}</option>)}</select></div>
    <details className="telemetry-config"><summary>Ativação piloto <b>{config.enabled ? "ATIVA" : "DESATIVADA"}</b></summary><p>A coleta só funciona quando a flag está ativa e o dispositivo corresponde à allowlist.</p><label>Screen IDs piloto<textarea value={configDraft} onChange={(event) => setConfigDraft(event.target.value)} placeholder="Um screenId por linha" /></label><div><button disabled={configSaving} onClick={() => savePilotConfig(config.enabled)}>Salvar allowlist</button><button className={config.enabled ? "danger" : "enable"} disabled={configSaving} onClick={() => savePilotConfig(!config.enabled)}>{config.enabled ? "Desativar telemetria" : "Ativar somente allowlist"}</button></div></details>
    <div className="telemetry-primary-kpis"><MetricCard icon={<Monitor />} title="Telas online" value={`${countStatus("ONLINE")} de ${filtered.length}`} detail={`${countStatus("ATTENTION")} em atenção · ${countStatus("OFFLINE")} offline`} tone="green" /><MetricCard icon={<Wifi />} title="Internet utilizada pelo aplicativo" value={metrics.networkScreens ? formatBytes(metrics.appInternetReceivedBytes) : EMPTY} detail={metrics.networkScreens ? `Snapshot atual de ${metrics.networkScreens} tela(s) schema 4 · inclui Firebase, APIs, downloads, mídia remota e dados dinâmicos` : "Não instrumentado"} /><MetricCard icon={<Download />} title="Tráfego evitado pelo cache" value={metrics.avoidedScreens ? formatBytes(metrics.trafficAvoidedBytes) : EMPTY} detail={metrics.avoidedScreens ? `Dado atual de ${metrics.avoidedScreens} tela(s) online · equivalente ao reutilizado do cache` : "Não instrumentado"} tone="cyan" /><MetricCard icon={<Database />} title="Cache hit rate" value={cacheTotal ? `${Math.round(metrics.cacheHits * 100 / cacheTotal)}%` : EMPTY} detail={cacheTotal ? `${metrics.cacheHits} hits · ${metrics.cacheMisses} misses · ${metrics.cacheRateScreens} tela(s) online` : metrics.cacheRateScreens ? "Nenhuma reprodução cacheável" : "Não instrumentado"} tone="green" /><MetricCard icon={<AlertTriangle />} title="Falhas de mídia" value={metrics.currentSchema4Screens ? "0" : EMPTY} detail={metrics.currentSchema4Screens ? "0 timeouts · offline não é falha de mídia" : "Não instrumentado"} tone="red" /></div>
    <nav className="telemetry-section-nav"><button onClick={() => scrollToTelemetry("telemetry-overview")}>Visão Geral</button><button onClick={() => scrollToTelemetry("telemetry-screens")}>Telas</button><button onClick={() => scrollToTelemetry("telemetry-traffic")}>Consumo de Mídia</button><button onClick={() => scrollToTelemetry("telemetry-cache")}>Cache</button><button onClick={() => scrollToTelemetry("telemetry-status")}>Rede e Conexão</button><button onClick={() => scrollToTelemetry("telemetry-events")}>Eventos e Logs</button></nav>
    <div className="telemetry-overview-grid" id="telemetry-overview"><article className="telemetry-visual-card"><h2>Origem atual reportada pelas telas</h2><Donut segments={originSegments} centerValue={originReported.toLocaleString("pt-BR")} caption="Com origem atual" /></article><article className="telemetry-visual-card traffic-chart-card" id="telemetry-traffic"><h2>Resumo de tráfego — schema 4 atual</h2>{metrics.currentSchema4Screens ? <TrafficComparison metrics={metrics} /> : <div className="telemetry-chart-empty"><Activity /><strong>Não instrumentado</strong><span>Nenhuma tela online possui snapshot schema 4 válido.</span></div>}</article><article className="telemetry-visual-card" id="telemetry-status"><h2>Status das telas</h2><Donut segments={statusSegments} centerValue={filtered.length} caption="Telas monitoradas" /></article></div>
    <div className="telemetry-secondary-kpis"><MetricCard icon={<Clock3 />} title="Tempo ativo do Player" value={cardData.activeScreens ? fmtDuration(cardData.activeTimeMs) : EMPTY} detail={cardData.activeScreens ? `${cardData.activeScreens} tela(s) com tempo ativo reportado` : "Não instrumentado"} /><MetricCard icon={<Download />} title="Downloads de mídia acumulados" value={metrics.downloadedScreens ? formatBytes(metrics.mediaDownloadedBytes) : EMPTY} detail={metrics.downloadedScreens ? `${metrics.downloadedScreens} tela(s) schema 4 online · timestamp individual não disponível` : "Último download de mídia: não disponível"} tone="cyan" /><MetricCard icon={<Database />} title="Itens em cache" value={cardData.cacheScreens ? cardData.cacheItems.toLocaleString("pt-BR") : EMPTY} detail={cardData.cacheScreens ? `Último estado conhecido de ${cardData.cacheScreens} tela(s)${cardData.cacheOfflineScreens ? ` · ${cardData.cacheOfflineScreens} offline` : ""}` : "Nenhum dado de cache disponível"} tone="green" /><MetricCard icon={<RefreshCw />} title="Versão mais recente reportada" value={cardData.latestVersionScreen ? appVersion(cardData.latestVersionScreen) : EMPTY} detail={cardData.latestVersionScreen ? `${cardData.versionCount} tela(s) nesta versão · mais instalada: ${cardData.mostInstalledVersion} (${cardData.mostInstalledCount})` : "Versão ainda não informada"} /></div>
    <section className="telemetry-screens-section" id="telemetry-screens"><div className="telemetry-table-toolbar"><div><h2>Telas</h2><p>Status, reprodução, cache e comunicação em uma visão operacional.</p></div><label><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, cliente ou local…" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos os status</option><option value="ONLINE">Online</option><option value="ATTENTION">Atenção</option><option value="OFFLINE">Offline</option></select><button className="telemetry-clear" onClick={clearFilters}><X size={16} />Limpar filtros</button></div>
      {!filtered.length ? <div className="telemetry-state"><strong>Sem telas para os filtros selecionados</strong><span>Ajuste ou limpe os filtros para visualizar outros dispositivos.</span></div> : <div className="telemetry-table-v2"><div className="head"><span>Status</span><span>Nome da tela</span><span>Cliente / local</span><span>Reprodução atual</span><span>Origem</span><span>Tráfego reportado</span><span>Última comunicação</span><span>Telemetria</span><span>Versão do app</span></div>{filtered.map((item) => { const meta = sourceMeta(item, now); return <button key={`${item.clientId}-${item.id}`} onClick={() => setSelectedKey(`${item.clientId}/${item.id}`)}><span><i className={`screen-state-dot ${item.portalStatus.toLowerCase()}`} />{STATUS_LABELS[item.portalStatus]}</span><span><strong>{item.name || item.code || item.id}</strong><small>{item.currentPlaylistName || item.telemetry?.current?.playlistId || "Playlist não informada"}</small></span><span><strong>{item.clientName}</strong><small>{item.location || "Local não informado"} · Vinculada desde: {linkedAtForScreen(item, bindings) ? new Date(timestampMs(linkedAtForScreen(item, bindings))).toLocaleDateString("pt-BR") : EMPTY}</small></span><span><strong>{item.nowPlayingTitle || item.telemetry?.current?.currentItemId || "Não informado"}</strong><small>{item.telemetry?.schemaVersion >= 3 && item.nowPlayingTitle ? "Último registro do Player · " : ""}{item.nowPlayingIndex && item.nowPlayingTotal ? `Item ${item.nowPlayingIndex}/${item.nowPlayingTotal}` : "Posição não informada"}</small></span><span className="telemetry-origin-cell"><b className={`origin-badge ${meta.className}`}>{meta.label}</b><small>{cacheLabel(item)}</small></span><span>{mediaCounters(item) ? fmtBytes(mediaCounters(item).bytesDownloaded) : EMPTY}</span><span>{formatRelativeCommunication(lastCommunication(item), now)}</span><span>{telemetryLabel(item, now)}</span><span className="telemetry-app-version">{appVersion(item)}</span></button>; })}</div>}
    </section>
    <section className="telemetry-events-summary" id="telemetry-events"><h2>Eventos e Logs</h2><p>Selecione uma tela na tabela para visualizar os eventos recentes disponíveis.</p><div><span>Telemetria ativa <b>{activeTelemetry}</b></span><span>Aguardando primeiro sinal <b>{waitingTelemetry}</b></span><span>Dados desatualizados <b>{filtered.filter((item) => item.telemetryState === "STALE").length}</b></span></div></section>
    {selected && <div className="telemetry-detail"><button className="close" onClick={() => setSelectedKey(null)}>Fechar</button><span>{selected.clientName}</span><h2>{selected.name || selected.code || selected.id}</h2><div className="detail-grid"><p><b>Status da tela</b>{STATUS_LABELS[selected.portalStatus]}</p><p><b>Última comunicação</b>{formatRelativeCommunication(lastCommunication(selected), now)}</p><p><b>Status da telemetria</b>{telemetryLabel(selected, now)}</p><p><b>Vinculada desde</b>{linkedAtForScreen(selected, bindings) ? new Date(timestampMs(linkedAtForScreen(selected, bindings))).toLocaleString("pt-BR") : EMPTY}</p><p><b>Tempo ativo</b>{selected.telemetry?.schemaVersion >= 3 && measured(selected.telemetry?.session?.uptimeSeconds) ? fmtDuration(Number(selected.telemetry.session.uptimeSeconds) * 1000) : EMPTY}</p><p><b>Estado do Player</b>{selected.telemetry?.player?.state || EMPTY}</p><p><b>Conectividade</b>{selected.telemetry?.schemaVersion >= 3 ? selected.telemetry?.current?.networkStatus || EMPTY : EMPTY}</p><p><b>Último heartbeat</b>{selected.telemetry?.schemaVersion >= 3 && timestampMs(selected.telemetry?.session?.lastHeartbeatAt) ? formatRelativeCommunication(selected.telemetry.session.lastHeartbeatAt, now) : EMPTY}</p><p><b>Último dado de telemetria</b>{timestampMs(selected.telemetryUpdatedAt) ? formatRelativeCommunication(selected.telemetryUpdatedAt, now) : "Aguardando dados"}</p><p><b>Versão do app</b>{appVersion(selected)}</p><p><b>Origem atual</b>{sourceMeta(selected, now).label}</p><p><b>Cache</b>{cacheStatus(selected) ? `${cacheLabel(selected)} ${selected.cachedItems || 0}/${selected.totalCacheableItems || 0}` : cacheLabel(selected)}</p><p><b>Dispositivo</b>{bindingForScreen(selected, bindings)?.deviceId || selected.connectedDeviceId || selected.activeDeviceId || EMPTY}</p><p><b>Item atual</b>{selected.nowPlayingIndex && selected.nowPlayingTotal ? `${selected.nowPlayingIndex}/${selected.nowPlayingTotal}` : EMPTY}</p></div><h3>Tráfego e cache</h3><div className="detail-grid"><p title="Inclui Firebase, APIs, downloads, mídia remota e dados dinâmicos."><b>Internet utilizada pelo aplicativo</b>{trafficSnapshot(selected) ? trafficSnapshot(selected).networkMeasurementSupported ? formatBytes(trafficSnapshot(selected).appInternetReceivedBytes) : "Indisponível" : "Não instrumentado"}</p><p><b>Reutilizado do cache</b>{trafficValue(selected, "localMediaReusedBytes")}</p><p><b>Tráfego evitado</b>{trafficValue(selected, "trafficAvoidedBytes")}</p><p><b>Cache hit rate</b>{trafficSnapshot(selected) ? trafficSnapshot(selected).cacheHitRate === null ? "Sem reproduções cacheáveis" : `${(trafficSnapshot(selected).cacheHitRate * 100).toLocaleString("pt-BR", { maximumFractionDigits:1 })}%` : "Não instrumentado"}</p><p><b>Downloads de mídia</b>{trafficValue(selected, "mediaDownloadedBytes")}</p></div><h3>Eventos recentes</h3><div className="telemetry-events"><p className="empty-copy">A telemetria envia contadores agregados, sem logs individuais de reprodução.</p></div></div>}
  </section>;
}
