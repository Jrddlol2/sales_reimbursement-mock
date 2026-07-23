import React, { useState, useEffect } from 'react';
import { User, Claim, CashAdvance, Liquidation, ClaimStatus, CashAdvanceStatus, LiquidationStatus, ReviewMeeting, ReviewMeetingStatus } from '../../types';
import { apiFetch } from '../../lib/api';
import { MetricCard } from './MetricCard';
import { DashboardPeriodFilter } from './DashboardPeriodFilter';
import { DashboardHeader } from './DashboardHeader';
import { QuickActionsCard } from './QuickActionsCard';
import { AnalyticsCard } from './AnalyticsCard';
import { ApprovalQueue } from '../../pages/ApprovalQueue';
import { Clock, CalendarPlus, CaretDown, CaretUp } from '@phosphor-icons/react';
import { metricsForRole, MetricContext } from '../../metrics/registry';
import { useDashboardPeriod } from '../../contexts/DashboardPeriodContext';
import { UserRole } from '../../types';
import { CHART_COLORS } from './AnalyticsCharts';
import { formatPHP } from '../../utils';

export const ApproverDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cadvs, setCadvs] = useState<CashAdvance[]>([]);
  const [liqs, setLiqs] = useState<Liquidation[]>([]);
  const [meetings, setMeetings] = useState<ReviewMeeting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestorSort, setRequestorSort] = useState<'desc' | 'asc'>('desc');
  const { resolveMetricRange, effectiveScope } = useDashboardPeriod();

  useEffect(() => {
    Promise.all([
      apiFetch('/api/claims'),
      apiFetch('/api/cash-advances'),
      apiFetch('/api/liquidations'),
      apiFetch('/api/review-meetings'),
      apiFetch('/api/users')
    ]).then(([claimsData, cadvsData, liqsData, meetingsData, usersData]) => {
      setClaims(claimsData);
      setCadvs(cadvsData);
      setLiqs(liqsData);
      setMeetings(meetingsData);
      setUsers(usersData);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
          <div>
            <div className="h-7 w-56 bg-slate-200 rounded mb-2"></div>
            <div className="h-4 w-80 bg-slate-100 rounded"></div>
          </div>
          <div className="h-10 w-32 bg-slate-200 rounded-lg"></div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-28 flex flex-col justify-between">
              <div className="h-4 w-24 bg-slate-200 rounded"></div>
              <div className="h-8 w-16 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>

        {/* Dashboard Panels Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 h-64 flex flex-col justify-between">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <div className="h-40 bg-slate-50 rounded-lg w-full"></div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 h-64 flex flex-col justify-between">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <div className="h-40 bg-slate-50 rounded-lg w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate KPIs (Things awaiting this approver's action)
  const pendingClaims = claims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL && c.current_approver_id === user.id);
  const pendingCadvs = cadvs.filter(c => c.status === CashAdvanceStatus.SUBMITTED && c.approverId === user.id);
  const pendingLiqs = liqs.filter(l => l.status === LiquidationStatus.SUBMITTED && cadvs.find(ca => ca.id === l.cashAdvanceId)?.approverId === user.id);
  const pendingMeetings = meetings.filter(m => m.approver_id === user.id && m.status === ReviewMeetingStatus.PENDING_CONFIRMATION);

  const pendingTotal = pendingClaims.length + pendingCadvs.length + pendingLiqs.length + pendingMeetings.length;

  const quickActions = [
    { label: 'Review Meetings', icon: CalendarPlus, path: '/calendar', colorClass: 'text-white', bgColorClass: 'bg-brand' },
    { label: 'Delegation Settings', icon: Clock, path: '/settings', colorClass: 'text-white', bgColorClass: 'bg-indigo-500' },
  ];

  // A composition bar instead of a bar chart — pending counts are small
  // whole numbers, so a chart with a numeric axis (and its decimal ticks)
  // was the wrong tool. This shows what makes up the current queue instead.
  const workloadData = [
    { name: 'Reimbursements', count: pendingClaims.length, colorClass: 'bg-brand' },
    { name: 'Cash Advances', count: pendingCadvs.length, colorClass: 'bg-indigo-500' },
    { name: 'Liquidations', count: pendingLiqs.length, colorClass: 'bg-amber-500' },
    { name: 'Review Meetings', count: pendingMeetings.length, colorClass: 'bg-slate-400' }
  ];
  const workloadTotal = workloadData.reduce((sum, w) => sum + w.count, 0);

  // Approved spend per direct report — one mini-card per requestor rather
  // than a bar chart, following the hierarchy (current or original approver,
  // covering claims transferred during a reorg) with a sortable most/least
  // toggle.
  const approverClaims = claims.filter((c: any) => c.current_approver_id === user.id || c.original_approver_id === user.id);
  const spendByRequestor: Record<string, { value: number; count: number }> = {};
  approverClaims
    .filter(c => [ClaimStatus.APPROVED, ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(c.status))
    .forEach((c: any) => {
      const name = c.requestor?.name || 'Unknown';
      if (!spendByRequestor[name]) spendByRequestor[name] = { value: 0, count: 0 };
      spendByRequestor[name].value += c.total_amount;
      spendByRequestor[name].count += 1;
    });
  const requestorData = Object.entries(spendByRequestor)
    .map(([name, { value, count }]) => ({ name, value: Number(value), count }))
    .sort((a, b) => requestorSort === 'desc' ? b.value - a.value : a.value - b.value);
  const requestorAverage = requestorData.length > 0 ? requestorData.reduce((sum, r) => sum + r.value, 0) / requestorData.length : 0;

  const ctx: MetricContext = { claims, cashAdvances: cadvs, liquidations: liqs, users, currentUser: user };
  // "Your Approval Performance" — retrospective scorecard stats about the
  // approver, not actionable counts. Deliberately kept out of the queue's own
  // KPI row above (which is the "requests requiring your attention" surface)
  // and rendered as its own block below the queue instead, so actionable and
  // informational numbers don't carry equal visual weight under one heading.
  const performanceMetricIds = ['approver_claims_submitted', 'approver_team_spending', 'approver_approval_rate', 'approver_avg_approval_time'];
  const performanceMetricDefs = metricsForRole(UserRole.APPROVER).filter(m => performanceMetricIds.includes(m.id));
  const metricActionMap: Record<string, { actionLabel: string; actionPath: string }> = {
    approver_claims_submitted: { actionLabel: 'Decision History', actionPath: '/?tab=history' },
    approver_team_spending: { actionLabel: 'Decision History', actionPath: '/?tab=history' },
    approver_approval_rate: { actionLabel: 'Decision History', actionPath: '/?tab=history' },
    approver_avg_approval_time: { actionLabel: 'Decision History', actionPath: '/?tab=history' },
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <DashboardHeader
           user={user}
           summaryText={
             <>
               You have <strong className="font-bold text-slate-900">{pendingTotal} item{pendingTotal === 1 ? '' : 's'} pending</strong> your review or approval.
             </>
           }
        />
        <div className="flex flex-col items-end gap-2.5">
          <QuickActionsCard actions={quickActions} layout="compact" />
          <DashboardPeriodFilter role={UserRole.APPROVER} />
        </div>
      </div>

      {/* Level 1: the full unified action queue — Reimbursements, Cash
          Advances, and Liquidations together (not separate tabs), plus
          Review Meetings and Decision History. This used to be the standalone
          "Approver Inbox" page at /approvals; it's embedded here now so the
          Dashboard is the Approver's one home screen. Its own "Pending
          Approvals / Returned to You / Advances & Liquidations" row (the 3
          live queue counts) is the dashboard's only KPI row — a separate
          registry-driven row used to stack above it, restating the same
          pending set under a second heading. */}
      <div className="mb-8">
        <ApprovalQueue embedded />
      </div>

      {/* The Approver's own submitted requests live under the "MY REQUESTS"
          sidebar group now (New Request / Transaction History), so this
          dashboard stays scoped entirely to Approval Center duties. */}

      {/* Your Approval Performance — the retrospective scorecard that used to
          sit above the queue under a misleading "requires your attention"
          heading. Lives here instead, right below the queue, so it never
          competes with actionable counts for the same visual weight. */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Your Approval Performance</h2>
        <p className="text-sm text-slate-500 mb-4">How you've been trending as an approver, each scoped to its own relevant period</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceMetricDefs.map(metric => {
            const scope = effectiveScope(metric);
            const range = resolveMetricRange(metric);
            const value = metric.compute(ctx, range);
            const action = metricActionMap[metric.id];
            return (
              <MetricCard
                key={metric.id}
                metric={metric}
                ctx={ctx}
                scope={scope}
                value={value}
                actionLabel={action?.actionLabel}
                actionPath={action?.actionPath}
              />
            );
          })}
        </div>
      </div>

      {/* Level 4: analytics — last, since it answers "how am I trending",
          not "what do I do next". Workload Breakdown comes first (what's
          in the queue right now), Approved Spend by Requestor after it
          (a slower-moving, retrospective view). */}
      <div className="mb-8">
        <AnalyticsCard title="Current Workload Breakdown">
          {workloadTotal === 0 ? (
            <div className="text-sm text-slate-400 text-center py-6">Nothing pending right now — your queue is clear.</div>
          ) : (
            <div>
              <div className="flex w-full h-7 rounded-lg overflow-hidden bg-slate-100">
                {workloadData.filter(w => w.count > 0).map(w => {
                  const pct = (w.count / workloadTotal) * 100;
                  // Below ~12% a segment isn't wide enough to hold a legible
                  // label without it overflowing into its neighbor — those
                  // still show their count in the legend row below instead.
                  const canLabel = pct >= 12;
                  return (
                    <div
                      key={w.name}
                      className={`${w.colorClass} flex items-center justify-center transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${w.name}: ${w.count}`}
                    >
                      {canLabel && (
                        <span className="text-[11px] font-bold text-white tabular-nums px-1 truncate">{w.count}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {workloadData.map(w => (
                  <div key={w.name} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${w.count > 0 ? w.colorClass : 'bg-slate-200'}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 tabular-nums">{w.count}</div>
                      <div className="text-[10px] text-slate-500 truncate">{w.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AnalyticsCard>
      </div>

      {requestorData.length > 0 && (
        <div className="corp-card space-y-4 mb-8">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-2"><div className="w-1 h-3 bg-brand rounded-full"></div>Approved Spend by Requestor</h3>
              <p className="text-[10px] text-slate-500">Total approved reimbursements from your reports</p>
            </div>
            {requestorData.length > 1 && (
              <button
                onClick={() => setRequestorSort(s => s === 'desc' ? 'asc' : 'desc')}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider shrink-0"
              >
                {requestorSort === 'desc' ? <>Most first <CaretDown className="w-3 h-3" /></> : <>Least first <CaretUp className="w-3 h-3" /></>}
              </button>
            )}
          </div>
          <div className="px-6 pb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {requestorData.map((r, index) => {
              const color = CHART_COLORS[index % CHART_COLORS.length];
              const aboveAverage = r.value > requestorAverage;
              return (
                <div key={r.name} className="border border-slate-200 rounded-lg p-3.5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />
                  <p className="text-xs font-bold text-slate-800 truncate mt-1" title={r.name}>{r.name}</p>
                  <p className="text-lg font-extrabold text-slate-900 tabular-nums mt-1 truncate" title={formatPHP(r.value)}>{formatPHP(r.value)}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-slate-500">{r.count} claim{r.count === 1 ? '' : 's'}</span>
                    {requestorData.length > 1 && (
                      <span className={`text-[10px] font-bold ${aboveAverage ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {aboveAverage ? '▲' : '▼'} vs avg
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
