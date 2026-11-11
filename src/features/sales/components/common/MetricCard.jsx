import { ArrowRight } from 'lucide-react';

export default function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'default',
  trend = null,
  onClick = null,
  clickableHint = 'View details',
}) {
  const isClickable = typeof onClick === 'function';

  return (
    <div
      className={`metric-card metric-card-${variant} ${isClickable ? 'metric-card-clickable' : ''}`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {Icon && (
          <div className="metric-icon-box">
            <Icon size={18} className="metric-icon" />
          </div>
        )}
      </div>

      <div className="metric-value-row">
        <span className="metric-value">{value}</span>
      </div>

      <div className="metric-footer">
        {trend && (
          <span className={`metric-trend metric-trend-${trend.type || 'neutral'}`}>
            {trend.text}
          </span>
        )}
        {subtext && <span className="metric-subtext">{subtext}</span>}
        {isClickable && (
          <span className="metric-link-action">
            {clickableHint} <ArrowRight size={12} className="metric-link-arrow" />
          </span>
        )}
      </div>
    </div>
  );
}
