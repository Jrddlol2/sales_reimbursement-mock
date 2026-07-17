import React, { useState, useEffect } from 'react';
import { User, Claim, CashAdvance, Liquidation, ClaimStatus, CashAdvanceStatus, LiquidationStatus, LiquidationVarianceType } from '../../types';
import { apiFetch } from '../../lib/api';
import { KPICard } from './KPICard';
import { MyRequestsCards } from './MyRequestsCards';
import { MyRecentSubmissionsTable } from './MyRecentSubmissionsTable';
import { DashboardHeader } from './DashboardHeader';
import { QuickActionsCard } from './QuickActionsCard';
import { RecentActivityTable } from './RecentActivityTable';
import { AnalyticsCard } from './AnalyticsCard';
import { SimpleBarChart, DonutChart } from './AnalyticsCharts';
import { Bank, CurrencyDollar, ArrowDownLeft, Clock, ArrowsClockwise } from '@phosphor-icons/react';

export const CustodianDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cadvs, setCadvs] = useState<CashAdvance[]>([]);
  const [liqs, setLiqs] = useState<Liquidation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/claims'),
      apiFetch('/api/cash-advances'),
      apiFetch('/api/liquidations')
    ]).then(([claimsData, cadvsData, liqsData]) => {
      setClaims(claimsData);
      setCadvs(cadvsData);
      setLiqs(liqsData);
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

  // KPIs
  const pendingProcessing = claims.filter(c => c.status === ClaimStatus.PROCESSING);
  const pendingCadvReleases = cadvs.filter(c => c.status === CashAdvanceStatus.APPROVED);
  const pendingRefunds = liqs.filter(l => l.status === LiquidationStatus.REVIEWED && l.varianceType === LiquidationVarianceType.REFUND_DUE);
  const pendingShortfalls = claims.filter(c => c.status === ClaimStatus.PROCESSING && c.expense_category === 'Reimbursement Due (Liquidation)');
  
  const pendingTotal = pendingProcessing.length + pendingCadvReleases.length + pendingRefunds.length;

  const quickActions = [
    { label: 'Process Claims', icon: ArrowsClockwise, path: '/processing', colorClass: 'text-indigo-600', bgColorClass: 'bg-indigo-50' },
    { label: 'Release Advances', icon: CurrencyDollar, path: '/processing', colorClass: 'text-emerald-600', bgColorClass: 'bg-emerald-50' },
    { label: 'Collect Refunds', icon: ArrowDownLeft, path: '/processing', colorClass: 'text-rose-600', bgColorClass: 'bg-rose-50' }
  ];

  const recentItems = [
    ...pendingProcessing.map(c => ({
      id: c.id,
      reference: `REIM-${c.id.substring(0, 6)}`,
      type: 'Process Reimbursement',
      status: c.status,
      amount: c.total_amount,
      date: c.created_at,
      path: '/processing'
    })),
    ...pendingCadvReleases.map(c => ({
      id: c.id,
      reference: `CADV-${c.id.substring(0, 6)}`,
      type: 'Release Cash Advance',
      status: c.status,
      amount: c.amount,
      date: c.createdAt,
      path: '/processing'
    })),
    ...pendingRefunds.map(l => ({
      id: l.id,
      reference: `LIQ-${l.id.substring(0, 6)}`,
      type: 'Collect Refund',
      status: l.status,
      amount: Math.abs(l.varianceAmount || 0),
      date: l.createdAt,
      path: '/processing'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  const workloadData = [
    { name: 'Claims', count: pendingProcessing.length },
    { name: 'CADVs', count: pendingCadvReleases.length },
    { name: 'Refunds', count: pendingRefunds.length },
    { name: 'Shortfalls', count: pendingShortfalls.length }
  ];

  return (
    <div>
      <DashboardHeader 
        user={user} 
        summaryText={`You have ${pendingTotal} items pending finance operation actions.`}
      />
      
      <MyRequestsCards user={user} claims={claims} cadvs={cadvs} liqs={liqs} outstandingActionsCount={pendingTotal} />
      
      <QuickActionsCard actions={quickActions} layout="horizontal" />

      <MyRecentSubmissionsTable user={user} claims={claims} cadvs={cadvs} liqs={liqs} />

      <div className="mb-8">
        <AnalyticsCard title="Finance Operations Queue">
          <SimpleBarChart data={workloadData} dataKey="count" color="#2563eb" name="Pending Items" />
        </AnalyticsCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
        <RecentActivityTable title="Action Required" items={recentItems} emptyMessage="No finance operations required." />
      </div>
    </div>
  );
};
