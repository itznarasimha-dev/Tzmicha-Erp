import React from 'react';
import clsx from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs',
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs',
    warning:
      'bg-amber-50 text-amber-800 border-amber-200 shadow-xs',
    danger:
      'bg-rose-50 text-rose-700 border-rose-200 shadow-xs',
    info:
      'bg-cyan-50 text-cyan-800 border-cyan-200 shadow-xs',
    neutral:
      'bg-slate-100 text-slate-700 border-slate-200',
    purple:
      'bg-purple-50 text-purple-700 border-purple-200 shadow-xs',
  };

  const dotColors = {
    primary: 'bg-indigo-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-rose-600',
    info: 'bg-cyan-600',
    neutral: 'bg-slate-500',
    purple: 'bg-purple-600',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold tracking-wide',
    md: 'text-xs px-2.5 py-1 font-semibold tracking-wide',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border transition-all duration-200 select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  );
};
