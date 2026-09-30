import { useEffect } from "react";
import { X } from "lucide-react";

export default function PreviewModal({ title = "Prévia ampliada", subtitle = "", logicalWidth, logicalHeight, onClose, children }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const ratio = logicalWidth > 0 && logicalHeight > 0 ? logicalWidth / logicalHeight : 16 / 9;

  return (
    <div className="portal-preview-modal" role="presentation" onMouseDown={onClose}>
      <section
        className="portal-preview-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <strong>{title}</strong>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <div className="portal-preview-modal-actions">
            <button type="button" onClick={onClose}>Fechar</button>
            <button type="button" className="icon" onClick={onClose} aria-label="Fechar prévia"><X /></button>
          </div>
        </header>
        <div
          className="portal-preview-modal-stage"
          style={{ "--preview-ratio": ratio, aspectRatio: `${logicalWidth} / ${logicalHeight}` }}
        >
          {children}
        </div>
      </section>
    </div>
  );
}
