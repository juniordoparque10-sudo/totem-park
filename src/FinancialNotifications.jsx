import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { billingNotificationCopy } from "./financial-display";

export default function FinancialNotifications({ clientId }) {
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState({});
  const [error, setError] = useState("");
  useEffect(() => {
    const stopNotices = onSnapshot(query(collection(db, "clients", clientId, "financialNotifications"), where("status", "==", "active"), orderBy("createdAt", "desc")), (snapshot) => { setError(""); setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))); }, () => setError("Não foi possível carregar os avisos financeiros."));
    const stopInvoices = onSnapshot(collection(db, "clients", clientId, "invoices"), (snapshot) => setInvoices(Object.fromEntries(snapshot.docs.map((item) => [item.id, { id: item.id, ...item.data() }]))), () => setError("Não foi possível carregar os detalhes das mensalidades."));
    return () => { stopNotices(); stopInvoices(); };
  }, [clientId]);
  if (error) return <p className="financial-notice warning" role="status">{error}</p>;
  if (!items.length) return null;
  return <section className="financial-notifications" aria-label="Notificações financeiras"><h2>Avisos de cobrança</h2>{items.map((item) => { const copy = billingNotificationCopy(item, invoices[item.invoiceId]); return <article className={`financial-notice ${item.severity || "warning"}`} key={item.id}><strong>{copy.title}</strong><p>{copy.detail}</p></article>; })}</section>;
}
