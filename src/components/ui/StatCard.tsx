import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  change?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  progress?: {
    current: number;
    total: number;
    color?: string;
  };
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-xs',
  change,
  progress,
  className,
  onClick,
}) => {
  const percent = progress ? Math.min(100, Math.round((progress.current / (progress.total || 1)) * 100)) : 0;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'glass-card p-5 transition-all duration-300 relative group overflow-hidden',
        onClick && 'cursor-pointer hover:border-indigo-400 hover:shadow-lg',
        className
      )}
    >
      {/* Subtle top specular sheen */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="text-2xl sm:text-[26px] font-semibold tracking-tight text-slate-900 font-mono">
            {value}
          </div>
        </div>
        <div
          className={clsx(
            'p-3 rounded-2xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200',
            iconBgColor
          )}
        >
          {icon}
        </div>
      </div>

      {(subtitle || change || progress) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            {change && (
              <span
                className={clsx(
                  'inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full',
                  change.isNeutral
                    ? 'text-slate-600 bg-slate-100'
                    : change.isPositive
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : 'text-rose-700 bg-rose-50 border border-rose-200'
                )}
              >
                {!change.isNeutral && (
                  change.isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )
                )}
                {change.value}
              </span>
            )}
            {subtitle && <span className="text-slate-500 text-[11px] truncate">{subtitle}</span>}
          </div>

          {progress && (
            <div className="space-y-1">
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-500',
                    progress.color || 'bg-indigo-600'
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>{progress.current.toLocaleString()} units</span>
                <span>{percent}% allocated</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
