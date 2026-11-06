import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { cn, CHART_COLORS } from '../lib/utils'

const axisStyle = { fontSize: 11, fill: '#94a3b8', fontWeight: 500 }

export function ChartTooltip({ active, payload, label, prefix = '', suffix = '' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-ink-800/95">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-slate-500 dark:text-slate-400">{p.name}</span>
          <span className="ml-auto font-semibold tabular text-slate-800 dark:text-white">{prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}</span>
        </div>
      ))}
    </div>
  )
}

export function AreaTrend({ data, series, height = 250, prefix = '', suffix = '' }: { data: any[]; series: { key: string; name: string; color: string }[]; height?: number; prefix?: string; suffix?: string }) {
  const id = series.map((s) => s.key).join('-')
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.015} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-white/10" />
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} dy={8} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={46} />
          <Tooltip content={<ChartTooltip prefix={prefix} suffix={suffix} />} cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4', strokeOpacity: 0.5 }} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.25} fill={`url(#grad-${id}-${s.key})`} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} dot={false} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarDistribution({ data, color = '#6366f1', height = 260, layout = 'vertical', prefix = '' }: { data: { name: string; value: number; color?: string }[]; color?: string; height?: number; layout?: 'vertical' | 'horizontal'; prefix?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  if (layout === 'horizontal') {
    return (
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-white/10" />
            <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={<ChartTooltip prefix={prefix} />} cursor={{ fill: 'rgba(99,102,241,.05)' }} />
            <Bar dataKey="value" name="Count" radius={[7, 7, 0, 0]} maxBarSize={34}>
              {data.map((d, i) => <Cell key={i} fill={d.color || CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 2, right: 16, left: 0, bottom: 2 }} barCategoryGap={10}>
          <XAxis type="number" hide domain={[0, max]} />
          <YAxis type="category" dataKey="name" tick={{ ...axisStyle, fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" axisLine={false} tickLine={false} width={112} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,.05)' }} />
          <Bar dataKey="value" name="Employees" radius={[0, 6, 6, 0]} maxBarSize={16}>
            {data.map((d, i) => <Cell key={i} fill={d.color || color} fillOpacity={0.9} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Donut({ data, height = 220, centerLabel, centerValue, prefix = '' }: { data: { name: string; value: number; color?: string }[]; height?: number; centerLabel?: string; centerValue?: string | number; prefix?: string }) {
  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="63%" outerRadius="93%" paddingAngle={2.5} stroke="none">
            {data.map((d, i) => <Cell key={i} fill={d.color || CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip content={<ChartTooltip prefix={prefix} />} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue !== undefined) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular font-display text-2xl font-bold text-slate-900 dark:text-white">{centerValue}</span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{centerLabel}</span>
        </div>
      )}
    </div>
  )
}

export function Legend({ items, className }: { items: { name: string; value?: React.ReactNode; color: string }[]; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2.5 text-xs">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
          <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{item.name}</span>
          {item.value !== undefined && <span className="font-semibold tabular text-slate-900 dark:text-white">{item.value}</span>}
        </div>
      ))}
    </div>
  )
}

export function Funnel({ stages }: { stages: { name: string; value: number; color: string }[] }) {
  const top = stages[0]?.value || 1
  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const pct = Math.round((stage.value / Math.max(top, 1)) * 100)
        const dropoff = i > 0 ? Math.round((stage.value / Math.max(stages[i - 1].value, 1)) * 100) : 100
        return (
          <div key={stage.name}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ background: stage.color }}>{i + 1}</span>
                {stage.name}
              </span>
              <span className="flex items-center gap-2">
                <span className="tabular font-semibold text-slate-900 dark:text-white">{stage.value}</span>
                <span className="tabular w-9 text-right text-[10px] text-slate-400">{dropoff}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${stage.color}bb, ${stage.color})` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function Sparkline({ data, color = '#6366f1', height = 42 }: { data: number[]; color?: string; height?: number }) {
  const points = data.length > 1 ? data : [0, data[0] || 0]
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const width = 100
  const coords = points.map((v, i) => `${(i / (points.length - 1)) * width},${height - ((v - min) / range) * (height - 8) - 4}`)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${coords.join(' ')} ${width},${height}`} fill={`url(#spark-${color.replace('#', '')})`} />
      <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LineTrend({ data, series, height = 220 }: { data: any[]; series: { key: string; name: string; color: string }[]; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-white/10" />
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} dy={8} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4', strokeOpacity: 0.5 }} />
          {series.map((s) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.25} dot={false} activeDot={{ r: 4 }} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
