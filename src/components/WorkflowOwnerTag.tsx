import React from 'react';
import { getStatusConfig } from '../statusConfig';

interface WorkflowOwnerTagProps {
  status: string;
  className?: string;
}

// Small "Currently with X" indicator sourced from statusConfig's ownerRole —
// only renders when the status has a known next-actor (terminal states like
// Completed/Closed have none). Meant to sit inline next to a StatusBadge,
// not to replace it or restructure the surrounding layout.
export const WorkflowOwnerTag: React.FC<WorkflowOwnerTagProps> = ({ status, className = '' }) => {
  const { ownerRole } = getStatusConfig(status);
  if (!ownerRole) return null;
  return (
    <span className={`text-[10px] font-semibold text-slate-400 ${className}`}>
      Currently with <span className="text-slate-600 font-bold">{ownerRole}</span>
    </span>
  );
};
