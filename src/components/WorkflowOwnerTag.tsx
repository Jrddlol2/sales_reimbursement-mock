import React from 'react';
import { getStatusConfig } from '../statusConfig';

interface WorkflowOwnerTagProps {
  status: string;
  className?: string;
  /** Resolved person names for the two owner roles that map to a specific
   *  individual on a given entity (the Requestor, or the current Approver).
   *  Custodian/Admin/Delegate stay role-only — there's no "assigned
   *  custodian" field to resolve, any Custodian/Admin can act. Pass whichever
   *  you have; only the one matching the status's actual ownerRole is used. */
  requestorName?: string;
  approverName?: string;
}

// "Currently with X" indicator sourced from statusConfig's ownerRole — only
// renders when the status has a known next-actor (terminal states like
// Completed/Closed have none). Meant to sit inline next to a StatusBadge,
// not to replace it or restructure the surrounding layout. Prefers the
// resolved person's name ("Currently with Ryan Torres") over the bare role
// ("Currently with Approver") whenever the caller can supply it.
export const WorkflowOwnerTag: React.FC<WorkflowOwnerTagProps> = ({ status, className = '', requestorName, approverName }) => {
  const { ownerRole } = getStatusConfig(status);
  if (!ownerRole) return null;
  const personName = ownerRole === 'Requestor' ? requestorName : ownerRole === 'Approver' ? approverName : undefined;
  return (
    <span className={`text-[10px] font-semibold text-slate-400 ${className}`}>
      Currently with <span className="text-slate-600 font-bold">{personName || ownerRole}</span>
    </span>
  );
};
