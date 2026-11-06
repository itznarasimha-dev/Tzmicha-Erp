import { useState } from 'react';
import { Info } from 'lucide-react';

export default function QuotationOrderBarChart({
  data = [],
  year = 2026,
  onDrilldown = null,
}) {
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState(null);

  const width = 740;
  const height = 240;
  const padding = { top: 24, right: 30, bottom: 45, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Maximum value for scaling
  const maxVal = Math.max(
    ...data.map((d) =>
      Math.max(
        d.quotationsGenerated || 0,
        d.quotationsConverted || 0,
        d.ordersWon || 0,
        d.quotationsLost || 0
      )
    ),
    10
  );
  const yAxisMax = Math.ceil(maxVal / 5) * 5;

  const monthCount = Math.max(data.length, 1);
  const groupWidth = chartWidth / monthCount;
  const barWidth = Math.max(4, Math.min(10, (groupWidth - 14) / 4));

  const yTicks = [0, Math.round(yAxisMax * 0.5), yAxisMax];

  const SERIES = [
    { key: 'quotationsGenerated', label: 'Quotes Generated', color: '#3b82f6' },
    { key: 'quotationsConverted', label: 'Quotes Converted', color: '#6366f1' },
    { key: 'ordersWon', label: 'Orders Won', color: '#10b981' },
    { key: 'quotationsLost', label: 'Quotes Lost', color: '#ef4444' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Legend & Interactive Note */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {SERIES.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: s.color, borderRadius: '2px' }} />
              <span style={{ color: '#334155', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b' }}>
          <Info size={13} className="text-primary" />
          <span>Click any month column group to open the complete quotation cohort</span>
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', minHeight: '200px' }}
        >
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
                  {val}
                </text>
              </g>
            );
          })}

          {/* Monthly Bar Groups */}
          {data.map((monthData, i) => {
            const groupX = padding.left + i * groupWidth;
            const isHovered = hoveredMonthIdx === i;

            return (
              <g
                key={i}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredMonthIdx(i)}
                onMouseLeave={() => setHoveredMonthIdx(null)}
                onClick={() => {
                  if (onDrilldown) {
                    onDrilldown({ ...monthData, year });
                  }
                }}
              >
                {/* Background Hover Highlight */}
                {isHovered && (
                  <rect
                    x={groupX}
                    y={padding.top}
                    width={groupWidth}
                    height={chartHeight}
                    fill="#f1f5f9"
                    opacity="0.6"
                    rx="4"
                  />
                )}

                {/* 4 Grouped Bars */}
                {SERIES.map((s, sIdx) => {
                  const val = monthData[s.key] || 0;
                  const barH = (val / yAxisMax) * chartHeight;
                  const barY = padding.top + chartHeight - barH;
                  const barX = groupX + (groupWidth - 4 * barWidth - 6) / 2 + sIdx * (barWidth + 2);

                  return (
                    <rect
                      key={s.key}
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={Math.max(1, barH)}
                      fill={s.color}
                      rx="2"
                    />
                  );
                })}

                {/* X-Axis Month Label */}
                <text
                  x={groupX + groupWidth / 2}
                  y={height - 14}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? '700' : '500'}
                  fill={isHovered ? '#0f172a' : '#64748b'}
                >
                  {monthData.shortMonth || monthData.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating tooltip when month is hovered */}
        {hoveredMonthIdx !== null && data[hoveredMonthIdx] && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '24px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>
              {data[hoveredMonthIdx].month} {year} Conversion Funnel
            </div>
            <div>Generated: <strong>{data[hoveredMonthIdx].quotationsGenerated}</strong> Quotes</div>
            <div>Converted: <strong>{data[hoveredMonthIdx].quotationsConverted}</strong> Orders ({data[hoveredMonthIdx].conversionRate}%)</div>
            <div>Won: <strong>{data[hoveredMonthIdx].ordersWon}</strong> Confirmed</div>
            <div>Lost: <strong style={{ color: '#fca5a5' }}>{data[hoveredMonthIdx].quotationsLost}</strong> Quotes</div>
          </div>
        )}
      </div>
    </div>
  );
}
