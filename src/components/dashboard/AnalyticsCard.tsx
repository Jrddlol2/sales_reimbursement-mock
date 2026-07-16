import React from 'react';

interface AnalyticsCardProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ title, children, action, className = "" }) => {
  return (
    <div className={`corp-card flex flex-col ${className}`}>
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      <div className="p-6 flex-1">
        {children}
      </div>
    </div>
  );
};
