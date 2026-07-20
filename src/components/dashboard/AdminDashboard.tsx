import React, { useState, useEffect } from 'react';
import { User, Claim, CashAdvance, Liquidation, ClaimStatus, CashAdvanceStatus, LiquidationStatus, UserRole } from '../../types';
import { apiFetch } from '../../lib/api';
import { KPICard } from './KPICard';
import { MetricCard } from './MetricCard';
import { DashboardPeriodFilter } from './DashboardPeriodFilter';
import { DashboardHeader } from './DashboardHeader';
import { QuickActionsCard } from './QuickActionsCard';
import { AnalyticsCard } from './AnalyticsCard';
import { SimpleLineChart, SimpleBarChart, DonutChart } from './AnalyticsCharts';
import { Users, FileText, Envelope, ShieldCheck, Heartbeat, ChartBar, Briefcase, HardDrives, Gear, Archive, Clock as ClockIcon } from '@phosphor-icons/react';
import { formatPHP, getClaimNumber } from '../../utils';
import { metricsForRole, MetricContext } from '../../metrics/registry';
import { useDashboardPeriod } from '../../contexts/DashboardPeriodContext';
import { resolveScope, scopeLabel } from '../../metrics/timeScope';
import { StatusBadge } from '../StatusBadge';

export const AdminDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [view, setView] = useState<'admin' | 'executive'>('executive');
  
  const [users, setUsers] = useState<User[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cadvs, setCadvs] = useState<CashAdvance[]>([]);
  const [liqs, setLiqs] = useState<Liquidation[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const { resolveMetricRange, effectiveScope } = useDashboardPeriod();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/users'),
      apiFetch('/api/claims'),
      apiFetch('/api/cash-advances'),
      apiFetch('/api/liquidations'),
      apiFetch('/api/history')
    ]).then(([u, cl, ca, lq, hist]) => {
      setUsers(u);
      setClaims(cl);
      setCadvs(ca);
      setLiqs(lq);
      setHistory(hist);
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

  // --- EXECUTIVE KPIs & DATA ---
  const completedClaims = claims.filter(c => c.status === ClaimStatus.COMPLETED);

  // Top Expense Categories — This Year (matches the chart's label; not a lifetime total).
  const topExpenseCategoriesData = () => {
    const yearRange = resolveScope('this_year');
    const categories: Record<string, number> = {};
    completedClaims
      .filter(c => new Date(c.created_at) >= yearRange.start && new Date(c.created_at) <= yearRange.end)
      .forEach(c => {
        const cat = c.expense_category || 'Uncategorized';
        categories[cat] = (categories[cat] || 0) + c.total_amount;
      });
    return Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  };

  // Department Comparison — This Month (consistent choice per spec; operational
  // framing over lifetime, matching every other primary metric on this page).
  const departmentScopeRange = resolveScope('this_month');
  const departmentData = () => {
    const deps: Record<string, number> = {};
    claims
      .filter(c => new Date(c.created_at) >= departmentScopeRange.start && new Date(c.created_at) <= departmentScopeRange.end)
      .forEach(c => {
        const u = users.find(u => u.id === c.requestor_id);
        if (u) {
          deps[u.department] = (deps[u.department] || 0) + 1;
        }
      });
    return Object.keys(deps).map(k => ({ name: k, count: deps[k] }));
  };

  // Annual Trends — Last 12 Months, monthly granularity (per spec).
  const monthlyExpenseData = () => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
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

  // --- ADMIN KPIs & DATA ---
  const todayHistory = history.filter(h => {
    const d = new Date(h.timestamp);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  
  const quickActions = [
    { label: 'Manage Users', icon: Users, path: '/settings', colorClass: 'text-white', bgColorClass: 'bg-slate-600' },
    { label: 'Audit Log', icon: ShieldCheck, path: '/audit', colorClass: 'text-white', bgColorClass: 'bg-slate-600' },
    { label: 'System Emails', icon: Envelope, path: '/emails', colorClass: 'text-white', bgColorClass: 'bg-amber-500' }
  ];

  const adminStatusDistribution = [
    { name: 'Claims', value: claims.length, color: '#2563eb' },
    { name: 'CADVs', value: cadvs.length, color: '#10b981' },
    { name: 'Liquidations', value: liqs.length, color: '#f59e0b' }
  ];

  const ctx: MetricContext = { claims, cashAdvances: cadvs, liquidations: liqs, users, currentUser: user };
  const adminOperationalMetrics = metricsForRole(UserRole.ADMIN).filter(m => m.section !== 'all_time');
  const adminAllTimeMetrics = metricsForRole(UserRole.ADMIN).filter(m => m.section === 'all_time');
  const metricActionMap: Record<string, { actionLabel: string; actionPath: string }> = {
    admin_pending_approvals_systemwide: { actionLabel: 'View Audit Log', actionPath: '/audit' },
    admin_monthly_claims: { actionLabel: 'View Audit Log', actionPath: '/audit' },
    admin_yearly_spending: { actionLabel: 'View Audit Log', actionPath: '/audit' },
    admin_active_users: { actionLabel: 'Manage Users', actionPath: '/users' },
    admin_approval_performance: { actionLabel: 'View Audit Log', actionPath: '/audit' },
  };

  // Recent System Activity — reuses the same history feed already fetched for
  // the "audit events today" count, just surfaced as a readable who/what/status
  // feed instead of only a number. No new data source.
  const recentSystemActivity = [...history]
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-8">
        <DashboardHeader
           user={user}
           summaryText={view === 'executive'
             ? `Enterprise Overview: ${claims.length + cadvs.length + liqs.length} total lifetime requests.`
             : `System Health: ${users.length} active users, ${todayHistory.length} audit events today.`}
        />
        <div className="flex items-center gap-3">
          {view === 'executive' && <DashboardPeriodFilter role={UserRole.ADMIN} />}
          <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === 'executive' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setView('executive')}
            >
              Executive Overview
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === 'admin' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setView('admin')}
            >
              System Admin
            </button>
          </div>
        </div>
      </div>

      {view === 'executive' ? (
        <>
          <div className="bg-brand text-white p-6 rounded-xl mb-8 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ChartBar className="w-6 h-6" /> Executive Overview
              </h2>
              <p className="text-white/80 mt-1">Enterprise performance, financial summaries, and claim analytics — each figure scoped to its own period</p>
            </div>
            <Briefcase className="w-24 h-24 text-white opacity-10 absolute -right-2 -bottom-4 transform -rotate-12" weight="fill" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {adminOperationalMetrics.map(metric => {
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

          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Recent System Activity</h2>
            <p className="text-sm text-slate-500 mb-4">Latest status changes across every claim, cash advance, and liquidation</p>
            <div className="corp-card divide-y divide-slate-100">
              {recentSystemActivity.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No system activity recorded yet. Activity will appear here as claims move through the workflow.
                </div>
              ) : (
                recentSystemActivity.map((log: any, idx: number) => {
                  const actorName = log.user?.name || log.changedBy?.name || log.changed_by || 'System';
                  const reference = log.claim ? getClaimNumber(log.claim)
                    : log.claim_id ? `REIM-${log.claim_id.substring(0, 6)}`
                    : log.cash_advance_id ? `CADV-${log.cash_advance_id.substring(0, 6)}`
                    : log.liquidation_id ? `LIQ-${log.liquidation_id.substring(0, 6)}`
                    : 'record';
                  return (
                    <div key={log.id || idx} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <ClockIcon className="w-4 h-4 text-slate-300 shrink-0" />
                        <p className="text-xs text-slate-700 truncate">
                          <span className="font-bold text-slate-900">{actorName}</span> moved <span className="font-mono font-semibold text-slate-800">{reference}</span> to
                        </p>
                        <StatusBadge status={log.new_status} size="sm" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <AnalyticsCard title="Annual Trends (Last 12 Months)">
              <SimpleLineChart data={monthlyExpenseData()} dataKey="Amount" name="Expenses (PHP)" />
            </AnalyticsCard>
            <AnalyticsCard title="Top Expense Categories (This Year)">
              <DonutChart data={topExpenseCategoriesData()} centerCaption="Spend" />
            </AnalyticsCard>
            <AnalyticsCard title={`Requests by Department (${scopeLabel('this_month')})`}>
              <SimpleBarChart data={departmentData()} dataKey="count" color="#2563eb" name="Requests" />
            </AnalyticsCard>
          </div>

          {/* All-Time stats — visually separated (grey, no period filter applies) so
              they're never confused with the operational metrics above. */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Archive className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">All-Time System Stats</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {adminAllTimeMetrics.map(metric => (
                <MetricCard key={metric.id} metric={metric} ctx={ctx} scope="all_time" value={metric.compute(ctx, resolveScope('all_time'))} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="bg-slate-800 text-white p-6 rounded-xl mb-8 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <HardDrives className="w-6 h-6 text-slate-400" /> System Administration
              </h2>
              <p className="text-slate-300 mt-1">Operational health, system management, and access controls</p>
            </div>
            <Gear className="w-24 h-24 text-slate-100 opacity-5 absolute -right-2 -bottom-4 animate-[spin_20s_linear_infinite]" weight="fill" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard title="Total Users" value={users.length} icon={Users} colorClass="text-slate-600 bg-white" />
            <KPICard title="Total Requests" value={claims.length + cadvs.length} icon={FileText} colorClass="text-slate-600 bg-white" />
            <KPICard title="System Audit (Today)" value={todayHistory.length} icon={ShieldCheck} colorClass="text-slate-600 bg-white" />
            <KPICard
              title="System Status"
              value="Operational"
              icon={Heartbeat}
              variant="info"
              description="Reflects app availability, not a computed health score"
            />
          </div>

          <QuickActionsCard actions={quickActions} layout="horizontal" />

          <div className="mb-8">
            <AnalyticsCard title="System Data Distribution">
              <DonutChart data={adminStatusDistribution} />
            </AnalyticsCard>
          </div>
        </>
      )}
    </div>
  );
};
