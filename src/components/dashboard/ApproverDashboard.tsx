import React, { useState, useEffect } from 'react';
import { User, Claim, CashAdvance, Liquidation, ClaimStatus, CashAdvanceStatus, LiquidationStatus, ReviewMeeting, ReviewMeetingStatus } from '../../types';
import { apiFetch } from '../../lib/api';
import { MetricCard } from './MetricCard';
import { DashboardPeriodFilter } from './DashboardPeriodFilter';
import { MyRequestsCards } from './MyRequestsCards';
import { MyRecentSubmissionsTable } from './MyRecentSubmissionsTable';
import { DashboardHeader } from './DashboardHeader';
import { QuickActionsCard } from './QuickActionsCard';
import { RecentActivityTable } from './RecentActivityTable';
import { AnalyticsCard } from './AnalyticsCard';
import { SimpleLineChart, SimpleBarChart } from './AnalyticsCharts';
import { Tray, Clock, CalendarPlus, UserCircle } from '@phosphor-icons/react';
import { metricsForRole, MetricContext } from '../../metrics/registry';
import { useDashboardPeriod } from '../../contexts/DashboardPeriodContext';
import { UserRole } from '../../types';

export const ApproverDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cadvs, setCadvs] = useState<CashAdvance[]>([]);
  const [liqs, setLiqs] = useState<Liquidation[]>([]);
  const [meetings, setMeetings] = useState<ReviewMeeting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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
    { label: 'Approval Queue', icon: Tray, path: '/approvals', colorClass: 'text-white', bgColorClass: 'bg-slate-600' },
    { label: 'Review Meetings', icon: CalendarPlus, path: '/calendar', colorClass: 'text-white', bgColorClass: 'bg-slate-600' },
    { label: 'Delegation Settings', icon: Clock, path: '/settings', colorClass: 'text-white', bgColorClass: 'bg-slate-600' },
  ];

  // Approver recent activity - mostly things they need to approve, or recently approved
  const recentItems = [
    ...pendingClaims.map(c => ({
      id: c.id,
      reference: `REIM-${c.id.substring(0, 6)}`,
      type: 'Reimbursement Approval',
      status: c.status,
      amount: c.total_amount,
      date: c.created_at,
      path: '/approvals'
    })),
    ...pendingCadvs.map(c => ({
      id: c.id,
      reference: `CADV-${c.id.substring(0, 6)}`,
      type: 'Cash Advance Approval',
      status: c.status,
      amount: c.amount,
      date: c.createdAt,
      path: '/approvals'
    })),
    ...pendingLiqs.map(l => ({
      id: l.id,
      reference: `LIQ-${l.id.substring(0, 6)}`,
      type: 'Liquidation Review',
      status: l.status,
      amount: l.totalSpent,
      date: l.createdAt,
      path: '/approvals'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const workloadData = [
    { name: 'Reimbursements', count: pendingClaims.length },
    { name: 'Cash Advances', count: pendingCadvs.length },
    { name: 'Liquidations', count: pendingLiqs.length },
    { name: 'Review Meetings', count: pendingMeetings.length }
  ];

  const ctx: MetricContext = { claims, cashAdvances: cadvs, liquidations: liqs, users, currentUser: user };
  const approverMetricDefs = metricsForRole(UserRole.APPROVER);
  const metricActionMap: Record<string, { actionLabel: string; actionPath: string }> = {
    approver_pending_approvals: { actionLabel: 'Review Requests', actionPath: '/approvals?tab=inbox' },
    approver_claims_awaiting_action: { actionLabel: 'Open My Inbox', actionPath: '/approvals' },
    approver_claims_submitted: { actionLabel: 'View Claims', actionPath: '/approvals?tab=inbox' },
    approver_team_spending: { actionLabel: 'View Team Activity', actionPath: '/approvals?tab=history' },
    approver_approval_rate: { actionLabel: 'Decision History', actionPath: '/approvals?tab=history' },
    approver_avg_approval_time: { actionLabel: 'Decision History', actionPath: '/approvals?tab=history' },
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <DashboardHeader
           user={user}
           summaryText={`You have ${pendingTotal} items pending your review or approval.`}
        />
        <DashboardPeriodFilter role={UserRole.APPROVER} />
      </div>

      {/* Approval Priority Section - registry-driven, every card labeled with its own time scope */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Approval Center</h2>
        <p className="text-sm text-slate-500 mb-4">Requests requiring your attention</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {approverMetricDefs.map(metric => {
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

      {/* Level 1: the actual queue of items to decide on, right under the
          KPI summary — this used to sit below the analytics chart, where it
          competed with (and lost to) a chart nobody needs to act on. */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
        <RecentActivityTable title="Action Required" items={recentItems} emptyMessage="You're all caught up — nothing is waiting on your review right now." showAging />
      </div>

      <QuickActionsCard actions={quickActions} layout="horizontal" />

      {/* Divider — everything above this line is "your job as an Approver";
          everything below is "your own claims as an employee". Called out
          explicitly so the two don't blur into one long scroll. */}
      <div className="flex items-center gap-3 my-8">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <UserCircle className="w-4 h-4" /> Your Own Requests
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Level 3: the approver's own submitted requests — secondary to their
          approval duties, so it now sits below the work queue instead of
          directly competing with it for top-of-page attention. */}
      <MyRequestsCards user={user} claims={claims} cadvs={cadvs} liqs={liqs} outstandingActionsCount={pendingTotal} />

      <MyRecentSubmissionsTable user={user} claims={claims} cadvs={cadvs} liqs={liqs} />

      {/* Level 4: analytics — last, since it answers "how am I trending",
          not "what do I do next". */}
      <div className="mb-8">
        <AnalyticsCard title="Current Workload Breakdown">
          <SimpleBarChart data={workloadData} dataKey="count" color="#2563eb" name="Pending Items" />
        </AnalyticsCard>
      </div>
    </div>
  );
};
