import { useState } from 'react';
import { SALES_TREND_DATA } from '../../data/mockData';
import { formatINR } from '../../utils/formatters';

export default function SalesTrendChart({
  period = null,
  hideHeader = false,
  compact = true,
}) {
  const [internalPeriod, setInternalPeriod] = useState('This Month');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const activePeriod = period || internalPeriod;
  const data = SALES_TREND_DATA[activePeriod] || SALES_TREND_DATA['This Month'] || [];

  // Compact SVG chart sizing
  const width = 640;
  const height = compact ? 155 : 200;
  const padding = { top: 14, right: 24, bottom: 32, left: 56 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxSales = Math.max(...data.map((d) => d.sales || 0), 100000);
  const yAxisMax = Math.ceil(maxSales / 100000) * 100000;

  // Compute point coordinates
  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.sales || 0) / yAxisMax) * chartHeight;
    return { ...d, x, y };
  });

  // SVG path for line
  const linePath = points.reduce((path, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
  }, '');

  // SVG path for area fill
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
    : '';

  // Y-axis grid ticks (3 intervals for clean, compact readability)
  const yTicks = [0, yAxisMax * 0.5, yAxisMax];

  return (
    <div className={`chart-card ${compact ? 'chart-compact' : ''}`} style={{ border: hideHeader ? 'none' : undefined, padding: hideHeader ? 0 : undefined, background: 'transparent' }}>
      {!hideHeader && (
        <div className="chart-header" style={{ marginBottom: '8px' }}>
          <div>
            <h4 className="chart-title" style={{ fontSize: '13px', fontWeight: '700' }}>Sales Performance Trend</h4>
            <p className="chart-subtitle" style={{ fontSize: '11px', color: '#64748b' }}>Revenue and order volume over time</p>
          </div>

          {!period && (
            <div className="chart-period-tabs">
              {['This Week', 'This Month', 'Last 3 Months'].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`period-tab-btn ${activePeriod === p ? 'active' : ''}`}
                  onClick={() => {
                    setInternalPeriod(p);
                    setHoveredIndex(null);
                  }}
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="chart-svg-container" style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="chart-svg"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', maxHeight: compact ? '160px' : '200px' }}
        >
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y-axis labels */}
          {yTicks.map((val, idx) => {
            const yPos = padding.top + chartHeight - (val / yAxisMax) * chartHeight;
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="#f1f5f9"
                  strokeDasharray={idx === 0 ? '' : '3 3'}
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                  fontWeight="500"
                >
                  {val >= 100000 ? `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L` : formatINR(val)}
                </text>
              </g>
            );
          })}

          {/* Area fill under curve */}
          {areaPath && <path d={areaPath} fill="url(#salesGradient)" />}

          {/* Trend line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data point dots and X-axis labels */}
          {points.map((pt, i) => (
            <g key={i}>
              <line
                x1={pt.x}
                y1={padding.top + chartHeight}
                x2={pt.x}
                y2={padding.top + chartHeight + 4}
                stroke="#cbd5e1"
              />
              <text
                x={pt.x}
                y={padding.top + chartHeight + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
                fontWeight={hoveredIndex === i ? '700' : '500'}
              >
                {pt.label}
              </text>

              {/* Hover indicator line */}
              {hoveredIndex === i && (
                <line
                  x1={pt.x}
                  y1={padding.top}
                  x2={pt.x}
                  y2={padding.top + chartHeight}
                  stroke="#93c5fd"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
              )}

              {/* Data circle */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === i ? 5 : 3.5}
                fill={hoveredIndex === i ? '#1d4ed8' : '#ffffff'}
                stroke="#2563eb"
                strokeWidth={hoveredIndex === i ? 2.5 : 2}
                style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: `${Math.min(80, Math.max(20, (points[hoveredIndex].x / width) * 100))}%`,
              transform: 'translateX(-50%)',
              background: '#0f172a',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
              pointerEvents: 'none',
              zIndex: 10,
              whiteSpace: 'nowrap',
            }}
          >
            <strong>{points[hoveredIndex].label}</strong>: {formatINR(points[hoveredIndex].sales)} ({points[hoveredIndex].orders || 0} orders)
          </div>
        )}
      </div>
    </div>
  );
}
