export function Button({ children, onClick, variant = 'primary', disabled = false }) {
  return (
    <button
      className={`ds-button ds-button--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
