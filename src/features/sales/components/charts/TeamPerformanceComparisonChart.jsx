import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, ArrowUpRight, Award, Info } from 'lucide-react';
import { formatINR } from '../../utils/formatters';

const METRIC_CONFIG = {
  achievedValue: {
    label: 'Achieved Net Sales Value (₹)',
    shortLabel: 'Net Sales',
    color: '#16a34a',
    hoverColor: '#15803d',
    format: (v) => formatINR(v),
  },
  achievedQty: {
    label: 'Achieved Sales Quantity (Units)',
    shortLabel: 'Quantity',
    color: '#0284c7',
    hoverColor: '#0369a1',
    format: (v) => `${v} units`,
  },
  quotationsGenerated: {
    label: 'Quotations Generated',
    shortLabel: 'Quotes Gen',
    color: '#6366f1',
    hoverColor: '#4f46e5',
    format: (v) => `${v}`,
  },
  quotationsConverted: {
    label: 'Quotations Converted into Orders',
    shortLabel: 'Quotes Converted',
    color: '#2563eb',
    hoverColor: '#1d4ed8',
    format: (v) => `${v}`,
  },
  ordersWon: {
    label: 'Confirmed Orders Won',
    shortLabel: 'Orders Won',
    color: '#059669',
    hoverColor: '#047857',
    format: (v) => `${v}`,
  },
  quotationsLost: {
    label: 'Quotations Lost / Cancelled',
    shortLabel: 'Quotes Lost',
    color: '#dc2626',
    hoverColor: '#b91c1c',
    format: (v) => `${v}`,
  },
  conversionRate: {
    label: 'Quotation Conversion Efficiency (%)',
    shortLabel: 'Conversion %',
    color: '#7c3aed',
    hoverColor: '#6d28d9',
    format: (v) => `${v}%`,
  },
};

