import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'glass',
      size = 'md',
      loading = false,
      disabled,
      icon,
      className,
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer';

    const variants = {
      primary:
        'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 border border-indigo-600',
      secondary:
        'bg-slate-900 hover:bg-slate-800 text-white shadow-sm border border-slate-900',
      glass:
        'bg-white/90 hover:bg-white text-slate-800 shadow-xs border border-slate-200/90 hover:border-slate-300 backdrop-blur-md',
      outline:
        'border border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-600 backdrop-blur-sm',
      danger:
        'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-xs',
      ghost:
        'hover:bg-slate-100 text-slate-600 hover:text-slate-900',
      success:
        'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30 border border-emerald-600',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
      md: 'text-xs sm:text-sm px-4 py-2 gap-2 rounded-xl',
      lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5 rounded-xl',
      icon: 'p-2 w-9 h-9 rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
