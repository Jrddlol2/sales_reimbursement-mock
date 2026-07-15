import { ClaimStatus, Claim, Approval, User } from './types';

export const getStatusColor = (status: ClaimStatus | string) => {
  switch (status) {
    case ClaimStatus.DRAFT:
    case 'Draft':
      return 'bg-gray-100 text-gray-700';
    case ClaimStatus.PENDING_APPROVAL:
      return 'bg-brand/10 text-brand';
    case ClaimStatus.APPROVED:
    case 'Approved':
      return 'bg-teal-100 text-teal-800';
    case ClaimStatus.PROCESSING:
      return 'bg-amber-100 text-amber-800';
    case ClaimStatus.READY_FOR_CLAIM:
      return 'bg-indigo-100 text-indigo-800';
    case ClaimStatus.COMPLETED: 
      return 'bg-green-100 text-green-800';
    case ClaimStatus.REJECTED: 
    case 'Rejected':
      return 'bg-red-100 text-red-800';
    case ClaimStatus.RETURNED: 
      return 'bg-orange-100 text-orange-800';
    case 'Submitted':
      return 'bg-blue-100 text-blue-800';
    case 'Released':
      return 'bg-violet-100 text-violet-800';
    case 'ReturnedForRevision':
      return 'bg-rose-100 text-rose-800';
    case 'Reviewed':
      return 'bg-sky-100 text-sky-800';
    case 'Closed':
    case 'Liquidated':
      return 'bg-emerald-100 text-emerald-800';
    default: 
      return 'bg-gray-100 text-gray-700';
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

