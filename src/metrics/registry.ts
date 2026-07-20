// Central metric registry. Every dashboard number/chart is defined here as data,
// not as a one-off calculation inline in a component. Dashboards render by
// filtering this array by role — they never know about an individual metric.
//
// To add a metric: add one entry below with its scope, roles, and compute
// function. Nothing else needs to change — no filter wiring, no date math,
// no card layout code.

import {
  Claim, ClaimStatus, CashAdvance, CashAdvanceStatus,
  Liquidation, LiquidationStatus, LiquidationVarianceType, User, UserRole,
} from '../types';
import { TimeScope, DateRange, isWithinRange } from './timeScope';
import { CardVariant } from '../components/dashboard/KPICard';

export interface MetricContext {
  claims: Claim[];
  cashAdvances: CashAdvance[];
  liquidations: Liquidation[];
  users: User[];
  currentUser: User;
}

export type MetricFormat = 'number' | 'currency' | 'percent' | 'hours' | 'text';

export interface MetricDefinition {
  id: string;
  label: string;
  scope: TimeScope;
  realtime: boolean; // true = always live, ignores the global Dashboard Period filter
  roles: UserRole[];
  format: MetricFormat;
  description?: string;
  /** Which dashboard section this belongs to, for grouping (e.g. "All Time" stats get visually separated). */
  section?: 'primary' | 'all_time';
  /** Card color, based on what the metric MEANS (actionable/positive/negative/backlog/neutral) — not derived from realtime or zero-ness. */
  variant: CardVariant;
  compute: (ctx: MetricContext, range: DateRange) => number | string;
}

const round = (n: number) => Math.round(n * 10) / 10;

// --- shared helpers -------------------------------------------------------

/** Timestamp a claim entered a given status, from its enriched .history[]. */
const historyEnteredAt = (claim: Claim, status: ClaimStatus): string | undefined => {
  const anyClaim = claim as any;
  const entries: any[] = anyClaim.history || [];
  const hit = entries.find(h => h.new_status === status);
  return hit?.timestamp;
};

const directReportIds = (users: User[], approverId: string): Set<string> =>
  new Set(users.filter(u => u.reports_to === approverId).map(u => u.id));

// --- APPROVER --------------------------------------------------------------

const approverMetrics: MetricDefinition[] = [
  {
    id: 'approver_pending_approvals',
    label: 'Pending Approvals',
    scope: 'today',
    realtime: true,
    roles: [UserRole.APPROVER],
    format: 'number',
    variant: 'action',
    description: 'Claims from direct reports awaiting your decision',
    compute: ({ claims, currentUser }) =>
      claims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL && c.current_approver_id === currentUser.id).length,
  },
  {
    id: 'approver_claims_awaiting_action',
    label: 'Claims Awaiting Action',
    scope: 'today',
    realtime: true,
    roles: [UserRole.APPROVER],
    format: 'number',
    variant: 'action',
    description: 'Reimbursements, Cash Advances & Liquidations needing your review',
    compute: ({ claims, cashAdvances, liquidations, currentUser }) => {
      const pendingClaims = claims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL && c.current_approver_id === currentUser.id).length;
      const pendingCadvs = cashAdvances.filter(c => c.status === CashAdvanceStatus.SUBMITTED && c.approverId === currentUser.id).length;
      const pendingLiqs = liquidations.filter(l =>
        l.status === LiquidationStatus.SUBMITTED &&
        cashAdvances.find(ca => ca.id === l.cashAdvanceId)?.approverId === currentUser.id
      ).length;
      return pendingClaims + pendingCadvs + pendingLiqs;
    },
  },
  {
    id: 'approver_claims_submitted',
    label: 'Claims Submitted',
    scope: 'this_month',
    realtime: false,
    roles: [UserRole.APPROVER],
    format: 'number',
    variant: 'info',
    description: 'Submitted by your direct reports',
    compute: ({ claims, users, currentUser }, range) => {
      const reports = directReportIds(users, currentUser.id);
      return claims.filter(c => reports.has(c.requestor_id) && isWithinRange(c.created_at, range)).length;
    },
  },
  {
    id: 'approver_team_spending',
    label: 'Team Spending',
    scope: 'this_month',
    realtime: false,
    roles: [UserRole.APPROVER],
    format: 'currency',
    variant: 'info',
    description: 'Total claim value from your direct reports',
    compute: ({ claims, users, currentUser }, range) => {
      const reports = directReportIds(users, currentUser.id);
      return claims
        .filter(c => reports.has(c.requestor_id) && isWithinRange(c.created_at, range))
        .reduce((sum, c) => sum + (c.total_amount || 0), 0);
    },
  },
  {
    id: 'approver_approval_rate',
    label: 'Approval Rate',
    scope: 'last_30_days',
    realtime: false,
    roles: [UserRole.APPROVER],
    format: 'percent',
    variant: 'info',
    description: 'Of decisions you made',
    compute: ({ claims, currentUser }, range) => {
      const decisions = claims.flatMap(c => (c as any).approvals || [])
        .filter((a: any) => a.approver_id === currentUser.id && isWithinRange(a.timestamp, range));
      if (decisions.length === 0) return 0;
      const approved = decisions.filter((a: any) => a.decision === 'Approved').length;
      return round((approved / decisions.length) * 100);
    },
  },
  {
    id: 'approver_avg_approval_time',
    label: 'Average Approval Time',
    scope: 'last_30_days',
    realtime: false,
    roles: [UserRole.APPROVER],
    format: 'hours',
    variant: 'info',
    description: 'Submission to your decision',
    compute: ({ claims, currentUser }, range) => {
      const decided = claims.filter(c =>
        (c as any).approvals?.some((a: any) => a.approver_id === currentUser.id && a.decision === 'Approved' && isWithinRange(a.timestamp, range))
      );
      if (decided.length === 0) return 0;
      const totalHours = decided.reduce((sum, c) => {
        const approval = (c as any).approvals.find((a: any) => a.approver_id === currentUser.id && a.decision === 'Approved');
        const submitted = new Date(c.created_at).getTime();
        const decidedAt = new Date(approval.timestamp).getTime();
        return sum + Math.max(0, (decidedAt - submitted) / (1000 * 60 * 60));
      }, 0);
      return round(totalHours / decided.length);
    },
  },
];

