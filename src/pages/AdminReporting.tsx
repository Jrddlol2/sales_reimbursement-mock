import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Claim, ClaimStatus, CashAdvance, CashAdvanceStatus, Liquidation, LiquidationVarianceType, ReviewMeeting, ReviewMeetingStatus, User } from '../types';
import { SimpleLineChart, SimpleBarChart, DonutChart, CHART_COLORS } from '../components/dashboard/AnalyticsCharts';
import { StatusBadge } from '../components/StatusBadge';
import { formatPHP } from '../utils';
import { ChartBar, CaretDown } from '@phosphor-icons/react';

type RequestorSortKey = 'spend' | 'count' | 'avg';
type ApproverSortKey = 'decisions' | 'rate' | 'time';

// Mirrors LIQUIDATION_DEADLINE_DAYS in server.ts — how many days a
// Requestor has to file a liquidation after a cash advance is released.
const LIQUIDATION_DEADLINE_DAYS = 7;

// A claim sitting this long in a single non-terminal status gets flagged
// for attention on the Aging table.
const AGING_WARNING_DAYS = 5;

const NON_TERMINAL_STATUSES = [ClaimStatus.PENDING_APPROVAL, ClaimStatus.APPROVED, ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM];

// --- Global date window (Phase 1) ------------------------------------------
// Every analytical section reads from one user-controlled window so the page
// never shows two silently-different time scopes side by side. `start`/`end`
// null means unbounded (All Time). Anchored on each entity's creation date.
type DatePreset = 'all_time' | 'this_month' | 'last_month' | 'specific_month' | 'this_quarter' | 'this_year' | 'specific_year' | 'last_30' | 'last_90' | 'last_year' | 'custom';

interface DateWindow { start: Date | null; end: Date | null; label: string; }

const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'all_time', label: 'All Time' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'specific_month', label: 'Specific Month…' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year (YTD)' },
  { value: 'specific_year', label: 'Specific Year…' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'last_90', label: 'Last 90 Days' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

const resolveDateWindow = (preset: DatePreset, customStart?: string, customEnd?: string, specificMonth?: string, specificYear?: string): DateWindow => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case 'this_month':
      return { start: startOfDay(new Date(y, m, 1)), end: now, label: 'This Month' };
    case 'last_month':
      return { start: startOfDay(new Date(y, m - 1, 1)), end: endOfDay(new Date(y, m, 0)), label: 'Last Month' };
    case 'specific_month': {
      // specificMonth is an <input type="month"> value: "YYYY-MM"
      if (!specificMonth) return { start: null, end: null, label: 'Specific Month' };
      const [sy, sm] = specificMonth.split('-').map(Number);
      return {
        start: startOfDay(new Date(sy, sm - 1, 1)),
        end: endOfDay(new Date(sy, sm, 0)),
        label: `${MONTH_NAMES[sm - 1]} ${sy}`,
      };
    }
    case 'this_quarter': {
      const q = Math.floor(m / 3);
      return { start: startOfDay(new Date(y, q * 3, 1)), end: now, label: 'This Quarter' };
    }
    case 'this_year':
      return { start: startOfDay(new Date(y, 0, 1)), end: now, label: 'This Year' };
    case 'specific_year': {
      if (!specificYear) return { start: null, end: null, label: 'Specific Year' };
      const sy = Number(specificYear);
      return { start: startOfDay(new Date(sy, 0, 1)), end: endOfDay(new Date(sy, 11, 31)), label: String(sy) };
    }
    case 'last_30': {
      const start = startOfDay(now); start.setDate(start.getDate() - 29);
      return { start, end: now, label: 'Last 30 Days' };
    }
    case 'last_90': {
      const start = startOfDay(now); start.setDate(start.getDate() - 89);
      return { start, end: now, label: 'Last 90 Days' };
    }
    case 'last_year':
      return { start: startOfDay(new Date(y - 1, 0, 1)), end: endOfDay(new Date(y - 1, 11, 31)), label: 'Last Year' };
    case 'custom':
      return {
        start: customStart ? startOfDay(new Date(customStart)) : null,
        end: customEnd ? endOfDay(new Date(customEnd)) : null,
        label: 'Custom Range',
      };
    case 'all_time':
    default:
      return { start: null, end: null, label: 'All Time' };
  }
};

const inWindow = (dateStr: string | undefined, win: DateWindow): boolean => {
  if (!win.start && !win.end) return true;
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  if (win.start && t < win.start.getTime()) return false;
  if (win.end && t > win.end.getTime()) return false;
  return true;
};

const fmtWindowDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

type EnrichedReviewMeeting = ReviewMeeting & {
  requestor_name: string;
  approver_name: string;
  claim_number?: string;
  total_amount?: number;
};

interface HistoryEntry {
  id: string;
  claim_id: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  reason?: string;
  timestamp: string;
}

// Walks each claim's StatusHistory (sorted oldest-first) and measures the
// gap between consecutive stage transitions: submitted, approved,
// processing-started, and completed/ready-for-claim (whichever lands
// first). Takes the FIRST occurrence of each status after the previous
// stage's timestamp, so a claim that got Returned and resubmitted still
// measures its actual (last) successful run through the pipeline, not the
// original attempt.
const computeStageDurations = (history: HistoryEntry[]) => {
  const byClaim: Record<string, HistoryEntry[]> = {};
  history.forEach(h => {
    if (!h.claim_id) return;
    if (!byClaim[h.claim_id]) byClaim[h.claim_id] = [];
    byClaim[h.claim_id].push(h);
  });

  const stage1Days: number[] = []; // Pending Approval -> Approved
  const stage2Days: number[] = []; // Approved -> Processing
  const stage3Days: number[] = []; // Processing -> Completed/Ready for Claim

  Object.values(byClaim).forEach(entries => {
    const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const findAfter = (status: string, after: number) =>
      sorted.find(h => h.new_status === status && new Date(h.timestamp).getTime() >= after);

    const submitted = sorted.find(h => h.new_status === ClaimStatus.PENDING_APPROVAL);
    if (!submitted) return;
    const submittedAt = new Date(submitted.timestamp).getTime();

    const approved = findAfter(ClaimStatus.APPROVED, submittedAt);
    if (approved) {
      stage1Days.push((new Date(approved.timestamp).getTime() - submittedAt) / (1000 * 60 * 60 * 24));
    }

    const processing = approved ? findAfter(ClaimStatus.PROCESSING, new Date(approved.timestamp).getTime()) : undefined;
    if (approved && processing) {
      stage2Days.push((new Date(processing.timestamp).getTime() - new Date(approved.timestamp).getTime()) / (1000 * 60 * 60 * 24));
    }

    if (processing) {
      const processingAt = new Date(processing.timestamp).getTime();
      const completedCandidates = sorted.filter(h =>
        (h.new_status === ClaimStatus.COMPLETED || h.new_status === ClaimStatus.READY_FOR_CLAIM) &&
        new Date(h.timestamp).getTime() >= processingAt
      );
      if (completedCandidates.length > 0) {
        const completed = completedCandidates[0];
        stage3Days.push((new Date(completed.timestamp).getTime() - processingAt) / (1000 * 60 * 60 * 24));
      }
    }
  });

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return [
    { name: 'Submitted → Approved', days: avg(stage1Days), sampleSize: stage1Days.length },
    { name: 'Approved → Processing', days: avg(stage2Days), sampleSize: stage2Days.length },
    { name: 'Processing → Completed', days: avg(stage3Days), sampleSize: stage3Days.length },
  ];
};

interface ApproverStat {
  approverId: string;
  decisions: number;
  approved: number;
  rejected: number;
  approvalRate: number; // % of Approved+Rejected that were Approved
  avgDecisionDays: number;
}

// For each claim's decision transition (Pending Approval -> Approved or
// Rejected), credits the person who made it (changed_by on the decision
// row) and measures how long it took from the Pending Approval entry. Same
// pairing approach as computeStageDurations, but grouped by approver rather
// than averaged system-wide.
const computeApproverStats = (history: HistoryEntry[]): ApproverStat[] => {
  const byClaim: Record<string, HistoryEntry[]> = {};
  history.forEach(h => {
    if (!h.claim_id) return;
    if (!byClaim[h.claim_id]) byClaim[h.claim_id] = [];
    byClaim[h.claim_id].push(h);
  });

  const acc: Record<string, { approved: number; rejected: number; totalDays: number }> = {};

  Object.values(byClaim).forEach(entries => {
    const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const submitted = sorted.find(h => h.new_status === ClaimStatus.PENDING_APPROVAL);
    if (!submitted) return;
    const submittedAt = new Date(submitted.timestamp).getTime();

    const decision = sorted.find(h =>
      (h.new_status === ClaimStatus.APPROVED || h.new_status === ClaimStatus.REJECTED) &&
      new Date(h.timestamp).getTime() >= submittedAt
    );
    if (!decision || !decision.changed_by) return;

    if (!acc[decision.changed_by]) acc[decision.changed_by] = { approved: 0, rejected: 0, totalDays: 0 };
    const bucket = acc[decision.changed_by];
    if (decision.new_status === ClaimStatus.APPROVED) bucket.approved += 1;
    else bucket.rejected += 1;
    bucket.totalDays += (new Date(decision.timestamp).getTime() - submittedAt) / (1000 * 60 * 60 * 24);
  });

  return Object.entries(acc).map(([approverId, b]) => {
    const decisions = b.approved + b.rejected;
    return {
      approverId,
      decisions,
      approved: b.approved,
      rejected: b.rejected,
      approvalRate: decisions > 0 ? (b.approved / decisions) * 100 : 0,
      avgDecisionDays: decisions > 0 ? b.totalDays / decisions : 0,
    };
  });
};

