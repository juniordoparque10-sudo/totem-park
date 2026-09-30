import { useEffect } from "react";

export default function PortalModal({ title, message, details = [], confirmLabel = "Entendi", danger = false, onConfirm, onClose }) {
  useEffect(() => {
    const handleKey = (event) => { if (event.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return <div className="portal-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
    <section className="portal-modal" role="dialog" aria-modal="true" aria-labelledby="portal-modal-title">
      <button type="button" className="portal-modal-close" aria-label="Fechar" onClick={onClose}>×</button>
      <div className="portal-modal-icon">▣</div>
      <h2 id="portal-modal-title">{title}</h2>
      <p>{message}</p>
      {details.length > 0 && <ul>{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
      <div className="portal-modal-actions">
        {onConfirm && onClose && <button type="button" className="client-action" onClick={onClose}>Cancelar</button>}
        <button type="button" className={danger ? "client-action danger" : "client-action primary"} onClick={onConfirm || onClose}>{confirmLabel}</button>
      </div>
    </section>
  </div>;
}
