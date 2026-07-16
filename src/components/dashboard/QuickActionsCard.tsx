import React from 'react';
import { Icon } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

export interface QuickAction {
  label: string;
  icon: Icon;
  path: string;
  colorClass: string;
  bgColorClass: string;
}

interface QuickActionsCardProps {
  actions: QuickAction[];
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ actions }) => {
  const navigate = useNavigate();

  return (
    <div className="corp-card flex flex-col">
      <div className="px-6 py-5 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Quick Actions</h3>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        {actions.map((action, idx) => {
          const IconComp = action.icon;
          return (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-transparent hover:border-slate-200 transition-all hover:bg-slate-50 group text-center"
            >
              <div className={`p-3 rounded-full mb-3 transition-transform group-hover:scale-110 ${action.bgColorClass} ${action.colorClass}`}>
                <IconComp size={24} weight="duotone" />
              </div>
              <span className="text-sm font-medium text-slate-700">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