// --- REQUESTOR ---------------------------------------------------------------

const requestorMetrics: MetricDefinition[] = [
  {
    id: 'requestor_my_claims',
    label: 'My Claims',
    scope: 'this_month',
    realtime: false,
    roles: [UserRole.REQUESTOR],
    format: 'number',
    variant: 'info',
    description: 'Claims you submitted',
    compute: ({ claims, currentUser }, range) =>
      claims.filter(c => c.requestor_id === currentUser.id && isWithinRange(c.created_at, range)).length,
  },
  {
    id: 'requestor_pending_claims',
    label: 'Pending Claims',
    scope: 'today',
    realtime: true,
    roles: [UserRole.REQUESTOR],
    format: 'number',
    variant: 'action',
    description: 'Awaiting approval or your revision',
    compute: ({ claims, currentUser }) =>
      claims.filter(c => c.requestor_id === currentUser.id && [ClaimStatus.PENDING_APPROVAL, ClaimStatus.RETURNED].includes(c.status)).length,
  },
  {
    id: 'requestor_approved_this_month',
    label: 'Approved',
    scope: 'this_month',
    realtime: false,
    roles: [UserRole.REQUESTOR],
    format: 'number',
    variant: 'success',
    description: 'Moved past approval this month',
    compute: ({ claims, currentUser }, range) =>
      claims.filter(c => {
        if (c.requestor_id !== currentUser.id) return false;
        const enteredProcessing = historyEnteredAt(c, ClaimStatus.PROCESSING);
        return isWithinRange(enteredProcessing, range);
      }).length,
  },
  {
    id: 'requestor_rejected_this_month',
    label: 'Rejected',
    scope: 'this_month',
    realtime: false,
    roles: [UserRole.REQUESTOR],
    format: 'number',
    variant: 'danger',
    description: 'Declined this month',
    compute: ({ claims, currentUser }, range) =>
      claims.filter(c => {
        if (c.requestor_id !== currentUser.id || c.status !== ClaimStatus.REJECTED) return false;
        const rejectedAt = historyEnteredAt(c, ClaimStatus.REJECTED);
        return isWithinRange(rejectedAt, range);
      }).length,
  },
  {
    id: 'requestor_amount_reimbursed_ytd',
    label: 'Amount Reimbursed',
    scope: 'this_year',
    realtime: false,
    roles: [UserRole.REQUESTOR],
    format: 'currency',
    variant: 'success',
    description: 'Completed & paid out this year',
    compute: ({ claims, currentUser }, range) =>
      claims
        .filter(c => c.requestor_id === currentUser.id && c.status === ClaimStatus.COMPLETED)
        .filter(c => isWithinRange(historyEnteredAt(c, ClaimStatus.COMPLETED) || c.updated_at, range))
        .reduce((sum, c) => sum + (c.total_amount || 0), 0),
  },
];

