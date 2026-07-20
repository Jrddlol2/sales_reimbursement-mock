import {
  Icon, PencilSimple, Clock, CheckCircle, ArrowsClockwise, Package,
  XCircle, ArrowUUpLeft, FolderOpen,
} from '@phosphor-icons/react';
import {
  ClaimStatus, CashAdvanceStatus, LiquidationStatus, SupportRequestStatus, ReviewMeetingStatus, DelegationStatus,
} from './types';

// Single source of truth for how every workflow status in the app is
// communicated: label, color, icon, description, workflow stage, next step,
// and current owner. No component should hardcode a status->color/label/icon
// mapping anywhere else — import from here instead.
//
// Keyed by the raw enum *string value* rather than per-enum, because several
// values are shared verbatim across enums (e.g. 'Draft', 'Submitted',
// 'Approved', 'Rejected', 'Completed') and always carry the same meaning
// regardless of which entity they came from. Distinct values that happen to
// mean the same workflow stage (e.g. ClaimStatus.RETURNED = 'Returned' vs
// LiquidationStatus.RETURNED_FOR_REVISION = 'ReturnedForRevision') are given
// the same canonical label/color/icon here, so the UI says one thing no
// matter which page it's rendered on.

export type WorkflowColorKey =
  | 'draft' | 'pending' | 'approved' | 'processing' | 'ready'
  | 'complete' | 'rejected' | 'returned';

export interface StatusMeta {
  /** Canonical, standardized display label. */
  label: string;
  /** Semantic color key -> corp-badge-{key} / status-icon-{key} CSS classes. */
  colorKey: WorkflowColorKey;
  icon: Icon;
  /** One-line explanation of what this status means. */
  description: string;
  /** Position in the entity's linear happy-path, for progress indicators. Terminal/branch states (Rejected, Returned) reuse the stage they branched from. */
  stage: number;
  /** Human-readable next step, shown where workflow guidance is useful. */
  nextStep?: string;
  /** Who currently owns moving this forward, e.g. "Approver", "Custodian". */
  ownerRole?: string;
}

const FALLBACK: StatusMeta = {
  label: 'Unknown',
  colorKey: 'draft',
  icon: PencilSimple,
  description: 'Status not recognized.',
  stage: 0,
};

