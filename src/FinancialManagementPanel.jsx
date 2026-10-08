import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";
import { confirmFinancialReversion, previewFinancialReversion, reverseFinancialSettlement, settleFinancialInvoice } from "./financial-api";

const money = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(cents || 0) / 100);

export default function FinancialManagementPanel({ client }) {
  const [contracts, setContracts] = useState([]); const [invoices, setInvoices] = useState([]); const [preview, setPreview] = useState(null);
  const [operationalChangeConfirmed, setOperationalChangeConfirmed] = useState(false); const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  useEffect(() => {
    const stopContracts = onSnapshot(collection(db, "clients", client.id, "contracts"), (snapshot) => setContracts(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
    const stopInvoices = onSnapshot(query(collection(db, "clients", client.id, "invoices"), orderBy("dueDate", "desc")), (snapshot) => setInvoices(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
    return () => { stopContracts(); stopInvoices(); };
  }, [client.id]);
  async function run(key, action) { try { setBusy(key); setError(""); await action(); } catch (current) { setError(current.message || "Operação financeira não concluída."); } finally { setBusy(""); } }
  const activeContract = contracts.find((item) => item.id === client.activeContractId) || contracts.find((item) => item.status === "active");
  return <section className="financial-panel"><div className="financial-panel-header"><div><div className="kicker">Cobrança V1</div><h2>Gestão financeira</h2><p>{activeContract ? `Contrato ${activeContract.startDate} até ${activeContract.endDate}` : "Contrato financeiro ativo"}</p></div><button className="client-action" onClick={() => run("preview-reversion", async () => { setPreview(await previewFinancialReversion({ clientId: client.id })); setOperationalChangeConfirmed(false); })}>Prévia da reversão</button></div>
    {error && <p className="financial-error">{error}</p>}
    {preview && <div className="financial-preview"><h3>Prévia da reversão</h3><p>Estado financeiro: {preview.currentAccess.restriction} → legado: {preview.projectedAccess.restriction}</p><p>Mensalidades, contrato e auditoria serão preservados; `dueDate` não será alterado.</p>{preview.requiresOperationalChangeConfirmation && <label className="financial-confirm"><input type="checkbox" checked={operationalChangeConfirmed} onChange={(event) => setOperationalChangeConfirmed(event.target.checked)} /> Confirmo especificamente a mudança operacional de acesso.</label>}<button className="client-action warning" disabled={busy || (preview.requiresOperationalChangeConfirmation && !operationalChangeConfirmed)} onClick={() => run("reversion", () => confirmFinancialReversion({ previewToken: preview.previewToken, idempotencyKey: `reversion-${client.id}-${Date.now()}`, operationalChangeConfirmed }))}>Confirmar reversão não destrutiva</button></div>}
    <div className="financial-invoice-list">{invoices.map((invoice) => <article className="financial-invoice" key={invoice.id}><div><strong>{invoice.competence}</strong><span>{invoice.dueDate} · {money(invoice.amountCents)} · {invoice.status}</span></div><div>{invoice.status !== "paid" ? <button className="client-action primary" disabled={busy} onClick={() => run(invoice.id, () => settleFinancialInvoice({ clientId: client.id, invoiceId: invoice.id, idempotencyKey: `settle-${invoice.id}-${Date.now()}` }))}>Marcar como pago</button> : <button className="client-action warning" disabled={busy} onClick={() => { const reason = window.prompt("Motivo obrigatório para corrigir a quitação:"); if (reason) run(invoice.id, () => reverseFinancialSettlement({ clientId: client.id, invoiceId: invoice.id, idempotencyKey: `reverse-${invoice.id}-${Date.now()}`, reason })); }}>Corrigir quitação</button>}</div></article>)}</div>
  </section>;
}
