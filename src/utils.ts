import { ClaimStatus, Claim, Approval, User } from './types';

// Maps a claim/cash-advance/liquidation status to one of the semantic badge
// classes defined in index.css (corp-badge-success/warning/danger/info).
// Pending-type statuses -> warning, approved/completed/closed -> success,
// rejected -> danger, in-flight/neutral pipeline statuses -> info. Draft and
// unrecognized statuses stay neutral slate since they aren't a semantic state.
export const getStatusColor = (status: ClaimStatus | string) => {
  switch (status) {
    case ClaimStatus.DRAFT:
    case 'Draft':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case ClaimStatus.PENDING_APPROVAL:
      return 'corp-badge-warning';
    case ClaimStatus.APPROVED:
    case 'Approved':
      return 'corp-badge-success';
    case ClaimStatus.PROCESSING:
      return 'corp-badge-info';
    case ClaimStatus.READY_FOR_CLAIM:
      return 'corp-badge-info';
    case ClaimStatus.COMPLETED:
      return 'corp-badge-success';
    case ClaimStatus.REJECTED:
    case 'Rejected':
      return 'corp-badge-danger';
    case ClaimStatus.RETURNED:
      return 'corp-badge-warning';
    case 'Submitted':
      return 'corp-badge-info';
    case 'Released':
      return 'corp-badge-success';
    case 'ReturnedForRevision':
      return 'corp-badge-warning';
    case 'Reviewed':
      return 'corp-badge-info';
    case 'Closed':
    case 'Liquidated':
      return 'corp-badge-success';
    case 'PendingConfirmation':
      return 'corp-badge-warning';
    case 'Confirmed':
      return 'corp-badge-success';
    case 'DeclineRequested':
      return 'corp-badge-danger';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

// Display-only label override for the payout/release step. The stored status
// value stays ClaimStatus.READY_FOR_CLAIM ('Ready for Claim') everywhere in
// data/business logic; this just standardizes the user-facing copy to match
// the "Ready to Claim" term already used for the nav item and page title.
export const getStatusDisplayLabel = (status: string): string | undefined => {
  return status === ClaimStatus.READY_FOR_CLAIM ? 'Ready to Claim' : undefined;
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

export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const userId = localStorage.getItem('mockUserId');
  const headers: Record<string, string> = {};
  if (userId) {
    headers['X-User-Id'] = userId;
  }

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    headers
  });
  
  if (!res.ok) {
    throw new Error('Failed to upload file');
  }
  const data = await res.json();
  return data.url;
};


export const IS_DEMO_MODE = (import.meta as any).env?.VITE_IS_DEMO_MODE !== 'false';
