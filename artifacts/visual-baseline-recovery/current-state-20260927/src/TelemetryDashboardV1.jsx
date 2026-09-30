import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { bindingForScreen, linkedAtForScreen, measured, screenStatus, telemetryStatus, timestampMs } from "./telemetry-v1";

const emptyConfig = { enabled: false, clientIds: [], screenIds: [], deviceIds: [], syncIntervalMs: 300000 };
const dateText = (value) => { const ms = timestampMs(value); return ms === null ? "—" : new Date(ms).toLocaleString("pt-BR"); };
const durationText = (value) => {
  if (!measured(value)) return "—";
  const minutes = Math.floor(Number(value) / 60000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
};
const elapsedText = (value) => {
  const ms = timestampMs(value);
  if (ms === null) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  return seconds < 60 ? `há ${seconds} s` : seconds < 3600 ? `há ${Math.floor(seconds / 60)} min` : dateText(value);
};
const periodStart = (period) => period === "today" ? new Date().setHours(0, 0, 0, 0)
  : Date.now() - (period === "7d" ? 7 : 30) * 86400000;
const sumKnown = (rows, key) => {
  const values = rows.map((row) => row.telemetry?.counters?.[key]).filter(measured);
  return values.length ? values.reduce((sum, value) => sum + Number(value), 0) : null;
};
function Field({ label, children }) { return <p><b>{label}</b>{children ?? "—"}</p>; }

export default function TelemetryDashboardV1({ focusScreen }) {
  const [clients, setClients] = useState([]);
  const [screens, setScreens] = useState([]);
  const [bindings, setBindings] = useState([]);
  const [config, setConfig] = useState(emptyConfig);
  const [configDraft, setConfigDraft] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [configError, setConfigError] = useState("");
  const [period, setPeriod] = useState("today");
  const [clientId, setClientId] = useState("all");
  const [screenId, setScreenId] = useState("all");
  const [status, setStatus] = useState("all");
  const [version, setVersion] = useState("all");
  const [selectedKey, setSelectedKey] = useState(() => focusScreen ? `${focusScreen.clientId}/${focusScreen.id}` : null);

  useEffect(() => {
    const screenUnsubs = [];
    const stop = onSnapshot(collection(db, "clients"), (snapshot) => {
      screenUnsubs.splice(0).forEach((unsubscribe) => unsubscribe());
      const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
      setClients(next);
      setScreens([]);
      next.forEach((client) => screenUnsubs.push(onSnapshot(collection(db, "clients", client.id, "screens"), (rows) => {
        const data = rows.docs.map((item) => ({ ...item.data(), id: item.id, clientId: client.id, clientName: client.name }));
        setScreens((current) => [...current.filter((row) => row.clientId !== client.id), ...data]);
        setLoading(false);
      }, (reason) => { setError(reason.message); setLoading(false); })));
      if (!next.length) setLoading(false);
    }, (reason) => { setError(reason.message); setLoading(false); });
    return () => { stop(); screenUnsubs.forEach((unsubscribe) => unsubscribe()); };
  }, []);
  useEffect(() => onSnapshot(collection(db, "playerDeviceBindings"), (snapshot) => {
    setBindings(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, () => setBindings([])), []);
  useEffect(() => onSnapshot(doc(db, "settings", "telemetry2a2c"), (snapshot) => {
    const next = snapshot.exists() ? { ...emptyConfig, ...snapshot.data() } : emptyConfig;
    setConfig(next);
    setConfigDraft((next.screenIds || []).join("\n"));
    setConfigError("");
  }, (reason) => setConfigError(reason.message)), []);
  async function saveConfig(enabled) {
    setConfigSaving(true);
    try {
      await setDoc(doc(db, "settings", "telemetry2a2c"), {
        enabled,
        clientIds: Array.isArray(config.clientIds) ? config.clientIds : [],
        deviceIds: Array.isArray(config.deviceIds) ? config.deviceIds : [],
        screenIds: configDraft.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean),
        syncIntervalMs: Math.max(60000, Number(config.syncIntervalMs || 300000)),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (reason) { setConfigError(reason.message); }
    finally { setConfigSaving(false); }
  }

  const versions = useMemo(() => [...new Set(screens.map((item) => item.telemetry?.session?.appVersion).filter(Boolean))].sort(), [screens]);
  const filtered = screens.filter((item) => (clientId === "all" || item.clientId === clientId)
    && (screenId === "all" || item.id === screenId)
    && (status === "all" || screenStatus(item) === status)
    && (version === "all" || item.telemetry?.session?.appVersion === version))
    .sort((a, b) => String(a.clientName || "").localeCompare(String(b.clientName || ""), "pt-BR")
      || String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
  const selected = screens.find((item) => `${item.clientId}/${item.id}` === selectedKey);
  const inPeriod = filtered.filter((item) => item.telemetry && timestampMs(item.telemetryUpdatedAt) >= periodStart(period));
  const count = (predicate) => filtered.filter(predicate).length;
  const online = count((item) => screenStatus(item) === "ONLINE");
  const attention = count((item) => screenStatus(item) === "ATENÇÃO");
  const offline = filtered.length - online - attention;
  const activeTelemetry = count((item) => telemetryStatus(item, config) === "ATIVA");
  const awaitingSignal = count((item) => telemetryStatus(item, config) === "AGUARDANDO PRIMEIRO SINAL");
  const versionCounts = [...new Map(filtered.map((item) => item.telemetry?.session?.appVersion).filter(Boolean)
    .map((appVersion) => [appVersion, filtered.filter((item) => item.telemetry?.session?.appVersion === appVersion).length])).entries()];

  if (loading) return <section className="telemetry-page"><div className="telemetry-state">Carregando telemetria…</div></section>;
  if (error) return <section className="telemetry-page"><div className="telemetry-state error">ERRO DE LEITURA: {error}</div></section>;

  return <section className="telemetry-page">
    <header className="telemetry-hero"><div><span>Monitoramento 2A.2-C</span><h1>Telemetria operacional</h1></div><div className="telemetry-live"><i />{config.enabled ? "Piloto ativo" : "Telemetria desativada"}</div></header>
    {configError && <div className="telemetry-state error">ERRO DE LEITURA: {configError}</div>}
    <div className="telemetry-filters">
      <select aria-label="Período" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="today">Hoje</option><option value="7d">7 dias</option><option value="30d">30 dias</option></select>
      <select aria-label="Cliente" value={clientId} onChange={(event) => { setClientId(event.target.value); setScreenId("all"); }}><option value="all">Todos os clientes</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select aria-label="Tela" value={screenId} onChange={(event) => setScreenId(event.target.value)}><option value="all">Todas as telas</option>{screens.filter((item) => clientId === "all" || item.clientId === clientId).map((item) => <option key={`${item.clientId}/${item.id}`} value={item.id}>{item.name || item.code || item.id}</option>)}</select>
      <select aria-label="Status da tela" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos os status</option><option>ONLINE</option><option>ATENÇÃO</option><option>OFFLINE</option></select>
      <select aria-label="Versão" value={version} onChange={(event) => setVersion(event.target.value)}><option value="all">Todas as versões</option>{versions.map((item) => <option key={item}>{item}</option>)}</select>
    </div>
    <details className="telemetry-config"><summary>Ativação piloto <b>{config.enabled ? "ATIVA" : "DESATIVADA"}</b></summary><p>A coleta requer flag ativa e correspondência exata na allowlist. Alterações são manuais.</p><label>Screen IDs piloto<textarea value={configDraft} onChange={(event) => setConfigDraft(event.target.value)} placeholder="Um screenId por linha" /></label><div><button disabled={configSaving} onClick={() => saveConfig(config.enabled)}>Salvar allowlist</button><button className={config.enabled ? "danger" : "enable"} disabled={configSaving} onClick={() => saveConfig(!config.enabled)}>{config.enabled ? "Desativar telemetria" : "Ativar somente allowlist"}</button></div></details>
    <div className="telemetry-kpis">
      <article className="primary"><span>Telas online</span><strong>{online}</strong></article>
      <article><span>Telas em atenção</span><strong>{attention}</strong></article>
      <article><span>Telas offline</span><strong>{offline}</strong></article>
      <article><span>Telemetria ativa</span><strong>{activeTelemetry}</strong></article>
      <article><span>Aguardando sinal</span><strong>{awaitingSignal}</strong></article>
      <article><span>Tempo ativo</span><strong>{durationText(sumKnown(inPeriod.filter((item) => item.telemetry?.schemaVersion >= 3), "activeTimeMs"))}</strong><small>sessões disponíveis no período</small></article>
    </div>
    <div className="telemetry-visuals" aria-label="Gráficos de telemetria">
      <section className="telemetry-chart"><h2>Status das telas</h2><div className="telemetry-status-bars" aria-label={`${online} online, ${attention} em atenção, ${offline} offline`}><span className="online" style={{ width: `${online * 100 / Math.max(1, filtered.length)}%` }} /><span className="attention" style={{ width: `${attention * 100 / Math.max(1, filtered.length)}%` }} /><span className="offline" style={{ width: `${offline * 100 / Math.max(1, filtered.length)}%` }} /></div><p>{online} online <i>·</i> {attention} atenção <i>·</i> {offline} offline</p></section>
      <section className="telemetry-chart"><h2>Versões instaladas</h2>{versionCounts.length ? versionCounts.map(([appVersion, total]) => <p className="telemetry-version" key={appVersion}><span title={appVersion}>{appVersion}</span><b>{total}</b></p>) : <p className="telemetry-chart-empty">—</p>}</section>
      <section className="telemetry-chart"><h2>Origem da reprodução</h2><p className="telemetry-chart-empty">Não instrumentado</p></section>
      <section className="telemetry-chart"><h2>Tráfego e cache</h2><p className="telemetry-chart-empty">Não instrumentado</p></section>
      <section className="telemetry-chart"><h2>Tempo de exibição</h2><p className="telemetry-chart-empty">Não instrumentado</p></section>
      <section className="telemetry-chart"><h2>Transferências</h2><p className="telemetry-chart-empty">Não instrumentado</p></section>
    </div>
    {!inPeriod.length && <div className="telemetry-state"><strong>SEM DADOS NO PERÍODO</strong><span>As telas continuam listadas. Dados ausentes não são exibidos como zero.</span></div>}
    <div className="telemetry-table telemetry-v1-table"><div className="head"><span>Tela</span><span>Status da tela</span><span>Telemetria</span><span>Origem</span><span>Tempo ativo</span><span>Último sinal</span><span>Vinculada desde</span><span>Erros</span></div>{filtered.map((item) => <button key={`${item.clientId}/${item.id}`} onClick={() => setSelectedKey(`${item.clientId}/${item.id}`)}><span><strong>{item.name || item.code || item.id}</strong><small>{item.clientName}</small></span><span className={`status ${screenStatus(item).toLowerCase()}`}>{screenStatus(item)}</span><span className="telemetry-flag" title={telemetryStatus(item, config)}>{telemetryStatus(item, config)}</span><span title="Origem não instrumentada">—</span><span>{durationText(item.telemetry?.schemaVersion >= 3 ? item.telemetry?.counters?.activeTimeMs : null)}</span><span>{elapsedText(item.telemetry?.schemaVersion >= 3 ? item.telemetryUpdatedAt : item.lastSeenAt)}</span><span>{dateText(linkedAtForScreen(item, bindings))}</span><span title="Erros de mídia não instrumentados">—</span></button>)}</div>
    {selected && <div className="telemetry-detail" role="dialog" aria-label="Detalhe da tela"><button className="close" onClick={() => setSelectedKey(null)}>Fechar</button><span>{selected.clientName}</span><h2>{selected.name || selected.code || selected.id}</h2>
      <h3>Identificação</h3><div className="detail-grid"><Field label="screenId">{selected.id}</Field><Field label="deviceId">{bindingForScreen(selected, bindings)?.deviceId || selected.connectedDeviceId || "—"}</Field><Field label="Vínculo">{bindingForScreen(selected, bindings) ? "ACTIVE" : "Sem vínculo ativo confirmado"}</Field><Field label="Versão do app">{selected.telemetry?.session?.appVersion || "—"}</Field><Field label="Tela vinculada desde">{dateText(linkedAtForScreen(selected, bindings))}</Field></div>
      <h3>Status</h3><div className="detail-grid"><Field label="Tela">{screenStatus(selected)}</Field><Field label="Conectividade">{selected.telemetry?.schemaVersion >= 3 ? selected.telemetry?.current?.connectionStatus : "—"}</Field><Field label="Última comunicação">{dateText(selected.telemetry?.schemaVersion >= 3 ? selected.telemetryUpdatedAt : selected.lastSeenAt)}</Field><Field label="Último sinal">{dateText(selected.telemetry?.schemaVersion >= 3 ? selected.telemetry?.current?.lastSignalAt : null)}</Field><Field label="Sessão">{selected.telemetry?.session?.sessionId || "—"}</Field><Field label="Início da sessão">{dateText(selected.telemetry?.session?.startedAt)}</Field><Field label="Tempo ativo">{durationText(selected.telemetry?.schemaVersion >= 3 ? selected.telemetry?.counters?.activeTimeMs : null)}</Field></div>
      <h3>Reprodução</h3><div className="detail-grid">{["Origem", "Playing", "Waiting / stalled", "Erros", "Último erro", "Cache hit", "Tráfego evitado"].map((label) => <Field key={label} label={label}>Não instrumentado</Field>)}</div>
      <h3>Telemetria</h3><div className="detail-grid"><Field label="Status">{telemetryStatus(selected, config)}</Field><Field label="Último checkpoint">{dateText(selected.telemetryUpdatedAt)}</Field><Field label="Sessão de telemetria">{selected.telemetry?.session?.sessionId || "—"}</Field></div>
      <h3>Telemetria avançada</h3><div className="detail-grid">{["Cache Hit Rate", "Tráfego consumido", "Tráfego evitado", "Downloads", "Falhas de cache", "Cache parcial", "Economia estimada"].map((label) => <Field key={label} label={label}>Não instrumentado</Field>)}</div>
      <h3>Eventos de mídia</h3><div className="telemetry-events">Não instrumentado</div>
    </div>}
  </section>;
}
