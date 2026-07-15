import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const STYLES: Record<ToastKind, { icon: React.ElementType; border: string; iconColor: string }> = {
  success: { icon: CheckCircle2, border: 'border-l-green-500', iconColor: 'text-green-600' },
  error: { icon: XCircle, border: 'border-l-red-500', iconColor: 'text-red-600' },
  info: { icon: Info, border: 'border-l-[brand]', iconColor: 'text-brand' },
};

let idCounter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++idCounter;
    setToasts(prev => [...prev, { id, kind, message }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const value: ToastContextType = {
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map(t => {
          const style = STYLES[t.kind];
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto bg-white border border-gray-200 border-l-4 ${style.border} rounded shadow-lg px-4 py-3 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2`}
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${style.iconColor}`} />
              <p className="text-sm text-gray-800 flex-1 leading-snug">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
