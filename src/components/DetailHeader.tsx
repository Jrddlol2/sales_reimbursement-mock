import React from 'react';
import { X } from '@phosphor-icons/react';

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
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
      <div className="space-y-1">
        <h2 className="text-base font-extrabold text-slate-950 font-mono tracking-wider uppercase">{title}</h2>
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
