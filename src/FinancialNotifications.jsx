import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "./firebase";

export default function FinancialNotifications({ clientId }) {
  const [items, setItems] = useState([]);
  useEffect(() => onSnapshot(query(collection(db, "clients", clientId, "financialNotifications"), where("status", "==", "active"), orderBy("createdAt", "desc")), (snapshot) => setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))), [clientId]);
  if (!items.length) return null;
  return <section className="financial-notifications" aria-label="Notificações financeiras"><h2>Avisos de cobrança</h2>{items.map((item) => <article className={`financial-notice ${item.severity || "warning"}`} key={item.id}><strong>{item.title}</strong><p>{item.message}</p></article>)}</section>;
}