export default function TeamPerformanceComparisonChart({ teamData = [], onSelectEmployee }) {
  const [activeMetric, setActiveMetric] = useState('achievedValue');
  const [hoveredEmployee, setHoveredEmployee] = useState(null);

  const metricMeta = METRIC_CONFIG[activeMetric];

  // Dimensions
  const height = 280;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 55;

  const totalWidth = Math.max(680, teamData.length * 90);
  const chartWidth = totalWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Max value calculation (include buffer)
  const maxValue = useMemo(() => {
    if (teamData.length === 0) return 100;
    if (activeMetric === 'conversionRate') return 100;
    const maxVal = Math.max(...teamData.map((d) => Number(d[activeMetric] || 0)), 0);
    return maxVal === 0 ? 10 : Math.ceil(maxVal * 1.18);
  }, [teamData, activeMetric]);

  const barSlotWidth = chartWidth / (teamData.length || 1);
  const barWidth = Math.min(42, Math.max(22, barSlotWidth * 0.55));

  // Y-axis ticks
  const yTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
      value: maxValue * pct,
      y: paddingTop + chartHeight - chartHeight * pct,
    }));
  }, [maxValue, chartHeight, paddingTop]);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px 20px',
      }}
    >
      {/* Metric Selector Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} className="text-primary" />
            <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>
              Employee Performance Comparison Graph — Team Visual Analytics &amp; Target Comparison
            </strong>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Comparative team analytics across authorized scope. Click any employee bar to inspect individual records.
          </p>
        </div>

        {/* Metric Selector Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {Object.entries(METRIC_CONFIG).map(([key, config]) => {
            const isSelected = activeMetric === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveMetric(key)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  border: isSelected ? `1.5px solid ${config.color}` : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                  color: isSelected ? config.color : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: config.color,
                  }}
                />
                {config.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Comparison Graph Container */}
      <div style={{ overflowX: 'auto', width: '100%', position: 'relative' }}>
        <svg width={totalWidth} height={height} style={{ display: 'block', overflow: 'visible' }}>
          {/* Horizontal grid lines */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={totalWidth - paddingRight}
                y2={tick.y}
                stroke="#f1f5f9"
                strokeWidth={1}
                strokeDasharray={idx === 0 ? 'none' : '3,3'}
              />
              <text
                x={paddingLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                fontSize={10.5}
                fill="#94a3b8"
                fontFamily="inherit"
              >
                {activeMetric === 'achievedValue'
                  ? tick.value >= 100000
                    ? `₹${(tick.value / 100000).toFixed(1)}L`
                    : `₹${Math.round(tick.value / 1000)}k`
                  : activeMetric === 'conversionRate'
                  ? `${Math.round(tick.value)}%`
                  : Math.round(tick.value)}
              </text>
            </g>
          ))}

          {/* Baseline X-axis */}
          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={totalWidth - paddingRight}
            y2={paddingTop + chartHeight}
            stroke="#cbd5e1"
            strokeWidth={1.5}
          />

          {/* Employee Bars */}
          {teamData.map((emp, idx) => {
            const rawVal = Number(emp[activeMetric] || 0);
            const barH = maxValue > 0 ? (rawVal / maxValue) * chartHeight : 0;
            const xCenter = paddingLeft + idx * barSlotWidth + barSlotWidth / 2;
            const barX = xCenter - barWidth / 2;
            const barY = paddingTop + chartHeight - barH;
            const isHovered = hoveredEmployee?.employeeId === emp.employeeId;

            return (
              <g
                key={emp.employeeId}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredEmployee(emp)}
                onMouseLeave={() => setHoveredEmployee(null)}
                onClick={() => onSelectEmployee && onSelectEmployee(emp)}
              >
                {/* Background highlight on hover */}
                {isHovered && (
                  <rect
                    x={paddingLeft + idx * barSlotWidth + 4}
                    y={paddingTop}
                    width={barSlotWidth - 8}
                    height={chartHeight}
                    fill="#eff6ff"
                    opacity={0.6}
                    rx={4}
                  />
                )}

                {/* Vertical Bar */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={Math.max(2, barH)}
                  rx={4}
                  fill={isHovered ? metricMeta.hoverColor : metricMeta.color}
                  opacity={rawVal === 0 ? 0.3 : 1}
                  style={{
                    transition: 'all 0.15s ease',
                    filter: isHovered ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' : 'none',
                  }}
                />

                {/* Top Value Label */}
                <text
                  x={xCenter}
                  y={barY - 6}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill={rawVal === 0 ? '#94a3b8' : '#1e293b'}
                >
                  {rawVal === 0
                    ? '0'
                    : activeMetric === 'achievedValue'
                    ? rawVal >= 100000
                      ? `₹${(rawVal / 100000).toFixed(1)}L`
                      : `₹${Math.round(rawVal / 1000)}k`
                    : activeMetric === 'conversionRate'
                    ? `${rawVal}%`
                    : rawVal}
                </text>

                {/* Bottom Employee Name */}
                <text
                  x={xCenter}
                  y={paddingTop + chartHeight + 16}
                  textAnchor="middle"
                  fontSize={11.5}
                  fontWeight={600}
                  fill="#1e293b"
                >
                  {emp.fullName?.split(' ')[0] || emp.employeeId}
                </text>

                {/* Bottom Employee ID */}
                <text
                  x={xCenter}
                  y={paddingTop + chartHeight + 30}
                  textAnchor="middle"
                  fontSize={9.5}
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  {emp.employeeId}
                </text>

                {/* Role/Level Pill */}
                <text
                  x={xCenter}
                  y={paddingTop + chartHeight + 43}
                  textAnchor="middle"
                  fontSize={9}
                  fill={emp.role === 'junior_sales' ? '#7e22ce' : '#1d4ed8'}
                  fontWeight={600}
                >
                  {emp.role === 'junior_sales' ? 'Junior' : emp.role === 'sales_rep' ? 'Rep' : 'Lead'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Employee Summary Footer */}
      {hoveredEmployee && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '12px',
          }}
        >
          <div>
            <strong style={{ color: '#0f172a' }}>{hoveredEmployee.fullName}</strong>{' '}
            <span style={{ color: '#64748b' }}>({hoveredEmployee.employeeId} • {hoveredEmployee.role})</span>
            <span style={{ marginLeft: '8px', color: '#334155' }}>
              Territory: <strong>{hoveredEmployee.territoryName || 'Regional'}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <span>
              {metricMeta.label}: <strong style={{ color: metricMeta.color }}>{metricMeta.format(hoveredEmployee[activeMetric] || 0)}</strong>
            </span>
            <span style={{ color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              Click bar for full details <ArrowUpRight size={13} />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