const STATUS_CONFIG: Record<string, StatusMeta> = {
  // --- Shared across Claim / CashAdvance / Liquidation ---
  'Draft': {
    label: 'Draft', colorKey: 'draft', icon: PencilSimple,
    description: 'Created but not yet submitted.',
    stage: 0, nextStep: 'Submit for approval', ownerRole: 'Requestor',
  },

  // --- Claim-only ---
  'Pending Approval': {
    label: 'Pending Approval', colorKey: 'pending', icon: Clock,
    description: 'Awaiting a decision from your Approver.',
    stage: 1, nextStep: 'Awaiting Approver decision', ownerRole: 'Approver',
  },
  'Approved': {
    label: 'Approved', colorKey: 'approved', icon: CheckCircle,
    description: 'Approved and routed to the Custodian for processing.',
    stage: 2, nextStep: 'Awaiting processing', ownerRole: 'Custodian',
  },
  'Processing': {
    label: 'Processing', colorKey: 'processing', icon: ArrowsClockwise,
    description: 'The Custodian is preparing disbursement.',
    stage: 3, nextStep: 'Awaiting claim code & disbursement', ownerRole: 'Custodian',
  },
  'Ready for Claim': {
    label: 'Ready to Claim', colorKey: 'ready', icon: Package,
    description: 'Funds are ready — present your Claim Code to collect.',
    stage: 4, nextStep: 'Collect your payout', ownerRole: 'Requestor',
  },
  'Completed': {
    label: 'Completed', colorKey: 'complete', icon: CheckCircle,
    description: 'Paid out and closed.',
    stage: 5, ownerRole: undefined,
  },
  'Rejected': {
    label: 'Rejected', colorKey: 'rejected', icon: XCircle,
    description: 'Declined by the Approver.',
    stage: -1, ownerRole: 'Requestor',
  },
  'Returned': {
    label: 'Returned for Revision', colorKey: 'returned', icon: ArrowUUpLeft,
    description: 'Sent back to the Requestor for changes.',
    stage: 0, nextStep: 'Revise and resubmit', ownerRole: 'Requestor',
  },

  // --- CashAdvance-only ---
  'Submitted': {
    label: 'Submitted', colorKey: 'pending', icon: Clock,
    description: 'Awaiting a decision from your Approver.',
    stage: 1, nextStep: 'Awaiting Approver decision', ownerRole: 'Approver',
  },
  'Released': {
    label: 'Released', colorKey: 'ready', icon: Package,
    description: 'Funds released — liquidation is required afterward.',
    stage: 3, nextStep: 'File your liquidation report', ownerRole: 'Requestor',
  },
  'Liquidated': {
    label: 'Liquidated', colorKey: 'complete', icon: CheckCircle,
    description: 'Liquidation completed and closed.',
    stage: 4, ownerRole: undefined,
  },

  // --- Liquidation-only ---
  'ReturnedForRevision': {
    label: 'Returned for Revision', colorKey: 'returned', icon: ArrowUUpLeft,
    description: 'Sent back to the Requestor for changes.',
    stage: 0, nextStep: 'Revise and resubmit', ownerRole: 'Requestor',
  },
  'Reviewed': {
    label: 'Reviewed', colorKey: 'processing', icon: ArrowsClockwise,
    description: 'Reviewed by the Approver — awaiting the Custodian to close it out.',
    stage: 2, nextStep: 'Awaiting Custodian action', ownerRole: 'Custodian',
  },
  'Closed': {
    label: 'Closed', colorKey: 'complete', icon: CheckCircle,
    description: 'Liquidation closed and settled.',
    stage: 3, ownerRole: undefined,
  },

  // --- SupportRequest-only ---
  'Open': {
    label: 'Open', colorKey: 'pending', icon: FolderOpen,
    description: 'New request awaiting a response.',
    stage: 0, nextStep: 'Awaiting Admin response', ownerRole: 'Admin',
  },
  'In Progress': {
    label: 'In Progress', colorKey: 'processing', icon: ArrowsClockwise,
    description: 'An Admin is working on this request.',
    stage: 1, nextStep: 'Awaiting Admin update', ownerRole: 'Admin',
  },
  'Resolved': {
    label: 'Resolved', colorKey: 'complete', icon: CheckCircle,
    description: 'Request resolved.',
    stage: 2, ownerRole: undefined,
  },

  // --- ReviewMeeting-only (existing enum, same duplication problem — folded
  // into the same single source of truth rather than left as a third
  // reimplementation of label/color logic) ---
  'PendingConfirmation': {
    label: 'Pending Confirmation', colorKey: 'pending', icon: Clock,
    description: 'Awaiting your Approver to confirm the proposed time.',
    stage: 0, nextStep: 'Awaiting confirmation', ownerRole: 'Approver',
  },
  'Confirmed': {
    label: 'Confirmed', colorKey: 'approved', icon: CheckCircle,
    description: 'Confirmed by the Approver.',
    stage: 1, ownerRole: undefined,
  },
  'DeclineRequested': {
    label: 'Declined — Please Reschedule', colorKey: 'rejected', icon: XCircle,
    description: 'Declined by the Approver — propose a new time.',
    stage: 0, nextStep: 'Propose a new time', ownerRole: 'Requestor',
  },

  // --- ApproverDelegation-only ---
  'Pending': {
    label: 'Pending', colorKey: 'pending', icon: Clock,
    description: 'Waiting for the delegate to accept or decline.',
    stage: 0, nextStep: 'Awaiting delegate response', ownerRole: 'Delegate',
  },
  'Active': {
    label: 'Active', colorKey: 'approved', icon: CheckCircle,
    description: 'Accepted — claims are currently routing to the delegate.',
    stage: 1, ownerRole: undefined,
  },
  'Declined': {
    label: 'Declined', colorKey: 'rejected', icon: XCircle,
    description: 'The delegate declined this request.',
    stage: -1, ownerRole: 'Approver',
  },
  'Expired': {
    label: 'Expired', colorKey: 'draft', icon: FolderOpen,
    description: "The delegation window has ended.",
    stage: 2, ownerRole: undefined,
  },
  'Cancelled': {
    label: 'Cancelled', colorKey: 'draft', icon: XCircle,
    description: 'Cancelled by the Approver before it ended.',
    stage: -1, ownerRole: undefined,
  },
};

export const getStatusConfig = (status: string | undefined | null): StatusMeta =>
  (status && STATUS_CONFIG[status]) || FALLBACK;

export const getStatusBadgeClass = (status: string | undefined | null): string =>
  `corp-badge-${getStatusConfig(status).colorKey}`;

