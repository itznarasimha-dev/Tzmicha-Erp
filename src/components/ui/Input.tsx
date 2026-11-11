import React from 'react';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-slate-700 tracking-wide">
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              'glass-input w-full rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 shadow-xs transition-all',
              icon && 'pl-10',
              error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-200',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        {hint && !error && <p className="text-[11px] text-slate-500">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-slate-700 tracking-wide">
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'glass-input w-full rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 shadow-xs focus:outline-none transition-all cursor-pointer',
            error && 'border-rose-400 focus:border-rose-500',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export const SearchInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Search...', className }) => {
  return (
    <div className={clsx('relative w-full max-w-sm', className)}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="glass-input w-full pl-9 pr-8 py-1.5 text-xs rounded-xl shadow-xs text-slate-900 placeholder-slate-400"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
