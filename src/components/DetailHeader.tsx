import React from 'react';
import { X, Copy } from '@phosphor-icons/react';
import { useToast } from './Toast';

interface DetailHeaderProps {
  eyebrow: string;
  title: string;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  onClose?: () => void;
}

// Shared detail-panel header: id/title + eyebrow label + status slot + an
// actions slot for page-specific buttons (preview toggles, edit, etc). Same
// visual shell every detail page already hand-rolled independently.
export const DetailHeader: React.FC<DetailHeaderProps> = ({ eyebrow, title, status, actions, onClose }) => {
  const toast = useToast();
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
      <div className="space-y-1">
        
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-slate-950 font-mono tracking-wider uppercase">{title}</h2>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(title);
              toast.success('ID copied to clipboard');
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
            title="Copy ID"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase font-display">{eyebrow}</span>
          {status}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors ml-2">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
