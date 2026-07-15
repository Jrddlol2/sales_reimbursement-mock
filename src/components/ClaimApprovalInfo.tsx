import React from 'react';
import { User } from '../types';
import { getApproverInfo } from '../utils';

interface ClaimApprovalInfoProps {
  claim: { approvals?: any[]; current_approver_id?: string };
  users: User[];
  compact?: boolean;
}

// Shared "who approved this claim and why" block - resolves the approver's
// name/comment via the single getApproverInfo() source of truth in utils.ts.
export const ClaimApprovalInfo: React.FC<ClaimApprovalInfoProps> = ({ claim, users, compact = false }) => {
  const info = getApproverInfo(claim, users);

  if (compact) {
    return (
      <div className="space-y-1">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-display">Supervisor Approval Audit</span>
        <p className="text-xs font-bold text-slate-900">Approved By: {info.name}</p>
        <p className="text-xs text-slate-600 italic">Comment: "{info.comment}"</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      <div><span className="text-slate-400 font-bold block mb-0.5 font-display uppercase tracking-wider text-[10px]">Approved By</span><span className="font-bold text-slate-900">{info.name}</span></div>
      <div><span className="text-slate-400 font-bold block mb-0.5 font-display uppercase tracking-wider text-[10px]">Comment</span><span className="text-slate-700 italic">"{info.comment || 'Approved'}"</span></div>
    </div>
  );
};