// --- CUSTODIAN ---------------------------------------------------------------

const custodianMetrics: MetricDefinition[] = [
  {
    id: 'custodian_pending_payments',
    label: 'Pending Payments',
    scope: 'today',
    realtime: true,
    roles: [UserRole.CUSTODIAN],
    format: 'number',
    variant: 'action',
    description: 'Approved claims awaiting disbursement',
    compute: ({ claims }) => claims.filter(c => c.status === ClaimStatus.PROCESSING).length,
  },
  {
    id: 'custodian_outstanding_amount',
    label: 'Outstanding Amount',
    scope: 'today',
    realtime: true,
    roles: [UserRole.CUSTODIAN],
    format: 'currency',
    variant: 'warning',
    description: 'Value not yet disbursed',
    compute: ({ claims }) => claims.filter(c => c.status === ClaimStatus.PROCESSING).reduce((s, c) => s + (c.total_amount || 0), 0),
  },
  {
    id: 'custodian_payments_this_week',
    label: 'Payments',
    scope: 'this_week',
    realtime: false,
    roles: [UserRole.CUSTODIAN],
    format: 'number',
    variant: 'info',
    description: 'Marked Ready for Claim this week',
    compute: ({ claims }, range) =>
      claims.filter(c => isWithinRange(historyEnteredAt(c, ClaimStatus.READY_FOR_CLAIM), range)).length,
  },
  {
    id: 'custodian_payments_this_month',
    label: 'Payments',
    scope: 'this_month',
    realtime: false,
    roles: [UserRole.CUSTODIAN],
    format: 'number',
    variant: 'info',
    description: 'Marked Ready for Claim this month',
    compute: ({ claims }, range) =>
      claims.filter(c => isWithinRange(historyEnteredAt(c, ClaimStatus.READY_FOR_CLAIM), range)).length,
  },
  {
    id: 'custodian_monthly_reimbursement_total',
    label: 'Monthly Reimbursement Total',
    scope: 'this_month',
    realtime: false,
    roles: [UserRole.CUSTODIAN],
    format: 'currency',
    variant: 'info',
    description: 'Value released this month',
    compute: ({ claims }, range) =>
      claims
        .filter(c => isWithinRange(historyEnteredAt(c, ClaimStatus.READY_FOR_CLAIM), range))
        .reduce((s, c) => s + (c.total_amount || 0), 0),
  },
  {
    id: 'custodian_avg_processing_time',
    label: 'Average Payment Processing Time',
    scope: 'last_30_days',
    realtime: false,
    roles: [UserRole.CUSTODIAN],
    format: 'hours',
    variant: 'info',
    description: 'Approved to Ready-for-Claim',
    compute: ({ claims }, range) => {
      const processed = claims.filter(c => isWithinRange(historyEnteredAt(c, ClaimStatus.READY_FOR_CLAIM), range));
      if (processed.length === 0) return 0;
      const totalHours = processed.reduce((sum, c) => {
        const startedAt = historyEnteredAt(c, ClaimStatus.PROCESSING);
        const readyAt = historyEnteredAt(c, ClaimStatus.READY_FOR_CLAIM);
        if (!startedAt || !readyAt) return sum;
        return sum + Math.max(0, (new Date(readyAt).getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60));
      }, 0);
      return round(totalHours / processed.length);
    },
  },
];

// --- ADMIN ---------------------------------------------------------------

