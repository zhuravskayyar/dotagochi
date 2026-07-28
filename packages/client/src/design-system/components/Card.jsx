export function Card({ children, className = '' }) {
  return <div className={`ds-card ${className}`}>{children}</div>;
}