export const AdminReporting: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cadvs, setCadvs] = useState<CashAdvance[]>([]);
  const [liquidations, setLiquidations] = useState<(Liquidation & { cashAdvance?: CashAdvance })[]>([]);
  const [reviewMeetings, setReviewMeetings] = useState<EnrichedReviewMeeting[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [highValueThreshold, setHighValueThreshold] = useState<number>(15000);
  const [loading, setLoading] = useState(true);
  const [reqSortKey, setReqSortKey] = useState<RequestorSortKey>('spend');
  const [approverSortKey, setApproverSortKey] = useState<ApproverSortKey>('decisions');
  // Default 'all_time' so the page's on-load numbers match the pre-filter
  // behaviour exactly (no surprise regression); the control demonstrates its
  // power on interaction.
  const [datePreset, setDatePreset] = useState<DatePreset>('all_time');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [specificMonth, setSpecificMonth] = useState('');
  const [specificYear, setSpecificYear] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch('/api/claims'),
      apiFetch('/api/cash-advances'),
      apiFetch('/api/liquidations'),
      apiFetch('/api/review-meetings'),
      apiFetch('/api/history'),
      apiFetch('/api/users'),
      apiFetch('/api/admin/settings')
    ]).then(([cData, caData, liqData, rmData, hData, uData, sData]) => {
      setClaims(cData);
      setCadvs(caData);
      setLiquidations(liqData);
      setReviewMeetings(rmData);
      setHistory(hData);
      setUsers(uData);
      if (typeof sData?.highValueThreshold === 'number') setHighValueThreshold(sData.highValueThreshold);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading reports...</div>;
  }

  // Active date window — the single scope every analytical section obeys.
  const win = resolveDateWindow(datePreset, customStart, customEnd, specificMonth, specificYear);

  // Years actually present in the data, newest first, for the "Specific
  // Year" picker — avoids offering years with no records to select.
  const availableYears = Array.from(new Set(claims.map(c => new Date(c.created_at).getFullYear())))
    .filter(y => !isNaN(y))
    .sort((a, b) => b - a);

  // Scoped datasets. Every analytical aggregation below reads from these so
  // the whole page shares one user-controlled window (anchored on each
  // entity's creation date). The two exception sections (Claims Aging,
  // Overdue Review Meetings) deliberately keep using the full unscoped
  // arrays — they are "as of now" snapshots, not period analytics.
  const scopedClaims = claims.filter(c => inWindow(c.created_at, win));
  const scopedClaimIds = new Set(scopedClaims.map(c => c.id));
  const scopedCadvs = cadvs.filter(ca => inWindow(ca.createdAt, win));
  const scopedLiquidations = liquidations.filter(l => inWindow(l.createdAt, win));
  const scopedHistory = history.filter(h => scopedClaimIds.has(h.claim_id));

  // Calculate stats
  const completedClaims = scopedClaims.filter(c => c.status === ClaimStatus.COMPLETED);
  const totalSpend = completedClaims.reduce((acc, c) => {
    return acc + (c.expenses?.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) || 0);
  }, 0);

  // Spend by Category
  const categorySpend: Record<string, number> = {};
  completedClaims.forEach(c => {
    c.expenses?.forEach((e: any) => {
      categorySpend[e.category] = (categorySpend[e.category] || 0) + Number(e.amount || 0);
    });
  });
  const categoryData = Object.entries(categorySpend)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Spend Trend (by month) — keyed by year+month so the axis sorts
  // chronologically and Jan of one year never merges with Jan of another.
  const monthlyBuckets: Record<string, { label: string; total: number }> = {};
  completedClaims.forEach(c => {
    const d = new Date(c.updated_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short' });
    if (!monthlyBuckets[key]) monthlyBuckets[key] = { label, total: 0 };
    monthlyBuckets[key].total += c.expenses?.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) || 0;
  });
  const trendData = Object.keys(monthlyBuckets)
    .sort()
    .map(key => ({ name: monthlyBuckets[key].label, Total: monthlyBuckets[key].total }));

  // Requests by Department — now scoped to the global window (previously
  // hardcoded to "this month", which was the main scope-mixing offender).
  const departmentData = () => {
    const deps: Record<string, number> = {};
    scopedClaims.forEach(c => {
      const u = users.find(u => u.id === c.requestor_id);
      if (u) deps[u.department] = (deps[u.department] || 0) + 1;
    });
    return Object.keys(deps).map(k => ({ name: k, count: deps[k] }));
  };

  // Spend by Department — completed claims only, same scope as the category
  // breakdown above, just bucketed by the requestor's department instead.
  const departmentSpend: Record<string, number> = {};
  completedClaims.forEach(c => {
    const dept = users.find(u => u.id === c.requestor_id)?.department;
    if (!dept) return;
    const spend = c.expenses?.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) || 0;
    departmentSpend[dept] = (departmentSpend[dept] || 0) + spend;
  });
  const departmentSpendData = Object.entries(departmentSpend)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Top Requestors — same completed-claims scope, grouped per person instead
  // of per department, so a single big spender inside a department is
  // visible instead of getting averaged away.
  const requestorStats: Record<string, { count: number; spend: number }> = {};
  completedClaims.forEach(c => {
    const spend = c.expenses?.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) || 0;
    if (!requestorStats[c.requestor_id]) requestorStats[c.requestor_id] = { count: 0, spend: 0 };
    requestorStats[c.requestor_id].count += 1;
    requestorStats[c.requestor_id].spend += spend;
  });
  const requestorRows = Object.entries(requestorStats)
    .map(([requestorId, stats]) => {
      const u = users.find(u => u.id === requestorId);
      return {
        id: requestorId,
        name: u?.name || 'Unknown',
        department: u?.department || '—',
        count: stats.count,
        spend: stats.spend,
        avg: stats.spend / stats.count
      };
    })
    .sort((a, b) => {
      if (reqSortKey === 'count') return b.count - a.count;
      if (reqSortKey === 'avg') return b.avg - a.avg;
      return b.spend - a.spend;
    })
    .slice(0, 10);

  const requestorSortHeader = (key: RequestorSortKey, label: string) => (
    <th
      onClick={() => setReqSortKey(key)}
      className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display cursor-pointer hover:bg-slate-100 select-none"
    >
      <div className="flex items-center gap-1">
        {label}
        {reqSortKey === key ? <CaretDown className="w-3 h-3 text-brand" /> : <CaretDown className="w-3 h-3 text-transparent" />}
      </div>
    </th>
  );

  // Cash Advance & Liquidation Health
  // Outstanding float — released to the requestor, not yet liquidated.
  // LIQUIDATED is a separate terminal CashAdvanceStatus, so RELEASED alone
  // is exactly "money out the door, no liquidation filed yet."
  const outstandingFloat = scopedCadvs
    .filter(ca => ca.status === CashAdvanceStatus.RELEASED)
    .reduce((sum, ca) => sum + Number(ca.amount || 0), 0);

  // Deadline compliance — only liquidations whose parent cash advance has a
  // releaseDate can be judged (a liquidation with no release on record has
  // no deadline to compare against).
  const judgedLiquidations = scopedLiquidations.filter(l => l.cashAdvance?.releaseDate);
  const onTimeLiquidations = judgedLiquidations.filter(l => {
    const releaseDate = new Date(l.cashAdvance!.releaseDate!).getTime();
    const filedDate = new Date(l.createdAt).getTime();
    const daysToFile = (filedDate - releaseDate) / (1000 * 60 * 60 * 24);
    return daysToFile <= LIQUIDATION_DEADLINE_DAYS;
  });
  const onTimePct = judgedLiquidations.length > 0
    ? Math.round((onTimeLiquidations.length / judgedLiquidations.length) * 100)
    : null;
  const lateCount = judgedLiquidations.length - onTimeLiquidations.length;

  // Variance mix — how liquidations settle relative to the advance amount.
  const varianceLabels: Record<LiquidationVarianceType, string> = {
    [LiquidationVarianceType.SETTLED]: 'Settled',
    [LiquidationVarianceType.REFUND_DUE]: 'Refund Due',
    [LiquidationVarianceType.REIMBURSEMENT_DUE]: 'Reimbursement Due',
  };
  const varianceColors: Record<LiquidationVarianceType, string> = {
    [LiquidationVarianceType.SETTLED]: '#16a34a',
    [LiquidationVarianceType.REFUND_DUE]: '#2563eb',
    [LiquidationVarianceType.REIMBURSEMENT_DUE]: '#d97706',
  };
  const varianceCounts: Record<string, number> = {};
  scopedLiquidations.forEach(l => {
    varianceCounts[l.varianceType] = (varianceCounts[l.varianceType] || 0) + 1;
  });
  const varianceMixData = Object.entries(varianceCounts).map(([type, count]) => ({
    name: varianceLabels[type as LiquidationVarianceType] || type,
    value: count,
    color: varianceColors[type as LiquidationVarianceType]
  }));

  // Overdue Review Meetings — date has passed but nobody ever confirmed or
  // declined it. Confirmed/Declined/Completed meetings aren't "overdue,"
  // they were acted on; only a meeting still stuck Pending past its date
  // means it fell through the cracks.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const overdueMeetings = reviewMeetings
    .filter(rm => rm.status === ReviewMeetingStatus.PENDING_CONFIRMATION && new Date(rm.meeting_date) < todayStart)
    .map(rm => ({
      ...rm,
      daysOverdue: Math.max(1, Math.round((todayStart.getTime() - new Date(rm.meeting_date).getTime()) / (1000 * 60 * 60 * 24)))
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // Process Cycle Time — where claims actually spend their time.
  const stageDurations = computeStageDurations(scopedHistory);
  const stageDurationData = stageDurations.map(s => ({ name: s.name, days: Number(s.days.toFixed(1)) }));
  const slowestStage = stageDurations.reduce((max, s) => s.days > max.days ? s : max, stageDurations[0]);

  // Claims Aging — how long each still-open claim has sat in its CURRENT
  // status. Uses the latest StatusHistory entry (the transition INTO the
  // current status) as the clock start, not the claim's creation date, so a
  // claim that moved through several stages is measured from its last move,
  // not the very beginning.
  const nowMs = Date.now();
  const agingRows = claims
    .filter(c => NON_TERMINAL_STATUSES.includes(c.status))
    .map(c => {
      const claimHistory = history
        .filter(h => h.claim_id === c.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const latest = claimHistory[0];
      // Fall back to updated_at if this claim somehow has no history rows.
      const enteredAt = latest ? new Date(latest.timestamp).getTime() : new Date(c.updated_at).getTime();
      const daysInStatus = Math.max(0, Math.round((nowMs - enteredAt) / (1000 * 60 * 60 * 24)));
      const requestor = users.find(u => u.id === c.requestor_id);
      return {
        id: c.id,
        claim_number: c.claim_number,
        requestorName: requestor?.name || 'Unknown',
        status: c.status,
        amount: c.total_amount,
        daysInStatus,
      };
    })
    .sort((a, b) => b.daysInStatus - a.daysInStatus);
  const agingPastThreshold = agingRows.filter(r => r.daysInStatus >= AGING_WARNING_DAYS).length;

  // Approver Performance — decision volume, lenience, and speed per approver.
  const approverRows = computeApproverStats(scopedHistory)
    .map(stat => ({
      ...stat,
      name: users.find(u => u.id === stat.approverId)?.name || 'Unknown',
    }))
    .sort((a, b) => {
      if (approverSortKey === 'rate') return b.approvalRate - a.approvalRate;
      if (approverSortKey === 'time') return b.avgDecisionDays - a.avgDecisionDays;
      return b.decisions - a.decisions;
    });

  const approverSortHeader = (key: ApproverSortKey, label: string) => (
    <th
      onClick={() => setApproverSortKey(key)}
      className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display cursor-pointer hover:bg-slate-100 select-none"
    >
      <div className="flex items-center gap-1">
        {label}
        <CaretDown className={`w-3 h-3 ${approverSortKey === key ? 'text-brand' : 'text-transparent'}`} />
      </div>
    </th>
  );

  // Rejections by Department — rate = rejected / claims that reached a
  // decision (a claim counts as "decided" once it's Rejected or made it into
  // any post-approval status; Draft/Pending/Returned haven't been decided
  // yet, so they don't belong in the denominator).
  const DECIDED_STATUSES = [ClaimStatus.APPROVED, ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED, ClaimStatus.REJECTED];
  const deptRejection: Record<string, { decided: number; rejected: number }> = {};
  scopedClaims.forEach(c => {
    if (!DECIDED_STATUSES.includes(c.status)) return;
    const dept = users.find(u => u.id === c.requestor_id)?.department;
    if (!dept) return;
    if (!deptRejection[dept]) deptRejection[dept] = { decided: 0, rejected: 0 };
    deptRejection[dept].decided += 1;
    if (c.status === ClaimStatus.REJECTED) deptRejection[dept].rejected += 1;
  });
  const rejectionRateData = Object.entries(deptRejection)
    .map(([name, s]) => ({ name, value: Number(((s.rejected / s.decided) * 100).toFixed(1)) }))
    .sort((a, b) => b.value - a.value);

  // Top rejection reasons — the Approval.comment on each Rejected decision,
  // which is populated both by the live reject route and the seed data
  // (StatusHistory.reason is only reliably set by the seed, so it's the
  // less trustworthy source).
  const reasonCounts: Record<string, number> = {};
  scopedClaims.forEach(c => {
    if (c.status !== ClaimStatus.REJECTED) return;
    const rejApproval = (c.approvals || []).find((a: any) => a.decision === 'Rejected');
    const reason = (rejApproval?.comment || 'No reason recorded').replace(/^Rejected:\s*/i, '').trim();
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });
  const topRejectionReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // High-Value Flagged Claims — a claim is flagged if any single line item
  // exceeds the configured threshold. The server sets a `flagged_high_value`
  // bool on live-created claims, but seeded claims don't carry it, so we
  // recompute from the line items against the same threshold (matching the
  // server's `item.amount > threshold` rule) to stay correct on demo data.
  const isFlagged = (c: any) => (c.expenses || []).some((e: any) => Number(e.amount) > highValueThreshold);
  const flaggedClaims = scopedClaims
    .filter(isFlagged)
    .map(c => {
      const requestor = users.find(u => u.id === c.requestor_id);
      return {
        id: c.id,
        claim_number: c.claim_number,
        requestorId: c.requestor_id,
        requestorName: requestor?.name || 'Unknown',
        department: requestor?.department || '—',
        amount: c.total_amount,
        status: c.status,
        date: c.created_at,
      };
    })
    .sort((a, b) => b.amount - a.amount);
  const flaggedTotalValue = flaggedClaims.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const flaggedPct = scopedClaims.length > 0 ? (flaggedClaims.length / scopedClaims.length) * 100 : 0;

  const flaggerCounts: Record<string, { name: string; count: number }> = {};
  flaggedClaims.forEach(c => {
    if (!flaggerCounts[c.requestorId]) flaggerCounts[c.requestorId] = { name: c.requestorName, count: 0 };
    flaggerCounts[c.requestorId].count += 1;
  });
  const frequentFlaggers = Object.values(flaggerCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-display flex items-center gap-2">
          <ChartBar className="w-6 h-6 text-brand" /> System Reporting
        </h2>
        <p className="mt-1 text-xs text-slate-500">Comprehensive overview of platform analytics — the full deep-dive; the Dashboard only shows a summary.</p>
      </div>

      {/* Global date filter. Sticky so it stays reachable on the long page.
          Solid opaque background + high z-index so scrolling cards (and their
          absolutely-positioned chart labels) pass cleanly behind it instead
          of bleeding through. Kept inside the content column (no full-bleed
          negative margins — that combo fought `position: sticky` and left a
          gap). */}
      <div className="sticky top-0 z-30 bg-white border border-slate-200 rounded-xl shadow-md px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Period</span>
          <select
            value={datePreset}
            onChange={e => setDatePreset(e.target.value as DatePreset)}
            className="rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 px-2.5 py-1.5 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
          >
            {DATE_PRESET_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {datePreset === 'specific_month' && (
            <input
              type="month"
              value={specificMonth}
              onChange={e => setSpecificMonth(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 px-2 py-1.5 focus:border-brand focus:outline-none"
            />
          )}
          {datePreset === 'specific_year' && (
            <select
              value={specificYear}
              onChange={e => setSpecificYear(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 px-2.5 py-1.5 focus:border-brand focus:outline-none"
            >
              <option value="">Select year…</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          )}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white text-xs text-slate-800 px-2 py-1.5 focus:border-brand focus:outline-none"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white text-xs text-slate-800 px-2 py-1.5 focus:border-brand focus:outline-none"
              />
            </div>
          )}
        </div>
        <div className="text-[11px] text-slate-500 shrink-0">
          Showing:{' '}
          <span className="font-bold text-slate-700">
            {win.start && win.end
              ? `${fmtWindowDate(win.start)} – ${fmtWindowDate(win.end)}`
              : win.start
                ? `Since ${fmtWindowDate(win.start)}`
                : 'All records'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Spend (Completed)</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{formatPHP(totalSpend)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Completed Claims</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{completedClaims.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Claims (All Statuses)</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{scopedClaims.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Top Expense Categories</h3>
          <div className="h-64">
            <DonutChart data={categoryData} colors={CHART_COLORS} centerCaption="Total Spend" valueFormatter={formatPHP} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Monthly Spend Trend</h3>
          <div className="h-64">
            <SimpleLineChart data={trendData} dataKey="Total" name="Spend" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Requests by Department</h3>
          <div className="h-64">
            <SimpleBarChart data={departmentData()} dataKey="count" colors={CHART_COLORS} name="Requests" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Claim Volume by Status</h3>
          <div className="h-64">
            <SimpleBarChart data={[
               { name: 'Pending', count: scopedClaims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL).length, color: '#d97706' },
               { name: 'Processing', count: scopedClaims.filter(c => c.status === ClaimStatus.PROCESSING).length, color: '#7c3aed' },
               { name: 'Completed', count: scopedClaims.filter(c => c.status === ClaimStatus.COMPLETED).length, color: '#16a34a' },
               { name: 'Rejected', count: scopedClaims.filter(c => c.status === ClaimStatus.REJECTED).length, color: '#dc2626' }
            ]} dataKey="count" colors={['#d97706', '#7c3aed', '#16a34a', '#dc2626']} name="Claims" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Spend by Department</h3>
          <div className="h-64">
            <SimpleBarChart data={departmentSpendData} dataKey="value" colors={CHART_COLORS} name="Spend" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-sm font-bold text-slate-800">Top Requestors</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Name</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Dept</th>
                  {requestorSortHeader('count', 'Claims')}
                  {requestorSortHeader('spend', 'Total Spend')}
                  {requestorSortHeader('avg', 'Avg Claim')}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {requestorRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-400">No completed claims yet.</td>
                  </tr>
                ) : requestorRows.map(row => (
                  <tr key={row.id} className="hover:bg-brand/5 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{row.department}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 tabular-nums">{row.count}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-900 tabular-nums">{formatPHP(row.spend)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 tabular-nums">{formatPHP(row.avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-sm font-bold text-slate-800">Approver Performance</h3>
          <p className="text-xs text-slate-500 mt-0.5">Decision volume, approval rate, and turnaround time per approver.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Approver</th>
                {approverSortHeader('decisions', 'Decisions')}
                {approverSortHeader('rate', 'Approval Rate')}
                {approverSortHeader('time', 'Avg Decision Time')}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {approverRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">No approval decisions recorded yet.</td>
                </tr>
              ) : approverRows.map(row => (
                <tr key={row.approverId} className="hover:bg-brand/5 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-900">{row.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 tabular-nums">
                    {row.decisions} <span className="text-slate-400">({row.approved}✓ / {row.rejected}✗)</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-900 tabular-nums">{row.approvalRate.toFixed(0)}%</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 tabular-nums">{row.avgDecisionDays.toFixed(1)}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Rejection Rate by Department</h3>
          <div className="h-64">
            {rejectionRateData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No decided claims yet.</div>
            ) : (
              <SimpleBarChart data={rejectionRateData} dataKey="value" colors={CHART_COLORS} name="Rejection %" />
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Top Rejection Reasons</h3>
          {topRejectionReasons.length === 0 ? (
            <div className="text-xs text-slate-400">No rejections recorded yet.</div>
          ) : (
            <ul className="space-y-3">
              {topRejectionReasons.map((r, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <span className="text-xs text-slate-700 leading-snug">{r.reason}</span>
                  <span className="shrink-0 text-xs font-bold text-slate-900 tabular-nums bg-slate-100 rounded-full px-2 py-0.5">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3">Cash Advance &amp; Liquidation Health</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Outstanding Float</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{formatPHP(outstandingFloat)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Released to requestors, not yet liquidated</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Liquidated Within Deadline</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {onTimePct === null ? '—' : `${onTimePct}% on time`}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {judgedLiquidations.length === 0
                ? `No liquidations to judge yet (${LIQUIDATION_DEADLINE_DAYS}-day deadline)`
                : `${lateCount} filed late, out of ${judgedLiquidations.length} · ${LIQUIDATION_DEADLINE_DAYS}-day deadline`}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-4">Variance Mix</h4>
          <div className="h-64">
            {varianceMixData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No liquidations yet.</div>
            ) : (
              <DonutChart data={varianceMixData} centerCaption="Total Liquidations" />
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Overdue Review Meetings</h3>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 rounded px-1.5 py-0.5" title="Live snapshot — not affected by the date filter">Current</span>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${overdueMeetings.length > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {overdueMeetings.length} overdue
          </span>
        </div>
        {overdueMeetings.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-xs text-slate-400 text-center">
            No overdue review meetings — every scheduled meeting has been confirmed or declined on time.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Requestor</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Approver</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Claim #</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Meeting Date</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Days Overdue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {overdueMeetings.map(rm => (
                    <tr key={rm.id} className="hover:bg-brand/5 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-900">{rm.requestor_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{rm.approver_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-slate-700">{rm.claim_number || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{rm.meeting_date} {rm.meeting_time}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-red-600 tabular-nums">{rm.daysOverdue}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Average Time in Each Stage</h3>
        <p className="text-xs text-slate-500 mb-4">
          {slowestStage && slowestStage.days > 0
            ? <>Slowest stage: <span className="font-bold text-slate-700">{slowestStage.name}</span> at {slowestStage.days.toFixed(1)} days on average.</>
            : 'Not enough claims have moved through the full pipeline yet to measure this.'}
        </p>
        <div className="h-64">
          <SimpleBarChart data={stageDurationData} dataKey="days" colors={CHART_COLORS} name="Avg Days" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Claims Aging</h3>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 rounded px-1.5 py-0.5" title="Live snapshot — not affected by the date filter">Current</span>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${agingPastThreshold > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {agingPastThreshold} aging past {AGING_WARNING_DAYS} days
          </span>
        </div>
        {agingRows.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-xs text-slate-400 text-center">
            No open claims — every claim has reached a terminal status.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Claim #</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Requestor</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Current Status</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Days in Status</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {agingRows.map(row => {
                    const flagged = row.daysInStatus >= AGING_WARNING_DAYS;
                    return (
                      <tr key={row.id} className={`transition-colors ${flagged ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-brand/5'}`}>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-mono font-bold text-slate-800">{row.claim_number || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{row.requestorName}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={row.status} size="sm" /></td>
                        <td className={`px-4 py-3 whitespace-nowrap text-xs font-bold tabular-nums ${flagged ? 'text-amber-700' : 'text-slate-700'}`}>{row.daysInStatus}d</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 tabular-nums">{formatPHP(row.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3">High-Value Flagged Claims</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Flagged Claims</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{flaggedClaims.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">Any line item over {formatPHP(highValueThreshold)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">% of All Claims</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{flaggedPct.toFixed(1)}%</p>
            <p className="text-[11px] text-slate-400 mt-1">{flaggedClaims.length} of {scopedClaims.length} total</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Flagged Value</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{formatPHP(flaggedTotalValue)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Combined value of flagged claims</p>
          </div>
        </div>

        {flaggedClaims.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-xs text-slate-400 text-center">
            No claims exceed the high-value threshold of {formatPHP(highValueThreshold)}.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h4 className="text-sm font-bold text-slate-800">Frequent Flaggers</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Requestor</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Flagged</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {frequentFlaggers.map((f, i) => (
                      <tr key={i} className="hover:bg-brand/5 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-900">{f.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 tabular-nums">{f.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h4 className="text-sm font-bold text-slate-800">Flagged Claims</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Claim #</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Requestor</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Dept</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Amount</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {flaggedClaims.slice(0, 10).map(row => (
                      <tr key={row.id} className="hover:bg-brand/5 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-mono font-bold text-slate-800">{row.claim_number || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{row.requestorName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{row.department}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-900 tabular-nums">{formatPHP(row.amount)}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={row.status} size="sm" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
