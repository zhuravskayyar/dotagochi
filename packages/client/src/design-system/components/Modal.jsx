export function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
