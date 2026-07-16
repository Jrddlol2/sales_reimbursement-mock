import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Claim, CashAdvance, Liquidation, ClaimStatus, CashAdvanceStatus, LiquidationStatus, LiquidationVarianceType } from '../../types';
import { apiFetch } from '../../lib/api';
import { KPICard } from './KPICard';
import { MyRequestsCards } from './MyRequestsCards';
import { DashboardHeader } from './DashboardHeader';
import { QuickActionsCard } from './QuickActionsCard';
import { RecentActivityTable } from './RecentActivityTable';
import { AnalyticsCard } from './AnalyticsCard';
import { SimpleLineChart, DonutChart } from './AnalyticsCharts';
import { FileText, Bank, Money, CalendarPlus, Receipt, ReceiptX } from '@phosphor-icons/react';
import { formatPHP } from '../../utils';

export const RequestorDashboard: React.FC<{ user: User }> = ({ user }) => {
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

  // Calculate KPIs
  const activeClaims = claims.filter(c => [ClaimStatus.DRAFT, ClaimStatus.PENDING_APPROVAL, ClaimStatus.RETURNED, ClaimStatus.PROCESSING].includes(c.status));
  const activeCadvs = cadvs.filter(c => [CashAdvanceStatus.DRAFT, CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED].includes(c.status));
  const activeLiqs = liqs.filter(l => [LiquidationStatus.DRAFT, LiquidationStatus.SUBMITTED, LiquidationStatus.RETURNED_FOR_REVISION].includes(l.status) || (l.status === LiquidationStatus.REVIEWED && l.varianceType === LiquidationVarianceType.REFUND_DUE));
  
  const completedClaims = claims.filter(c => c.status === ClaimStatus.COMPLETED);
  const totalReimbursed = completedClaims.reduce((acc, c) => acc + c.total_amount, 0);

  const quickActions = [
    { label: 'New Reimbursement', icon: Receipt, path: '/claims/new', colorClass: 'text-indigo-600', bgColorClass: 'bg-indigo-50' },
    { label: 'New Cash Advance', icon: Money, path: '/cash-advances/new', colorClass: 'text-emerald-600', bgColorClass: 'bg-emerald-50' },
    { label: 'Create Minutes', icon: FileText, path: '/moms', colorClass: 'text-amber-600', bgColorClass: 'bg-amber-50' },
    { label: 'Schedule Review', icon: CalendarPlus, path: '/calendar', colorClass: 'text-blue-600', bgColorClass: 'bg-blue-50' },
  ];

  const recentItems = [
    ...claims.map(c => ({
      id: c.id,
      reference: `REIM-${c.id.substring(0, 6)}`,
      type: 'Reimbursement',
      status: c.status,
      amount: c.total_amount,
      date: c.created_at,
      path: `/claims/${c.id}`
    })),
    ...cadvs.map(c => ({
      id: c.id,
      reference: `CADV-${c.id.substring(0, 6)}`,
      type: 'Cash Advance',
      status: c.status,
      amount: c.requestedAmount,
      date: c.createdAt,
      path: `/cash-advances/${c.id}`
    })),
    ...liqs.map(l => ({
      id: l.id,
      reference: `LIQ-${l.id.substring(0, 6)}`,
      type: 'Liquidation',
      status: l.status,
      amount: l.totalExpenses,
      date: l.createdAt,
      path: `/liquidations/${l.id}`
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const statusDistribution = [
    { name: 'Draft', value: claims.filter(c => c.status === ClaimStatus.DRAFT).length, color: '#cbd5e1' },
    { name: 'Pending', value: claims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL).length, color: '#3b82f6' },
    { name: 'Processing', value: claims.filter(c => [ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM].includes(c.status)).length, color: '#f59e0b' },
    { name: 'Completed', value: completedClaims.length, color: '#10b981' },
    { name: 'Rejected', value: claims.filter(c => c.status === ClaimStatus.REJECTED).length, color: '#ef4444' }
  ].filter(d => d.value > 0);

  // Group reimbursements by month (last 6 months)
  const monthlyData = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      
      const monthClaims = completedClaims.filter(c => {
        const cd = new Date(c.created_at);
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === year;
      });
      
      months.push({
        name: monthName,
        'Amount': monthClaims.reduce((acc, c) => acc + c.total_amount, 0)
      });
    }
    return months;
  };

  return (
    <div>
      <DashboardHeader user={user} summaryText={`You currently have ${activeClaims.length} active claims and ${activeCadvs.length} pending cash advances.`} />
      <MyRequestsCards user={user} claims={claims} cadvs={cadvs} liqs={liqs} outstandingActionsCount={claims.filter(c => c.status === ClaimStatus.RETURNED && c.requestor_id === user.id).length} />
      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <RecentActivityTable 
            title="Recent Requests" 
            items={recentItems} 
            action={
              <Link to="/history" className="text-xs font-bold text-brand hover:underline transition-all">
                View All
              </Link>
            }
          />
        </div>
        <div>
          <QuickActionsCard actions={quickActions} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <AnalyticsCard title="Reimbursement Trend">
            <SimpleLineChart data={monthlyData()} dataKey="Amount" />
          </AnalyticsCard>
        </div>
        <div>
          <AnalyticsCard title="Claim Status Distribution">
            {statusDistribution.length > 0 ? (
              <DonutChart data={statusDistribution} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">No data available</div>
            )}
          </AnalyticsCard>
        </div>
      </div>
    </div>
  );
};
