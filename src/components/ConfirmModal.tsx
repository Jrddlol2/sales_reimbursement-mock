import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Warning } from '@phosphor-icons/react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const resolver = useRef<(value: boolean) => void>();

  const confirm: ConfirmFn = useCallback((opts) => {
    setIsExiting(false);
    setOptions(opts);
    return new Promise<boolean>(resolve => {
      resolver.current = resolve;
    });
  }, []);

  const handle = (result: boolean) => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      setOptions(null);
      setIsExiting(false);
      resolver.current?.(result);
    }, 200);
  };

  const isDanger = options?.tone === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className={`absolute inset-0 bg-gray-900 bg-opacity-40 ${
              isExiting ? 'animate-fade-out' : 'animate-fade-in'
            }`} 
            onClick={() => handle(false)} 
          />
          <div 
            className={`relative bg-white rounded-lg shadow-2xl max-w-md w-full border border-gray-200 ${
              isExiting ? 'animate-modal-out' : 'animate-modal-in'
            }`}
          >
            <div className={`p-5 border-b ${isDanger ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'} rounded-t-lg`}>
              <div className="flex items-start gap-3">
                <Warning className={`w-5 h-5 shrink-0 mt-0.5 ${isDanger ? 'text-red-500' : 'text-amber-500'}`} />
                <div>
                  {options.title && <h3 className="font-bold text-gray-900 text-sm mb-1">{options.title}</h3>}
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{options.message}</p>
                </div>
              </div>
            </div>
            <div className="p-4 flex justify-end gap-2">
              <button
                onClick={() => handle(false)}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {options.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={() => handle(true)}
                className={`px-4 py-1.5 text-white rounded text-sm font-semibold shadow-sm transition-colors ${
                  isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-hover'
                }`}
              >
                {options.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
};
