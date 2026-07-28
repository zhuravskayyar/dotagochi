export function ProgressBar({ value, label }) {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="ds-progress">
      {label && <span className="ds-progress__label">{label}</span>}
      <div className="ds-progress__track">
        <div className="ds-progress__fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
