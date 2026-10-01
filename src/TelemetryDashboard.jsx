import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Clock3, Database, Download, FileText, Monitor, RefreshCw, Search, Wifi, X } from "lucide-react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { compareTelemetryScreens, formatRelativeCommunication, getPortalLastSignalMs, getPortalScreenStatus, getTelemetryVisualState, sortClientsAlphabetically, timestampMs } from "./portal-status";
import { bindingForScreen, linkedAtForScreen, measured } from "./telemetry-v1";
import { getTelemetryCardData, reportedAppVersion } from "./telemetry-card-data";
import { getPortalCurrentMediaSource } from "./operational-telemetry";
import { renderTelemetryPdfReport } from "./telemetry-pdf-report";
import { formatBytes } from "./format-bytes";
import totemLogo from "./assets/logo.png";

const EMPTY = "—";
const fmtBytes = formatBytes;
const TELEMETRY_LABELS = { DISABLED: "Telemetria Off", WAITING_FIRST_SIGNAL: "Aguardando primeiro sinal", ACTIVE: "Ativa", STALE: "Dados desatualizados", SCREEN_OFFLINE: "Tela offline", NO_DATA_PERIOD: "Sem dados no período", READ_ERROR: "Erro de leitura" };
const telemetryLabel = (screen, now) => screen.telemetryState === "STALE" ? `Dados desatualizados ${formatRelativeCommunication(screen.telemetryUpdatedAt, now)}` : TELEMETRY_LABELS[screen.telemetryState];
const STATUS_LABELS = { ONLINE: "Online", ATTENTION: "Atenção", OFFLINE: "Offline" };
const SOURCE_META = {
  CACHE_LOCAL: { label: "Local", className: "local" },
  INTERNET_FALLBACK: { label: "Internet", className: "internet" },
  LOCAL: { label: "Local", className: "local" },
  REMOTE: { label: "Internet", className: "internet" },
  FALLBACK: { label: "Fallback pela internet", className: "internet" },
  TEMPLATE: { label: "Template", className: "local" },
  MIXED: { label: "Híbrido", className: "hybrid" },
  DOWNLOADING_TO_CACHE: { label: "Baixando", className: "downloading" },
  mixed: { label: "Híbrido", className: "hybrid" },
  cache: { label: "Local", className: "local" },
  local: { label: "Local", className: "local" },
  remote: { label: "Internet", className: "internet" },
  internet: { label: "Internet", className: "internet" },
};
const fmtDuration = (value) => {
  if (value === null || value === undefined) return EMPTY;
  const minutes = Math.floor(Number(value) / 60000);
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes} min`;
};
const knownSource = (value) => {
  const source = String(value || "").trim();
  return SOURCE_META[source] || SOURCE_META[source.toLowerCase()] || null;
};
const sourceMeta = (screen, now = Date.now()) => knownSource(getPortalCurrentMediaSource(screen, now))
  || { label: "Não medido", className: "unknown" };
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
  return screen?.telemetry?.schemaVersion >= 3 ? null : screen?.telemetry?.counters;
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
    return enriched.filter((item) => (clientId === "all" || item.clientId === clientId) && (screenId === "all" || item.id === screenId) && (status === "all" || item.portalStatus === status) && (source === "all" || sourceMeta(item, now).className === source) && (version === "all" || appVersion(item) === version) && (!term || [item.name, item.code, item.clientName, item.location].some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(term)))).sort((left, right) => compareTelemetryScreens(left, right, now));
  }, [enriched, clientId, screenId, status, source, version, search, now]);
  const metrics = useMemo(() => filtered.reduce((sum, item) => {
    const counters = mediaCounters(item);
    if (!counters || !measured(counters.localPlaybackCount) || !measured(counters.remotePlaybackCount)) return sum;
    sum.reportedScreens += 1;
    Object.keys(sum.counters).forEach((key) => { sum.counters[key] += Number(counters[key] || 0); });
    if (trafficSnapshot(item)?.networkMeasurementSupported === true) sum.networkScreens += 1;
    return sum;
  }, { reportedScreens: 0, networkScreens: 0, counters: { localPlaybackCount: 0, remotePlaybackCount: 0, bytesDownloaded: 0, appInternetReceivedBytes: 0, estimatedTrafficSaved: 0, displayTimeMs: 0, cacheHits: 0, cacheMisses: 0, playbackErrors: 0, downloadTimeouts: 0 } }), [filtered]);
  const c = metrics.counters;
  const cacheTotal = c.cacheHits + c.cacheMisses;
  const uninstrumented = filtered.some((item) => item.telemetry?.schemaVersion >= 3 && !trafficSnapshot(item));
  const countStatus = (value) => filtered.filter((item) => item.portalStatus === value).length;
  const activeTelemetry = filtered.filter((item) => item.telemetryState === "ACTIVE").length;
  const waitingTelemetry = filtered.filter((item) => item.telemetryState === "WAITING_FIRST_SIGNAL").length;
  const cardData = useMemo(() => getTelemetryCardData(filtered), [filtered]);
  const originCounts = filtered.reduce((counts, item) => {
    const origin = sourceMeta(item, now).className;
    if (origin === "local") counts.local += 1;
    else if (origin === "internet") counts.internet += 1;
    else counts.unknown += 1;
    return counts;
  }, { local: 0, internet: 0, unknown: 0 });
  const originReported = originCounts.local + originCounts.internet;
  const originSegments = [{ label: "Local (cache)", value: originCounts.local, color: "#34d399" }, { label: "Internet", value: originCounts.internet, color: "#ff647c" }, { label: "Sem informação", value: originCounts.unknown, color: "#7188ad" }];
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
    <div className="telemetry-main-filters"><select value={clientId} onChange={(event) => { setClientId(event.target.value); setScreenId("all"); }}><option value="all">Todos os clientes</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={screenId} onChange={(event) => setScreenId(event.target.value)}><option value="all">Todas as telas</option>{enriched.filter((item) => clientId === "all" || item.clientId === clientId).map((item) => <option key={`${item.clientId}-${item.id}`} value={item.id}>{item.name || item.code || item.id}</option>)}</select><select value={source} onChange={(event) => setSource(event.target.value)}><option value="all">Todas as origens</option><option value="local">Local</option><option value="hybrid">Híbrido</option><option value="internet">Internet</option><option value="downloading">Baixando</option></select><select value={version} onChange={(event) => setVersion(event.target.value)}><option value="all">Todas as versões</option>{versions.map((item) => <option key={item}>{item}</option>)}</select></div>
    <details className="telemetry-config"><summary>Ativação piloto <b>{config.enabled ? "ATIVA" : "DESATIVADA"}</b></summary><p>A coleta só funciona quando a flag está ativa e o dispositivo corresponde à allowlist.</p><label>Screen IDs piloto<textarea value={configDraft} onChange={(event) => setConfigDraft(event.target.value)} placeholder="Um screenId por linha" /></label><div><button disabled={configSaving} onClick={() => savePilotConfig(config.enabled)}>Salvar allowlist</button><button className={config.enabled ? "danger" : "enable"} disabled={configSaving} onClick={() => savePilotConfig(!config.enabled)}>{config.enabled ? "Desativar telemetria" : "Ativar somente allowlist"}</button></div></details>
    <div className="telemetry-primary-kpis"><MetricCard icon={<Monitor />} title="Telas online" value={`${countStatus("ONLINE")} de ${filtered.length}`} detail={`${countStatus("ATTENTION")} em atenção · ${countStatus("OFFLINE")} offline`} tone="green" /><MetricCard icon={<Wifi />} title="Internet utilizada pelo aplicativo" value={metrics.networkScreens ? formatBytes(c.appInternetReceivedBytes) : EMPTY} detail={metrics.networkScreens ? "Inclui Firebase, APIs, downloads, mídia remota e dados dinâmicos" : uninstrumented ? "Não instrumentado" : "Indisponível"} /><MetricCard icon={<Download />} title="Tráfego evitado pelo cache" value={metrics.reportedScreens ? formatBytes(c.estimatedTrafficSaved) : EMPTY} detail={metrics.reportedScreens ? "conteúdo servido localmente" : uninstrumented ? "Não instrumentado" : "Sem dados no período"} tone="cyan" /><MetricCard icon={<Database />} title="Cache hit rate" value={cacheTotal ? `${Math.round(c.cacheHits * 100 / cacheTotal)}%` : EMPTY} detail={cacheTotal ? `${c.cacheHits} hits · ${c.cacheMisses} misses` : uninstrumented ? "Não instrumentado" : "Nenhuma reprodução cacheável"} tone="green" /><MetricCard icon={<AlertTriangle />} title="Falhas de mídia" value={metrics.reportedScreens ? c.playbackErrors : EMPTY} detail={metrics.reportedScreens ? `${c.downloadTimeouts} timeout(s) de download` : uninstrumented ? "Não instrumentado" : "Nenhuma falha registrada"} tone="red" /></div>
    <nav className="telemetry-section-nav"><button onClick={() => scrollToTelemetry("telemetry-overview")}>Visão Geral</button><button onClick={() => scrollToTelemetry("telemetry-screens")}>Telas</button><button onClick={() => scrollToTelemetry("telemetry-traffic")}>Consumo de Mídia</button><button onClick={() => scrollToTelemetry("telemetry-cache")}>Cache</button><button onClick={() => scrollToTelemetry("telemetry-status")}>Rede e Conexão</button><button onClick={() => scrollToTelemetry("telemetry-events")}>Eventos e Logs</button></nav>
    <div className="telemetry-overview-grid" id="telemetry-overview"><article className="telemetry-visual-card"><h2>Origem atual reportada pelas telas</h2>{originReported ? <Donut segments={originSegments} centerValue={originReported.toLocaleString("pt-BR")} centerLabel="telas com origem" /> : <div className="telemetry-chart-empty"><Activity /><strong>Aguardando dados</strong><span>Nenhuma tela informou origem atual válida.</span></div>}</article><article className="telemetry-visual-card traffic-chart-card" id="telemetry-traffic"><h2>Tráfego de mídia</h2><div className="telemetry-chart-empty"><Wifi /><strong>{filtered.some((item) => item.telemetry?.schemaVersion >= 3) ? "Não instrumentado" : "Ainda não há histórico suficiente"}</strong><span>{uninstrumented ? "A Telemetria Operacional V1 não mede tráfego de mídia." : "Os totais atuais estão disponíveis acima; a base não fornece série temporal sem consulta adicional."}</span></div></article><article className="telemetry-visual-card" id="telemetry-status"><h2>Status das telas</h2><Donut segments={statusSegments} centerValue={filtered.length} centerLabel="telas" /></article></div>
    <div className="telemetry-secondary-kpis"><MetricCard icon={<Clock3 />} title="Tempo ativo do Player" value={cardData.activeScreens ? fmtDuration(cardData.activeTimeMs) : EMPTY} detail={cardData.activeScreens ? `${cardData.activeScreens} tela(s) com tempo ativo reportado` : "Não instrumentado"} /><MetricCard icon={<Download />} title="Última transferência" value={cardData.latestTransfer ? formatRelativeCommunication(cardData.latestTransfer.lastMediaDownloadAt, now) : EMPTY} detail={cardData.latestTransfer ? `${formatBytes(cardData.latestTransfer.lastMediaDownloadBytes)} · ${cardData.latestTransfer.name || cardData.latestTransfer.code || "Tela"}` : "Nenhuma transferência registrada"} tone="cyan" /><MetricCard icon={<Database />} title="Itens em cache" value={cardData.cacheScreens ? cardData.cacheItems.toLocaleString("pt-BR") : EMPTY} detail={cardData.cacheScreens ? `${cardData.cacheScreens} tela(s) com cache reportado` : "Nenhum dado de cache disponível"} tone="green" /><MetricCard icon={<RefreshCw />} title="Versão mais recente reportada" value={cardData.latestVersionScreen ? appVersion(cardData.latestVersionScreen) : EMPTY} detail={cardData.latestVersionScreen ? `${cardData.versionCount} tela(s) nesta versão` : "Versão ainda não informada"} /></div>
    <section className="telemetry-screens-section" id="telemetry-screens"><div className="telemetry-table-toolbar"><div><h2>Telas</h2><p>Status, reprodução, cache e comunicação em uma visão operacional.</p></div><label><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, cliente ou local…" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos os status</option><option value="ONLINE">Online</option><option value="ATTENTION">Atenção</option><option value="OFFLINE">Offline</option></select><button className="telemetry-clear" onClick={clearFilters}><X size={16} />Limpar filtros</button></div>
      {!filtered.length ? <div className="telemetry-state"><strong>Sem telas para os filtros selecionados</strong><span>Ajuste ou limpe os filtros para visualizar outros dispositivos.</span></div> : <div className="telemetry-table-v2"><div className="head"><span>Status</span><span>Nome da tela</span><span>Cliente / local</span><span>Reprodução atual</span><span>Origem</span><span>Tráfego reportado</span><span>Última comunicação</span><span>Telemetria</span><span>Versão do app</span></div>{filtered.map((item) => { const meta = sourceMeta(item, now); return <button key={`${item.clientId}-${item.id}`} onClick={() => setSelectedKey(`${item.clientId}/${item.id}`)}><span><i className={`screen-state-dot ${item.portalStatus.toLowerCase()}`} />{STATUS_LABELS[item.portalStatus]}</span><span><strong>{item.name || item.code || item.id}</strong><small>{item.currentPlaylistName || item.telemetry?.current?.playlistId || "Playlist não informada"}</small></span><span><strong>{item.clientName}</strong><small>{item.location || "Local não informado"} · Vinculada desde: {linkedAtForScreen(item, bindings) ? new Date(timestampMs(linkedAtForScreen(item, bindings))).toLocaleDateString("pt-BR") : EMPTY}</small></span><span><strong>{item.nowPlayingTitle || item.telemetry?.current?.currentItemId || "Não informado"}</strong><small>{item.telemetry?.schemaVersion >= 3 && item.nowPlayingTitle ? "Último registro do Player · " : ""}{item.nowPlayingIndex && item.nowPlayingTotal ? `Item ${item.nowPlayingIndex}/${item.nowPlayingTotal}` : "Posição não informada"}</small></span><span className="telemetry-origin-cell"><b className={`origin-badge ${meta.className}`}>{meta.label}</b><small>{cacheLabel(item)}</small></span><span>{mediaCounters(item) ? fmtBytes(mediaCounters(item).bytesDownloaded) : EMPTY}</span><span>{formatRelativeCommunication(lastCommunication(item), now)}</span><span>{telemetryLabel(item, now)}</span><span className="telemetry-app-version">{appVersion(item)}</span></button>; })}</div>}
    </section>
    <section className="telemetry-events-summary" id="telemetry-events"><h2>Eventos e Logs</h2><p>Selecione uma tela na tabela para visualizar os eventos recentes disponíveis.</p><div><span>Telemetria ativa <b>{activeTelemetry}</b></span><span>Aguardando primeiro sinal <b>{waitingTelemetry}</b></span><span>Dados desatualizados <b>{filtered.filter((item) => item.telemetryState === "STALE").length}</b></span></div></section>
    {selected && <div className="telemetry-detail"><button className="close" onClick={() => setSelectedKey(null)}>Fechar</button><span>{selected.clientName}</span><h2>{selected.name || selected.code || selected.id}</h2><div className="detail-grid"><p><b>Status da tela</b>{STATUS_LABELS[selected.portalStatus]}</p><p><b>Última comunicação</b>{formatRelativeCommunication(lastCommunication(selected), now)}</p><p><b>Status da telemetria</b>{telemetryLabel(selected, now)}</p><p><b>Vinculada desde</b>{linkedAtForScreen(selected, bindings) ? new Date(timestampMs(linkedAtForScreen(selected, bindings))).toLocaleString("pt-BR") : EMPTY}</p><p><b>Tempo ativo</b>{selected.telemetry?.schemaVersion >= 3 && measured(selected.telemetry?.session?.uptimeSeconds) ? fmtDuration(Number(selected.telemetry.session.uptimeSeconds) * 1000) : EMPTY}</p><p><b>Estado do Player</b>{selected.telemetry?.player?.state || EMPTY}</p><p><b>Conectividade</b>{selected.telemetry?.schemaVersion >= 3 ? selected.telemetry?.current?.networkStatus || EMPTY : EMPTY}</p><p><b>Último heartbeat</b>{selected.telemetry?.schemaVersion >= 3 && timestampMs(selected.telemetry?.session?.lastHeartbeatAt) ? formatRelativeCommunication(selected.telemetry.session.lastHeartbeatAt, now) : EMPTY}</p><p><b>Último dado de telemetria</b>{timestampMs(selected.telemetryUpdatedAt) ? formatRelativeCommunication(selected.telemetryUpdatedAt, now) : "Aguardando dados"}</p><p><b>Versão do app</b>{appVersion(selected)}</p><p><b>Origem atual</b>{sourceMeta(selected, now).label}</p><p><b>Cache</b>{cacheStatus(selected) ? `${cacheLabel(selected)} ${selected.cachedItems || 0}/${selected.totalCacheableItems || 0}` : cacheLabel(selected)}</p><p><b>Dispositivo</b>{bindingForScreen(selected, bindings)?.deviceId || selected.connectedDeviceId || selected.activeDeviceId || EMPTY}</p><p><b>Item atual</b>{selected.nowPlayingIndex && selected.nowPlayingTotal ? `${selected.nowPlayingIndex}/${selected.nowPlayingTotal}` : EMPTY}</p></div><h3>Tráfego e cache</h3><div className="detail-grid"><p title="Inclui Firebase, APIs, downloads, mídia remota e dados dinâmicos."><b>Internet utilizada pelo aplicativo</b>{trafficSnapshot(selected) ? trafficSnapshot(selected).networkMeasurementSupported ? formatBytes(trafficSnapshot(selected).appInternetReceivedBytes) : "Indisponível" : "Não instrumentado"}</p><p><b>Reutilizado do cache</b>{trafficValue(selected, "localMediaReusedBytes")}</p><p><b>Tráfego evitado</b>{trafficValue(selected, "trafficAvoidedBytes")}</p><p><b>Cache hit rate</b>{trafficSnapshot(selected) ? trafficSnapshot(selected).cacheHitRate === null ? "Sem reproduções cacheáveis" : `${(trafficSnapshot(selected).cacheHitRate * 100).toLocaleString("pt-BR", { maximumFractionDigits:1 })}%` : "Não instrumentado"}</p><p><b>Downloads de mídia</b>{trafficValue(selected, "mediaDownloadedBytes")}</p></div><h3>Eventos recentes</h3><div className="telemetry-events"><p className="empty-copy">A telemetria envia contadores agregados, sem logs individuais de reprodução.</p></div></div>}
  </section>;
}