export const getStatusIconContainerClass = (status: string | undefined | null): string =>
  `status-icon-${getStatusConfig(status).colorKey}`;

// --- Workflow stage helpers (progress indicators) ---
// Each entity's linear happy-path, in display order. Rejected/Returned are
// branch states, not steps on this line — callers show them via a distinct
// "variant" on WorkflowTimeline instead of inserting them into the track.
export const CLAIM_WORKFLOW_STAGES = [
  { key: 'draft', label: 'Draft', status: ClaimStatus.DRAFT },
  { key: 'pending', label: 'Pending', status: ClaimStatus.PENDING_APPROVAL },
  { key: 'processing', label: 'Processing', status: ClaimStatus.PROCESSING },
  { key: 'ready', label: 'Ready', status: ClaimStatus.READY_FOR_CLAIM },
  { key: 'completed', label: 'Completed', status: ClaimStatus.COMPLETED },
];

export const CASH_ADVANCE_WORKFLOW_STAGES = [
  { key: 'draft', label: 'Draft', status: CashAdvanceStatus.DRAFT },
  { key: 'submitted', label: 'Submitted', status: CashAdvanceStatus.SUBMITTED },
  { key: 'approved', label: 'Approved', status: CashAdvanceStatus.APPROVED },
  { key: 'released', label: 'Released', status: CashAdvanceStatus.RELEASED },
  { key: 'liquidated', label: 'Liquidated', status: CashAdvanceStatus.LIQUIDATED },
];

export const LIQUIDATION_WORKFLOW_STAGES = [
  { key: 'draft', label: 'Draft', status: LiquidationStatus.DRAFT },
  { key: 'submitted', label: 'Submitted', status: LiquidationStatus.SUBMITTED },
  { key: 'reviewed', label: 'Reviewed', status: LiquidationStatus.REVIEWED },
  { key: 'closed', label: 'Closed', status: LiquidationStatus.CLOSED },
];

export const SUPPORT_WORKFLOW_STAGES = [
  { key: 'open', label: 'Open', status: SupportRequestStatus.OPEN },
  { key: 'in_progress', label: 'In Progress', status: SupportRequestStatus.IN_PROGRESS },
  { key: 'resolved', label: 'Resolved', status: SupportRequestStatus.RESOLVED },
];

/**
 * Index of `status` within `stages`' happy path, for a linear progress
 * indicator. Branch states (Rejected/Returned) map to the stage they
 * branched from — 0 for Returned (back to Draft-equivalent), 1 for Rejected
 * (they were under review when declined) — callers layer the branch
 * styling (color/label) on top via WorkflowTimeline's `variant` prop.
 */
export const getWorkflowStageIndex = (
  stages: { status: string }[],
  status: ClaimStatus | CashAdvanceStatus | LiquidationStatus | SupportRequestStatus,
): number => {
  const idx = stages.findIndex(s => s.status === status);
  if (idx !== -1) return idx;
  if (status === ClaimStatus.RETURNED || status === LiquidationStatus.RETURNED_FOR_REVISION) return 0;
  if (status === ClaimStatus.REJECTED || status === CashAdvanceStatus.REJECTED) return 1;
  return 0;
};

// --- Aging (waiting-time) helper ---
// Single source of truth for "waiting N days" indicators. Thresholds reuse
// the existing warning/danger semantic tokens — not new colors.
export interface AgingInfo {
  days: number;
  label: string;
  /** 'danger' past the long threshold, 'warning' past the short one, 'neutral' otherwise. */
  severity: 'neutral' | 'warning' | 'danger';
  badgeClass: string;
}

export const getAgingInfo = (
  sinceISODate: string,
  thresholds: { warningDays: number; dangerDays: number } = { warningDays: 3, dangerDays: 5 },
): AgingInfo => {
  const days = Math.floor((Date.now() - new Date(sinceISODate).getTime()) / (1000 * 60 * 60 * 24));
  const label = days <= 0 ? 'Today' : `Waiting ${days} day${days === 1 ? '' : 's'}`;
  const severity: AgingInfo['severity'] =
    days >= thresholds.dangerDays ? 'danger' : days >= thresholds.warningDays ? 'warning' : 'neutral';
  const badgeClass =
    severity === 'danger' ? 'bg-red-50 text-red-700 border-red-200'
    : severity === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-100 text-gray-700 border-gray-200';
  return { days, label, severity, badgeClass };
};
