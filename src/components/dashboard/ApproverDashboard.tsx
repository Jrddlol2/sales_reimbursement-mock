import React, { useState, useEffect } from 'react';
import { User, Claim, CashAdvance, Liquidation, ClaimStatus, CashAdvanceStatus, LiquidationStatus, ReviewMeeting, ReviewMeetingStatus } from '../../types';
import { apiFetch } from '../../lib/api';
import { KPICard } from './KPICard';
import { MyRequestsCards } from './MyRequestsCards';
import { MyRecentSubmissionsTable } from './MyRecentSubmissionsTable';
import { DashboardHeader } from './DashboardHeader';
import { QuickActionsCard } from './QuickActionsCard';
import { RecentActivityTable } from './RecentActivityTable';
import { AnalyticsCard } from './AnalyticsCard';
import { SimpleLineChart, SimpleBarChart } from './AnalyticsCharts';
import { Tray, Money, Clock, CheckCircle, ReceiptX, CalendarPlus } from '@phosphor-icons/react';

export const ApproverDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cadvs, setCadvs] = useState<CashAdvance[]>([]);
  const [liqs, setLiqs] = useState<Liquidation[]>([]);
  const [meetings, setMeetings] = useState<ReviewMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/claims'),
      apiFetch('/api/cash-advances'),
      apiFetch('/api/liquidations'),
      apiFetch('/api/approver/review-meetings')
    ]).then(([claimsData, cadvsData, liqsData, meetingsData]) => {
      setClaims(claimsData);
      setCadvs(cadvsData);
      setLiqs(liqsData);
      setMeetings(meetingsData);
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
  const pendingLiqs = liqs.filter(l => l.status === LiquidationStatus.SUBMITTED); // We assume if it's visible and pending, it's theirs
  const pendingMeetings = meetings.filter(m => m.status === ReviewMeetingStatus.SCHEDULED);

  const pendingTotal = pendingClaims.length + pendingCadvs.length + pendingLiqs.length + pendingMeetings.length;

  const quickActions = [
    { label: 'Approval Queue', icon: Tray, path: '/approvals', colorClass: 'text-indigo-600', bgColorClass: 'bg-indigo-50' },
    { label: 'Review Meetings', icon: CalendarPlus, path: '/calendar', colorClass: 'text-blue-600', bgColorClass: 'bg-blue-50' },
    { label: 'Delegation Settings', icon: Clock, path: '/settings', colorClass: 'text-slate-600', bgColorClass: 'bg-slate-100' },
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
      amount: c.requestedAmount,
      date: c.createdAt,
      path: '/approvals'
    })),
    ...pendingLiqs.map(l => ({
      id: l.id,
      reference: `LIQ-${l.id.substring(0, 6)}`,
      type: 'Liquidation Review',
      status: l.status,
      amount: l.totalExpenses,
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

  return (
    <div>
      <DashboardHeader 
         user={user} 
         summaryText={`You have ${pendingTotal} items pending your review or approval.`}
      />
      
      {/* Approval Priority Section */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Approval Center</h2>
        <p className="text-sm text-slate-500 mb-4">Requests requiring your attention</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Pending Approvals" 
            value={pendingTotal} 
            icon={Tray} 
            variant={pendingTotal > 0 ? "action" : "success"}
            description={pendingTotal > 0 ? "Waiting for your review" : "All caught up!"}
            actionLabel={pendingTotal > 0 ? "Review Requests" : undefined}
            actionPath={pendingTotal > 0 ? "/approvals" : undefined}
          />
          <KPICard 
            title="Reimbursements" 
            value={pendingClaims.length} 
            icon={ReceiptX} 
            variant="info"
            description="Reimbursement claims"
            additionalContext={pendingClaims.length > 0 ? "Needs approval" : "No pending reimbursements"}
          />
          <KPICard 
            title="Cash Advances" 
            value={pendingCadvs.length} 
            icon={Money} 
            variant="info"
            description="Cash advance requests"
            additionalContext={pendingCadvs.length > 0 ? "Needs approval" : "No pending cash advances"}
          />
          <KPICard 
            title="Liquidations" 
            value={pendingLiqs.length} 
            icon={CheckCircle} 
            variant="info"
            description="Liquidation reviews"
            additionalContext={pendingLiqs.length > 0 ? "Needs approval" : "No pending liquidations"}
          />
        </div>
      </div>

      <MyRequestsCards user={user} claims={claims} cadvs={cadvs} liqs={liqs} outstandingActionsCount={pendingTotal} />
      
      <QuickActionsCard actions={quickActions} layout="horizontal" />

      <MyRecentSubmissionsTable user={user} claims={claims} cadvs={cadvs} liqs={liqs} />
      
      <div className="mb-8">
        <AnalyticsCard title="Current Workload Breakdown">
          <SimpleBarChart data={workloadData} dataKey="count" color="#2563eb" name="Pending Items" />
        </AnalyticsCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
        <RecentActivityTable title="Action Required" items={recentItems} emptyMessage="Your queue is clear. Great job!" />
      </div>
    </div>
  );
};
