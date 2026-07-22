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
  // Optional small count badge (e.g. open support tickets) — only rendered
  // in the 'compact' layout, colored by badgeColorClass so its urgency
  // (severity of what's waiting) reads independently of the icon's own
  // fixed bgColorClass.
  badgeCount?: number;
  badgeColorClass?: string;
}

interface QuickActionsCardProps {
  actions: QuickAction[];
  layout?: 'grid' | 'horizontal' | 'compact';
}

// Small circular icon buttons for the dashboard header's top-right corner —
// each keeps its own color (from bgColorClass) so actions stay visually
// distinct at a glance, with a hover lift + label tooltip instead of a
// full card layout.
const CompactActionButton: React.FC<{ action: QuickAction; onClick: () => void }> = ({ action, onClick }) => {
  const IconComp = action.icon;
  return (
    <button
      onClick={onClick}
      title={action.label}
      aria-label={action.label}
      className={`group relative w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${action.bgColorClass} ${action.colorClass}`}
    >
      <IconComp size={18} weight="fill" />
      {!!action.badgeCount && (
        <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-white ${action.badgeColorClass || 'bg-red-500'}`}>
          {action.badgeCount > 9 ? '9+' : action.badgeCount}
        </span>
      )}
      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-20">
        {action.label}
      </span>
    </button>
  );
};

const ActionButton: React.FC<{ action: QuickAction; onClick: () => void }> = ({ action, onClick }) => {
  const IconComp = action.icon;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-slate-200 transition-all hover:bg-slate-50 group text-left w-full"
    >
      <div className={`p-2 rounded-lg shadow-sm transition-transform group-hover:scale-105 shrink-0 ${action.bgColorClass} ${action.colorClass}`}>
        <IconComp size={20} weight="fill" />
      </div>
      <span className="text-xs md:text-sm font-semibold text-slate-700 tracking-tight leading-tight">{action.label}</span>
    </button>
  );
};

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ actions, layout = 'grid' }) => {
  const navigate = useNavigate();

  if (layout === 'compact') {
    return (
      <div className="flex items-center gap-2.5">
        {actions.map((action, idx) => (
          <CompactActionButton key={idx} action={action} onClick={() => navigate(action.path)} />
        ))}
      </div>
    );
  }

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
              <div className={`p-3 rounded-full mb-3 shadow-sm transition-transform group-hover:scale-110 ${action.bgColorClass} ${action.colorClass}`}>
                <IconComp size={24} weight="fill" />
              </div>
              <span className="text-sm font-medium text-slate-700">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
