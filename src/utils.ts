import { Claim, Approval, User } from './types';
import { getStatusBadgeClass, getStatusConfig } from './statusConfig';

// Thin re-exports over statusConfig.ts (the single source of truth for
// status -> color/label/icon) kept for existing callers that need a raw
// class string or label instead of the <StatusBadge> component.
export const getStatusColor = getStatusBadgeClass;

// Canonical display label for a status, e.g. 'Ready for Claim' -> 'Ready to
// Claim', 'ReturnedForRevision' -> 'Returned for Revision'. <StatusBadge>
// already applies this by default — only call this directly when you need
// the bare label string outside a badge.
export const getStatusDisplayLabel = (status: string): string => getStatusConfig(status).label;

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
