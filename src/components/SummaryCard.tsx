import React from 'react';

interface SummaryCardProps {
  title: string;
  actions?: React.ReactNode;
  bodyClassName?: string;
  children: React.ReactNode;
}

// Shared titled-card shell (white/bordered/shadow body + slate-50 title bar)
// that every detail page previously copy-pasted with minor class drift.
// bodyClassName lets a caller opt out of the default padding (e.g. a table
// that wants to run edge-to-edge).
export const SummaryCard: React.FC<SummaryCardProps> = ({ title, actions, bodyClassName = 'p-5', children }) => {
  return (
    <div className="bg-white border-y sm:border sm:rounded-xl border-slate-200 overflow-hidden shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] transition-shadow">
      <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-widest font-display">{title}</h3>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      <div className={bodyClassName}>
        {children}
      </div>
    </div>
  );
};
