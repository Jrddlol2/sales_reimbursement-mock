import { ClaimStatus, Claim, Approval, User } from './types';

export const getStatusColor = (status: ClaimStatus | string) => {
  switch (status) {
    case ClaimStatus.DRAFT:
    case 'Draft':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case ClaimStatus.PENDING_APPROVAL:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case ClaimStatus.APPROVED:
    case 'Approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case ClaimStatus.PROCESSING:
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case ClaimStatus.READY_FOR_CLAIM:
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case ClaimStatus.COMPLETED: 
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case ClaimStatus.REJECTED: 
    case 'Rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    case ClaimStatus.RETURNED: 
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Submitted':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Released':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'ReturnedForRevision':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Reviewed':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Closed':
    case 'Liquidated':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: 
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const formatPHP = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount);
};

// Every claim gets a real claim_number once /api/claims persists it; this
// fallback only ever applies to a claim object that hasn't round-tripped
// through the server yet (there shouldn't be any in normal use, but it keeps
// display code crash-proof either way).
export const getClaimNumber = (claim: Pick<Claim, 'id' | 'claim_number'>): string =>
  claim.claim_number || `REIM-${claim.id.substring(0, 6)}`;

// Resolves the approver's name and comment for a claim's most recent
// "Approved" decision, falling back to the currently assigned approver's
// name (no comment on file) if no Approved decision exists yet.
export const getApproverInfo = (
  claim: { approvals?: Approval[]; current_approver_id?: string },
  users: User[]
): { name: string; comment: string } => {
  const approvalRecord = (claim.approvals || []).slice().reverse().find(a => a.decision === 'Approved');
  if (approvalRecord) {
    const approver = users.find(u => u.id === approvalRecord.approver_id);
    return { name: approver?.name || 'Unknown Approver', comment: approvalRecord.comment || 'No comment provided.' };
  }
  const approver = users.find(u => u.id === claim.current_approver_id);
  return { name: approver?.name || 'Unknown Approver', comment: 'No comment on file.' };
};

