import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Claim, CashAdvance, Liquidation, ClaimStatus, CashAdvanceStatus, LiquidationStatus, LiquidationVarianceType } from '../../types';
import { apiFetch } from '../../lib/api';
import { MetricCard } from './MetricCard';
import { DashboardPeriodFilter } from './DashboardPeriodFilter';
import { DashboardHeader } from './DashboardHeader';
import { QuickActionsCard } from './QuickActionsCard';
import { CashAdvanceLiquidationSection } from '../CashAdvanceLiquidationSection';
import { AnalyticsCard } from './AnalyticsCard';
import { SimpleLineChart, DonutChart } from './AnalyticsCharts';
import { FileText, Bank, CalendarPlus, Receipt, ReceiptX, Money } from '@phosphor-icons/react';
import { formatPHP } from '../../utils';
import { metricsForRole, MetricContext } from '../../metrics/registry';
import { useDashboardPeriod } from '../../contexts/DashboardPeriodContext';
import { UserRole } from '../../types';

export const RequestorDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cadvs, setCadvs] = useState<CashAdvance[]>([]);
  const [liqs, setLiqs] = useState<Liquidation[]>([]);
  const [loading, setLoading] = useState(true);
  const { resolveMetricRange, effectiveScope } = useDashboardPeriod();

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
    { label: 'New Reimbursement', icon: Receipt, path: '/claims/new', colorClass: 'text-white', bgColorClass: 'bg-brand', group: 'Start New' },
    { label: 'New Cash Advance', icon: Money, path: '/claims/new?type=cash_advance', colorClass: 'text-white', bgColorClass: 'bg-emerald-600', group: 'Start New' },
    { label: 'Create Minutes', icon: FileText, path: '/moms', colorClass: 'text-white', bgColorClass: 'bg-amber-500', group: 'Manage / Schedule' },
    { label: 'Schedule Review', icon: CalendarPlus, path: '/calendar', colorClass: 'text-white', bgColorClass: 'bg-slate-600', group: 'Manage / Schedule' },
  ];

  const statusDistribution = [
    { name: 'Draft', value: claims.filter(c => c.status === ClaimStatus.DRAFT).length, color: '#cbd5e1' },
    { name: 'Pending', value: claims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL).length, color: '#64748b' },
    { name: 'Processing', value: claims.filter(c => [ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM].includes(c.status)).length, color: '#f59e0b' },
    { name: 'Completed', value: completedClaims.length, color: '#10b981' },
    { name: 'Rejected', value: claims.filter(c => c.status === ClaimStatus.REJECTED).length, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const rejectedClaims = claims.filter(c => c.status === ClaimStatus.REJECTED);
  const decidedClaimsCount = completedClaims.length + rejectedClaims.length;
  const approvalRate = decidedClaimsCount > 0 ? Math.round((completedClaims.length / decidedClaimsCount) * 100) : null;
  const avgClaimAmount = completedClaims.length > 0 ? totalReimbursed / completedClaims.length : 0;

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

  const ctx: MetricContext = { claims, cashAdvances: cadvs, liquidations: liqs, users: [], currentUser: user };
  const requestorMetricDefs = metricsForRole(UserRole.REQUESTOR);
  const metricActionMap: Record<string, { actionLabel: string; actionPath: string }> = {
    requestor_my_claims: { actionLabel: 'View All', actionPath: '/history' },
    requestor_pending_claims: { actionLabel: 'View Pending', actionPath: '/history?status=Pending Approval' },
    requestor_approved_this_month: { actionLabel: 'View Processing', actionPath: '/history?status=Processing' },
    requestor_rejected_this_month: { actionLabel: 'View Rejected', actionPath: '/history?status=Rejected' },
    requestor_amount_reimbursed_ytd: { actionLabel: 'View Completed', actionPath: '/history?status=Completed' },
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <DashboardHeader user={user} summaryText={`You currently have ${activeClaims.length} active claims and ${activeCadvs.length} pending cash advances.`} />
        <DashboardPeriodFilter role={UserRole.REQUESTOR} />
      </div>

      {/* Level 1: things needing action today (drafts to finish, returned
          items to fix, funds ready to collect) surface before any KPI or
          chart — this is the section the requestor should see first. */}
      <div className="mb-8">
        <CashAdvanceLiquidationSection />
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-1">My Requests</h2>
        <p className="text-sm text-slate-500 mb-4">Track the status of your submitted requests, each scoped to its own relevant period</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {requestorMetricDefs.map(metric => {
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

      <QuickActionsCard actions={quickActions} layout="horizontal" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <AnalyticsCard title="Reimbursement Trend">
            {claims.length > 0 ? (
              <SimpleLineChart data={monthlyData()} dataKey="Amount" />
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-center px-6">
                <Receipt className="w-10 h-10 text-slate-300 mb-3" />
                <h3 className="text-sm font-semibold text-slate-900 mb-1">No Reimbursement Activity Yet</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                  Your spending trend will appear here once you submit your first reimbursement claim.
                </p>
                <Link to="/claims/new" className="corp-btn-primary text-xs font-semibold px-4 py-2 rounded">
                  Submit Your First Claim
                </Link>
              </div>
            )}
          </AnalyticsCard>
        </div>
        <div>
          <AnalyticsCard title="Claim Status Distribution">
            {statusDistribution.length > 0 ? (
              <>
                <DonutChart data={statusDistribution} />
                <div className="grid grid-cols-2 gap-2 pt-3 mt-1 border-t border-slate-100">
                  <div className="text-center">
                    <div className="text-sm font-extrabold text-slate-900">{approvalRate !== null ? `${approvalRate}%` : '—'}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Approval Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-extrabold text-slate-900">{formatPHP(avgClaimAmount)}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Avg Claim Amount</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-center px-6">
                <Receipt className="w-10 h-10 text-slate-300 mb-3" />
                <h3 className="text-sm font-semibold text-slate-900 mb-1">No Claims Submitted Yet</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                  Submit your first reimbursement to see your status breakdown here.
                </p>
                <Link to="/claims/new" className="corp-btn-primary text-xs font-semibold px-4 py-2 rounded">
                  Submit Your First Claim
                </Link>
              </div>
            )}
          </AnalyticsCard>
        </div>
      </div>
    </div>
  );
};
