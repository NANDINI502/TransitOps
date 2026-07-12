import './StatCard.css';

export default function StatCard({ label, value, accent = 'default', suffix, hint }) {
  return (
    <div className={`stat-card stat-card--${accent}`}>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">
        {value}
        {suffix ? <span className="stat-card__suffix">{suffix}</span> : null}
      </div>
      {hint ? <div className="stat-card__hint">{hint}</div> : null}
    </div>
  );
}
