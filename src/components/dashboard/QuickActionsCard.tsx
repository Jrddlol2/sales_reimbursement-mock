import React from 'react';
import { Icon } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

export interface QuickAction {
  label: string;
  icon: Icon;
  path: string;
  colorClass: string;
  bgColorClass: string;
  // Optional sub-grouping label, e.g. "Start New" vs "Manage / Schedule" —
  // lets QuickActionsCard visually separate actions that create a new
  // claim/request from actions that manage or schedule existing ones.
  group?: string;
}

interface QuickActionsCardProps {
  actions: QuickAction[];
  layout?: 'grid' | 'horizontal';
}

const ActionButton: React.FC<{ action: QuickAction; onClick: () => void }> = ({ action, onClick }) => {
  const IconComp = action.icon;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-slate-200 transition-all hover:bg-slate-50 group text-left w-full"
    >
      <div className={`p-2 rounded-lg transition-transform group-hover:scale-105 shrink-0 ${action.bgColorClass} ${action.colorClass}`}>
        <IconComp size={20} weight="duotone" />
      </div>
      <span className="text-xs md:text-sm font-semibold text-slate-700 tracking-tight leading-tight">{action.label}</span>
    </button>
  );
};

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ actions, layout = 'grid' }) => {
  const navigate = useNavigate();

  if (layout === 'horizontal') {
    const groups = Array.from(new Set(actions.map(a => a.group).filter((g): g is string => !!g)));
    const colsClass = actions.length === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4';

    if (groups.length > 1) {
      return (
        <div className="corp-card p-3 md:p-4 mb-6 flex flex-col sm:flex-row gap-3 md:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {groups.map(groupName => {
            const groupActions = actions.filter(a => a.group === groupName);
            const groupColsClass = groupActions.length >= 2 ? 'grid-cols-2' : 'grid-cols-1';
            return (
              <div key={groupName} className="flex-1 pt-3 sm:pt-0 sm:pl-4 first:pt-0 first:sm:pl-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-1">{groupName}</span>
                <div className={`grid ${groupColsClass} gap-3 md:gap-4`}>
                  {groupActions.map((action, idx) => (
                    <ActionButton key={idx} action={action} onClick={() => navigate(action.path)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="corp-card p-3 md:p-4 mb-6">
        <div className={`grid ${colsClass} gap-3 md:gap-4`}>
          {actions.map((action, idx) => (
            <ActionButton key={idx} action={action} onClick={() => navigate(action.path)} />
          ))}
        </div>
      </div>
    );
  }

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
