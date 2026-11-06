import { useState } from 'react';
import { formatINR } from '../../utils/formatters';
import { Info } from 'lucide-react';

export default function PerformanceTrendChart({
  data = [],
  year = 2026,
  onDrilldown = null,
}) {
  const [metric, setMetric] = useState('sales'); // 'sales' | 'salesQty' | 'quotationsGenerated' | 'quotationsConverted' | 'ordersWon' | 'quotationsLost'
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const METRIC_CONFIG = {
    sales: { label: 'Revenue Achieved (₹)', color: '#2563eb', isCurrency: true, unit: '₹' },
    salesQty: { label: 'Sales Quantity Achieved', color: '#0891b2', isCurrency: false, unit: 'Units' },
    quotationsGenerated: { label: 'Quotations Generated', color: '#6366f1', isCurrency: false, unit: 'Quotes' },
    quotationsConverted: { label: 'Quotations Converted to Orders', color: '#16a34a', isCurrency: false, unit: 'Quotes' },
    ordersWon: { label: 'Orders Won', color: '#10b981', isCurrency: false, unit: 'Orders' },
    quotationsLost: { label: 'Quotations Lost', color: '#dc2626', isCurrency: false, unit: 'Quotes' },
  };

  const currentConfig = METRIC_CONFIG[metric] || METRIC_CONFIG.sales;

  // Chart dimensions
  const width = 740;
  const height = 230;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d[metric] || 0);
  const maxVal = Math.max(...values, metric === 'sales' ? 100000 : 10);
  const yAxisMax = metric === 'sales' ? Math.ceil(maxVal / 100000) * 100000 : Math.ceil(maxVal / 5) * 5;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d[metric] || 0) / yAxisMax) * chartHeight;
    return { ...d, x, y, value: d[metric] || 0 };
  });

  const linePath = points.reduce((path, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
    : '';

  const yTicks = [0, yAxisMax * 0.5, yAxisMax];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Toolbar: Metric Selector and Interactive Help */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Selected Metric:</span>
          <select
            className="form-select"
            style={{ fontSize: '12px', padding: '4px 10px', minWidth: '220px', fontWeight: 600 }}
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="sales">Revenue Achieved (₹ Amount)</option>
            <option value="quotationsGenerated">Number of Quotations Generated</option>
            <option value="quotationsConverted">Quotations Converted to Confirmed Orders</option>
            <option value="ordersWon">Number of Orders Won</option>
            <option value="quotationsLost">Number of Quotations Lost</option>
            <option value="salesQty">Sales Quantity Achieved (Units)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b' }}>
          <Info size={13} className="text-primary" />
          <span>Click any month point on the chart to inspect its quotation cohort</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', minHeight: '190px' }}
        >
          <defs>
            <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={currentConfig.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={currentConfig.color} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Y-Axis Grid Lines & Labels */}
          {yTicks.map((val, idx) => {
            const yPos = padding.top + chartHeight - (val / yAxisMax) * chartHeight;
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="#e2e8f0"
                  strokeDasharray={idx === 0 ? 'none' : '3 3'}
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                >
                  {currentConfig.isCurrency
                    ? val >= 100000
                      ? `₹${(val / 100000).toFixed(1)}L`
                      : `₹${val}`
                    : val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill={`url(#gradient-${metric})`} />

          {/* Trend Line */}
          <path
            d={linePath}
            fill="none"
            stroke={currentConfig.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={i}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => {
                  if (onDrilldown) {
                    onDrilldown({ ...pt, year });
                  }
                }}
              >
                {/* Invisible hover hotspot */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                {/* Visible Point */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke={currentConfig.color}
                  strokeWidth={isHovered ? 3 : 2}
                  style={{ transition: 'all 0.15s ease' }}
                />

                {/* X-axis label */}
                <text
                  x={pt.x}
                  y={height - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? '700' : '500'}
                  fill={isHovered ? '#0f172a' : '#64748b'}
                >
                  {pt.shortMonth || pt.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating tooltip when point is hovered */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '24px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {points[hoveredIdx].month} {year}
            </div>
            <div style={{ color: '#93c5fd', marginTop: '2px' }}>
              {currentConfig.label}:{' '}
              <strong>
                {currentConfig.isCurrency
                  ? formatINR(points[hoveredIdx].value)
                  : `${points[hoveredIdx].value} ${currentConfig.unit}`}
              </strong>
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '10.5px', marginTop: '2px' }}>
              Conversion Rate: {points[hoveredIdx].conversionRate}% • Click for full cohort
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
