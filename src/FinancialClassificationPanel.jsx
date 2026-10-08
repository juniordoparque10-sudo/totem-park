import { useMemo, useRef, useState } from "react";
import { previewFinancialActivation, confirmFinancialActivation } from "./financial-api";
import { buildClassificationSuggestions, mergeUntouchedSuggestions } from "./billing-form-suggestions";

function moneyToCents(value) { return Math.round(Number(String(value).replace(",", ".")) * 100); }

export default function FinancialClassificationPanel({ client, planPriceMonthly }) {
  const touched = useRef({});
  const [form, setForm] = useState(() => {
    const billingPeriod = client.billing === "Anual" ? "annual" : "monthly";
    const startDate = client.startDate || "";
    return { startDate, billingPeriod, ...buildClassificationSuggestions({ client: { ...client, planPriceMonthly }, startDate, billingPeriod }) };
  });
  const [preview, setPreview] = useState(null);
  const [operationalChangeConfirmed, setOperationalChangeConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const payload = useMemo(() => ({ clientId: client.id, planKey: String(client.plan || "").toLowerCase(), planName: client.plan, startDate: form.startDate, endDate: form.endDate, billingPeriod: form.billingPeriod, billingAnchorDay: Number(form.billingAnchorDay), firstCompetence: form.firstCompetence, firstDueDate: form.firstDueDate, amountCents: moneyToCents(form.amount) }), [client, form]);

  function field(name, value) {
    touched.current[name] = true;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (!["startDate", "billingPeriod", "firstCompetence", "billingAnchorDay"].includes(name)) return next;
      const suggestions = buildClassificationSuggestions({
        client: { ...client, planPriceMonthly }, startDate: next.startDate, billingPeriod: next.billingPeriod,
        firstCompetence: touched.current.firstCompetence ? next.firstCompetence : undefined,
        billingAnchorDay: touched.current.billingAnchorDay ? next.billingAnchorDay : undefined,
      });
      return mergeUntouchedSuggestions(next, suggestions, touched.current);
    });
    setPreview(null); setOperationalChangeConfirmed(false);
  }
  async function requestPreview() { try { setBusy(true); setError(""); setPreview(await previewFinancialActivation(payload)); } catch (current) { setError(current.message || "Não foi possível calcular a prévia."); } finally { setBusy(false); } }
  async function confirm() { try { setBusy(true); setError(""); await confirmFinancialActivation({ previewToken: preview.previewToken, idempotencyKey: `activation-${client.id}-${Date.now()}`, operationalChangeConfirmed }); setPreview(null); } catch (current) { setError(current.message || "Não foi possível ativar o modelo financeiro."); } finally { setBusy(false); } }

  return <section className="financial-panel">
    <div className="financial-panel-header"><div><div className="kicker">Cobrança V1</div><h2>Classificar cliente</h2><p>O comportamento legado permanece ativo até a confirmação final.</p></div></div>
    <p className="financial-form-note">A vigência define por quanto tempo o contrato permanece válido. A periodicidade define quando as cobranças serão geradas durante esse período.</p>
    <div className="financial-form-grid">
      <label>Início do contrato<input type="date" value={form.startDate} onChange={(event) => field("startDate", event.target.value)} /></label>
      <label>Término do contrato<input type="date" value={form.endDate} onChange={(event) => field("endDate", event.target.value)} /></label>
      <label>Periodicidade<select value={form.billingPeriod} onChange={(event) => field("billingPeriod", event.target.value)}><option value="monthly">Mensal</option><option value="annual">Anual</option></select></label>
      <label>Dia de vencimento<input type="number" min="1" max="31" value={form.billingAnchorDay} onChange={(event) => field("billingAnchorDay", event.target.value)} /></label>
      <label>Primeira competência<input value={form.firstCompetence} onChange={(event) => field("firstCompetence", event.target.value)} /></label>
      <label>Primeiro vencimento<input type="date" value={form.firstDueDate} onChange={(event) => field("firstDueDate", event.target.value)} /></label>
      <label>Valor (R$)<input inputMode="decimal" value={form.amount} onChange={(event) => field("amount", event.target.value)} /></label>
    </div>
    <button className="client-action primary" disabled={busy} onClick={requestPreview}>Gerar prévia</button>
    {error && <p className="financial-error">{error}</p>}
    {preview && <div className="financial-preview"><h3>Prévia da ativação</h3><p>Contrato: {preview.normalizedContract.startDate} até {preview.normalizedContract.endDate}</p><p>Primeira cobrança: {preview.firstInvoice.competence} · {preview.firstInvoice.dueDate}</p><p>Calendário inicial: {(preview.upcomingInvoices || [preview.firstInvoice]).map((item) => `${item.competence} em ${item.dueDate}`).join("; ")}</p><p>Estado atual: {preview.currentAccess.restriction} → após ativação: {preview.projectedAccess.restriction}</p><p>Nenhuma competência anterior será criada.</p>
      {preview.requiresOperationalChangeConfirmation && <label className="financial-confirm"><input type="checkbox" checked={operationalChangeConfirmed} onChange={(event) => setOperationalChangeConfirmed(event.target.checked)} /> Confirmo especificamente a mudança operacional de acesso indicada acima.</label>}
      <button className="client-action primary" disabled={busy || (preview.requiresOperationalChangeConfirmation && !operationalChangeConfirmed)} onClick={confirm}>Confirmar ativação</button>
    </div>}
  </section>;
}
