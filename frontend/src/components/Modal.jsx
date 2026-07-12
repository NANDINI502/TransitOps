import { useEffect } from 'react';
import './Modal.css';

export default function Modal({ open, onClose, title, children, footer, variant = 'modal', width }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className={`modal-panel modal-panel--${variant}`}
        style={width ? { width } : undefined}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-panel__header">
          <h3>{title}</h3>
          <button className="modal-panel__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-panel__body">{children}</div>
        {footer ? <div className="modal-panel__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
