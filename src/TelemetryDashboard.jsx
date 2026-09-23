import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const fmtBytes = (value = 0) => {
  const bytes = Number(value || 0);
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / (1024 ** index)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${units[index]}`;
};
const fmtDuration = (value = 0) => {
  const minutes = Math.floor(Number(value || 0) / 60000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes} min`;
};
const timestampMs = (value) => value?.toMillis?.() || (value?.seconds ? value.seconds * 1000 : Date.parse(value || ""));
const statusOf = (screen) => Date.now() - timestampMs(screen.lastSeenAt) < 45_000 ? "ONLINE" : screen.telemetry ? "OFFLINE" : "UNKNOWN";
const sourceLabel = (source) => ({ CACHE_LOCAL: "LOCAL", INTERNET_FALLBACK: "REMOTO", DOWNLOADING_TO_CACHE: "PREPARANDO" }[source] || source || "UNKNOWN");

export default function TelemetryDashboard() {
  const [clients, setClients] = useState([]);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("today");
  const [clientId, setClientId] = useState("all");
  const [screenId, setScreenId] = useState("all");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [version, setVersion] = useState("all");
  const [selected, setSelected] = useState(null);
  const [config, setConfig] = useState({ enabled: false, clientIds: [], screenIds: [], deviceIds: [], syncIntervalMs: 300000 });
  const [configDraft, setConfigDraft] = useState("");
  const [configSaving, setConfigSaving] = useState(false);

  useEffect(() => {
    const screenUnsubs = [];
    const unsubscribe = onSnapshot(collection(db, "clients"), (snapshot) => {
      screenUnsubs.splice(0).forEach((stop) => stop());
      const nextClients = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      setClients(nextClients);
      setScreens([]);
      nextClients.forEach((client) => {
        screenUnsubs.push(onSnapshot(collection(db, "clients", client.id, "screens"), (screenSnapshot) => {
          const rows = screenSnapshot.docs.map((item) => ({ id: item.id, clientId: client.id, clientName: client.name, ...item.data() }));
          setScreens((current) => [...current.filter((row) => row.clientId !== client.id), ...rows]);
          setLoading(false);
        }, (reason) => { setError(reason.message); setLoading(false); }));
      });
      if (!nextClients.length) setLoading(false);
    }, (reason) => { setError(reason.message); setLoading(false); });
    return () => { unsubscribe(); screenUnsubs.forEach((stop) => stop()); };
  }, []);

  useEffect(() => onSnapshot(doc(db, "settings", "telemetry2a2c"), (snapshot) => {
    const next = snapshot.exists() ? snapshot.data() : { enabled: false, clientIds: [], screenIds: [], deviceIds: [], syncIntervalMs: 300000 };
    setConfig(next);
    setConfigDraft((next.screenIds || []).join("\n"));
  }), []);

  async function savePilotConfig(nextEnabled = config.enabled) {
    setConfigSaving(true);
    try {
      await setDoc(doc(db, "settings", "telemetry2a2c"), {
        enabled: nextEnabled,
        clientIds: Array.isArray(config.clientIds) ? config.clientIds : [],
        deviceIds: Array.isArray(config.deviceIds) ? config.deviceIds : [],
        screenIds: configDraft.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean),
        syncIntervalMs: Math.max(60000, Number(config.syncIntervalMs || 300000)),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } finally { setConfigSaving(false); }
  }

  const versions = useMemo(() => [...new Set(screens.map((item) => item.telemetry?.session?.appVersion).filter(Boolean))], [screens]);
  const filtered = screens.filter((item) => {
    const telemetry = item.telemetry;
    if (!telemetry) return clientId === "all" && screenId === "all" && status === "all" && source === "all" && version === "all";
    return (clientId === "all" || item.clientId === clientId)
      && (screenId === "all" || item.id === screenId)
      && (status === "all" || statusOf(item) === status)
      && (source === "all" || telemetry.current?.mediaSource === source)
      && (version === "all" || telemetry.session?.appVersion === version);
  });
  const totals = filtered.reduce((sum, item) => {
    const counters = item.telemetry?.counters || {};
    Object.keys(sum).forEach((key) => { sum[key] += Number(counters[key] || 0); });
    return sum;
  }, { localPlaybackCount: 0, remotePlaybackCount: 0, bytesDownloaded: 0, estimatedTrafficSaved: 0, displayTimeMs: 0, cacheHits: 0, cacheMisses: 0, downloadCompleted: 0, playbackErrors: 0, downloadTimeouts: 0 });
  const online = filtered.filter((item) => statusOf(item) === "ONLINE").length;
  const cacheRate = totals.cacheHits + totals.cacheMisses ? Math.round(totals.cacheHits * 100 / (totals.cacheHits + totals.cacheMisses)) : 0;

  if (loading) return <section className="telemetry-page"><div className="telemetry-state">Carregando telemetria…</div></section>;
  if (error) return <section className="telemetry-page"><div className="telemetry-state error">Erro de backend: {error}</div></section>;

  return <section className="telemetry-page">
    <header className="telemetry-hero"><div><span>Monitoramento 2A.2-C</span><h1>Telemetria operacional</h1><p>Player, cache e tráfego em uma visão agregada.</p></div><div className="telemetry-live"><i />Dados agregados</div></header>
    <div className="telemetry-filters">
      <select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="today">Hoje</option><option value="7d">7 dias</option><option value="30d">30 dias</option><option value="custom">Personalizado</option></select>
      <select value={clientId} onChange={(e) => { setClientId(e.target.value); setScreenId("all"); }}><option value="all">Todos os clientes</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select value={screenId} onChange={(e) => setScreenId(e.target.value)}><option value="all">Todas as telas</option>{screens.filter((item) => clientId === "all" || item.clientId === clientId).map((item) => <option key={item.id} value={item.id}>{item.name || item.code || item.id}</option>)}</select>
      <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Todos os status</option><option>ONLINE</option><option>OFFLINE</option><option>UNKNOWN</option></select>
      <select value={source} onChange={(e) => setSource(e.target.value)}><option value="all">Todas as origens</option><option value="CACHE_LOCAL">Local</option><option value="INTERNET_FALLBACK">Remoto</option><option value="DOWNLOADING_TO_CACHE">Preparando</option></select>
      <select value={version} onChange={(e) => setVersion(e.target.value)}><option value="all">Todas as versões</option>{versions.map((item) => <option key={item}>{item}</option>)}</select>
    </div>
    <details className="telemetry-config"><summary>Ativação piloto <b>{config.enabled ? "ATIVA" : "DESATIVADA"}</b></summary><p>A coleta só funciona quando a flag está ativa e o dispositivo corresponde a uma allowlist.</p><label>Screen IDs piloto<textarea value={configDraft} onChange={(e) => setConfigDraft(e.target.value)} placeholder="Um screenId por linha" /></label><div><button disabled={configSaving} onClick={() => savePilotConfig(config.enabled)}>Salvar allowlist</button><button className={config.enabled ? "danger" : "enable"} disabled={configSaving} onClick={() => savePilotConfig(!config.enabled)}>{config.enabled ? "Desativar telemetria" : "Ativar somente allowlist"}</button></div></details>
    {!screens.some((item) => item.telemetry) ? <div className="telemetry-state"><strong>Telemetria desativada ou sem dados</strong><span>A ausência de dados é diferente de zero bytes. Ative somente dispositivos piloto pela allowlist.</span></div> : <>
      <div className="telemetry-kpis">
        <article className="primary"><span>Telas online</span><strong>{online}</strong><small>{filtered.length - online} offline/sem comunicação</small></article>
        <article><span>Tráfego</span><strong>{fmtBytes(totals.bytesDownloaded)}</strong><small>{period === "today" ? "acumulado disponível" : "snapshots disponíveis"}</small></article>
        <article className="saving"><span>Economia estimada</span><strong>{fmtBytes(totals.estimatedTrafficSaved)}</strong><small>baseada em reproduções locais</small></article>
        <article><span>Cache hit rate</span><strong>{cacheRate}%</strong><small>{totals.cacheHits} hits / {totals.cacheMisses} misses</small></article>
        <article><span>Tempo de exibição</span><strong>{fmtDuration(totals.displayTimeMs)}</strong><small>uptime do Player</small></article>
        <article><span>Erros / timeouts</span><strong>{totals.playbackErrors} / {totals.downloadTimeouts}</strong><small>{totals.downloadCompleted} downloads concluídos</small></article>
      </div>
      <div className="telemetry-bars"><h2>Local First</h2><div><span style={{ width: `${Math.max(4, totals.localPlaybackCount * 100 / Math.max(1, totals.localPlaybackCount + totals.remotePlaybackCount))}%` }} />Local: {totals.localPlaybackCount}</div><div className="remote"><span style={{ width: `${Math.max(4, totals.remotePlaybackCount * 100 / Math.max(1, totals.localPlaybackCount + totals.remotePlaybackCount))}%` }} />Remota: {totals.remotePlaybackCount}</div></div>
      <div className="telemetry-table"><div className="head"><span>Tela</span><span>Status</span><span>Origem</span><span>Sessão</span><span>Tráfego</span><span>Cache</span><span>Versão</span><span>Erros</span></div>{filtered.map((item) => { const t=item.telemetry; const c=t?.counters||{}; const state=statusOf(item); return <button key={`${item.clientId}-${item.id}`} onClick={() => setSelected(item)}><span><strong>{item.name || item.code || item.id}</strong><small>{item.clientName}</small></span><span className={`status ${state.toLowerCase()}`}>{state}</span><span className={`source ${(t?.current?.mediaSource||"unknown").toLowerCase()}`}>{sourceLabel(t?.current?.mediaSource)}</span><span>{fmtDuration(c.displayTimeMs)}</span><span>{fmtBytes(c.bytesDownloaded)}</span><span>{c.cacheHits || 0}/{c.cacheMisses || 0}</span><span>{t?.session?.appVersion || "Sem dados"}</span><span>{c.playbackErrors || 0}</span></button>; })}</div>
    </>}
    {selected && <div className="telemetry-detail"><button className="close" onClick={() => setSelected(null)}>Fechar</button><span>{selected.clientName}</span><h2>{selected.name || selected.code || selected.id}</h2><div className="detail-grid"><p><b>Status</b>{statusOf(selected)}</p><p><b>Origem atual</b>{sourceLabel(selected.telemetry?.current?.mediaSource)}</p><p><b>Modo</b>{selected.telemetry?.current?.operatingMode || "UNKNOWN"}</p><p><b>Última comunicação</b>{selected.lastSeenAt?.toDate?.().toLocaleString("pt-BR") || "Sem dados"}</p><p><b>Mídia atual</b>{selected.telemetry?.current?.mediaName || selected.telemetry?.current?.mediaId || "Sem dados"}</p><p><b>Playlist</b>{selected.telemetry?.current?.playlistId || "Sem dados"}</p><p><b>Waiting / stalled</b>{selected.telemetry?.counters?.waitingCount || 0} / {selected.telemetry?.counters?.stalledCount || 0}</p><p><b>Último erro</b>{selected.telemetry?.current?.lastError || "Nenhum"}</p></div><h3>Eventos recentes</h3><div className="telemetry-events">{(selected.telemetry?.lastPlayerEvents || []).slice(-20).reverse().map((event, index) => <div key={`${event.timestamp}-${index}`}><time>{new Date(event.timestamp).toLocaleTimeString("pt-BR")}</time><strong>{event.event}</strong><span>{event.mediaId || "—"} · {sourceLabel(event.mediaSource)}</span></div>)}</div></div>}
  </section>;
}
