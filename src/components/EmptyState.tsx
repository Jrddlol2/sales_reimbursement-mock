import React from 'react';
import { Icon } from '@phosphor-icons/react';

interface EmptyStateProps {
  icon: Icon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

// Shared "nothing here" block (icon circle + heading + subtext + optional
// action) - the same visual recipe every list on this app already copy-pastes
// with slightly different markup per file.
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="text-center py-8 px-4">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-xs font-bold text-slate-700">{title}</p>
      {description && <p className="text-[11px] text-slate-400 mt-1">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
};