const adminMetrics: MetricDefinition[] = [
  {
    id: 'admin_pending_approvals_systemwide',
    label: 'Pending Approvals (System-wide)',
    scope: 'today',
    realtime: true,
    roles: [UserRole.ADMIN],
    format: 'number',
    variant: 'warning',
    description: 'Claims currently awaiting an Approver decision, across every department',
    compute: ({ claims }) => claims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL).length,
  },
  {
    id: 'admin_monthly_claims',
    label: 'Monthly Claims',
    scope: 'this_month',
    realtime: false,
    roles: [UserRole.ADMIN],
    format: 'number',
    variant: 'info',
    description: 'Claims submitted this month',
    compute: ({ claims }, range) => claims.filter(c => isWithinRange(c.created_at, range)).length,
  },
  {
    id: 'admin_yearly_spending',
    label: 'Yearly Spending',
    scope: 'this_year',
    realtime: false,
    roles: [UserRole.ADMIN],
    format: 'currency',
    variant: 'info',
    description: 'Completed claims, calendar year to date',
    compute: ({ claims }, range) =>
      claims
        .filter(c => c.status === ClaimStatus.COMPLETED)
        .filter(c => isWithinRange(historyEnteredAt(c, ClaimStatus.COMPLETED) || c.updated_at, range))
        .reduce((s, c) => s + (c.total_amount || 0), 0),
  },
  {
    id: 'admin_active_users',
    label: 'Active Users',
    scope: 'this_month',
    realtime: false,
    roles: [UserRole.ADMIN],
    format: 'number',
    variant: 'info',
    description: 'Users with claim or approval activity this month',
    compute: ({ claims, users }, range) => {
      const active = new Set<string>();
      claims.forEach(c => {
        if (isWithinRange(c.created_at, range)) active.add(c.requestor_id);
        ((c as any).history || []).forEach((h: any) => {
          if (isWithinRange(h.timestamp, range) && h.changed_by) active.add(h.changed_by);
        });
      });
      return [...active].filter(id => users.some(u => u.id === id)).length;
    },
  },
  {
    id: 'admin_approval_performance',
    label: 'Approval Performance',
    scope: 'last_30_days',
    realtime: false,
    roles: [UserRole.ADMIN],
    format: 'percent',
    variant: 'info',
    description: 'Approved vs. all decisions system-wide',
    compute: ({ claims }, range) => {
      const decisions = claims.flatMap(c => (c as any).approvals || []).filter((a: any) => isWithinRange(a.timestamp, range));
      if (decisions.length === 0) return 0;
      const approved = decisions.filter((a: any) => a.decision === 'Approved').length;
      return round((approved / decisions.length) * 100);
    },
  },
];

const adminAllTimeMetrics: MetricDefinition[] = [
  {
    id: 'admin_total_employees',
    label: 'Total Employees',
    scope: 'all_time',
    realtime: false,
    roles: [UserRole.ADMIN],
    format: 'number',
    section: 'all_time',
    variant: 'info',
    compute: ({ users }) => users.length,
  },
  {
    id: 'admin_departments',
    label: 'Departments',
    scope: 'all_time',
    realtime: false,
    roles: [UserRole.ADMIN],
    format: 'number',
    section: 'all_time',
    variant: 'info',
    compute: ({ users }) => new Set(users.map(u => u.department).filter(Boolean)).size,
  },
  {
    id: 'admin_years_using_system',
    label: 'Years Using System',
    scope: 'all_time',
    realtime: false,
    roles: [UserRole.ADMIN],
    format: 'number',
    section: 'all_time',
    variant: 'info',
    description: 'Span between earliest and latest claim record',
    compute: ({ claims }) => {
      if (claims.length === 0) return 0;
      const dates = claims.map(c => new Date(c.created_at).getTime());
      const spanYears = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24 * 365);
      return Math.max(1, Math.round(spanYears * 10) / 10);
    },
  },
  {
    id: 'admin_overall_claims_processed',
    label: 'Overall Claims Processed',
    scope: 'all_time',
    realtime: false,
    roles: [UserRole.ADMIN],
    format: 'number',
    section: 'all_time',
    variant: 'success',
    description: 'Lifetime / archival total',
    compute: ({ claims }) => claims.filter(c => c.status === ClaimStatus.COMPLETED).length,
  },
];

export const allMetrics: MetricDefinition[] = [
  ...approverMetrics,
  ...requestorMetrics,
  ...custodianMetrics,
  ...adminMetrics,
  ...adminAllTimeMetrics,
];

export const metricsForRole = (role: UserRole): MetricDefinition[] =>
  allMetrics.filter(m => m.roles.includes(role));

export const getMetric = (id: string): MetricDefinition | undefined =>
  allMetrics.find(m => m.id === id);
