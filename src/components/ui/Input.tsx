import React from 'react';

// Canonical text-field styling for the whole app — every form should build
// on Input/Textarea/Select rather than hand-rolling border/focus/label
// classes again. Label style matches the uppercase-tracking-wider convention
// already dominant elsewhere in the app (MomQuickCreateModal, ClaimDetail,
// etc.), not Input's own previous default, so migrating a page onto this
// component doesn't introduce a third label style.

// Exported for the rare case a caller needs the bare field classes without
// the full component wrapper (e.g. a field with a prefix icon that needs
// its own positioning) — still one canonical source, not a hand-rolled copy.
export const labelClass = 'text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1';
export const fieldBaseClass = `
  w-full border rounded-lg px-3 py-2 text-sm text-slate-900 bg-white
  transition-all duration-200 placeholder:text-slate-400
  focus:outline-none focus:ring-2 focus:border-brand
  disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
`;
export const fieldStateClass = (hasError: boolean) =>
  hasError ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 hover:border-slate-400 focus:ring-brand/10';

export const RequiredMark: React.FC = () => <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>;

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helpText, required, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className={labelClass}>{label}{required && <RequiredMark />}</label>}
        <input
          ref={ref}
          required={required}
          className={`${fieldBaseClass} ${fieldStateClass(!!error)} ${className}`}
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
  ({ className = '', label, error, helpText, required, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className={labelClass}>{label}{required && <RequiredMark />}</label>}
        <textarea
          ref={ref}
          required={required}
          className={`${fieldBaseClass} ${fieldStateClass(!!error)} ${className}`}
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
  ({ className = '', label, error, helpText, required, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className={labelClass}>{label}{required && <RequiredMark />}</label>}
        <select
          ref={ref}
          required={required}
          className={`${fieldBaseClass} ${fieldStateClass(!!error)} ${className}`}
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
