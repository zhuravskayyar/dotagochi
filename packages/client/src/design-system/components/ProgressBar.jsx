export function ProgressBar({ value, label, iconSrc, tone = 'health', max = 100 }) {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  const percent = Math.round((clamped / max) * 100);
  const state = percent < 30 ? 'is-low' : percent < 60 ? 'is-mid' : '';
  return (
    <div className={`stat-block stat-block--${tone}`}>
      <img className="stat-icon" src={iconSrc} alt="" />
      <div className="stat-content">
        <div className="stat-heading"><span>{label}</span></div>
        <div className="stat-track">
          <div className={`stat-fill ${state}`} style={{ width: `${percent}%` }}><i /></div>
          <strong className="stat-value">{clamped} / {max}</strong>
        </div>
      </div>
    </div>
  );
}
