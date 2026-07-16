import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helpText, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
        <input
          ref={ref}
          className={`
            w-full border rounded-lg px-3 py-2 text-sm text-slate-900 bg-white
            transition-all duration-200 placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:border-blue-500
            disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
            ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 hover:border-slate-400 focus:ring-blue-100'}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-xs font-medium text-red-500">{error}</span>}
        {!error && helpText && <span className="text-xs text-slate-500">{helpText}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, helpText, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
        <textarea
          ref={ref}
          className={`
            w-full border rounded-lg px-3 py-2 text-sm text-slate-900 bg-white
            transition-all duration-200 placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:border-blue-500
            disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
            ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 hover:border-slate-400 focus:ring-blue-100'}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-xs font-medium text-red-500">{error}</span>}
        {!error && helpText && <span className="text-xs text-slate-500">{helpText}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, helpText, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
        <select
          ref={ref}
          className={`
            w-full border rounded-lg px-3 py-2 text-sm text-slate-900 bg-white
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:border-blue-500
            disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
            ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 hover:border-slate-400 focus:ring-blue-100'}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-xs font-medium text-red-500">{error}</span>}
        {!error && helpText && <span className="text-xs text-slate-500">{helpText}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';
