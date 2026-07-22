import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Claim, CashAdvance, Liquidation, ClaimStatus, CashAdvanceStatus, LiquidationStatus, UserRole, SupportRequest, SupportRequestStatus, SupportRequestPriority } from '../../types';
import { apiFetch } from '../../lib/api';
import { KPICard } from './KPICard';
import { MetricCard } from './MetricCard';
import { DashboardPeriodFilter } from './DashboardPeriodFilter';
import { DashboardHeader } from './DashboardHeader';
import { QuickActionsCard } from './QuickActionsCard';
import { AnalyticsCard } from './AnalyticsCard';
import { SimpleLineChart, DonutChart } from './AnalyticsCharts';
import { Users, FileText, Envelope, ShieldCheck, Heartbeat, ChartBar, Briefcase, HardDrives, Gear, Archive, ArrowRight, Lifebuoy, Clock as ClockIcon } from '@phosphor-icons/react';
import { formatPHP, getClaimNumber } from '../../utils';
import { metricsForRole, MetricContext } from '../../metrics/registry';
import { useDashboardPeriod } from '../../contexts/DashboardPeriodContext';
import { resolveScope } from '../../metrics/timeScope';
import { StatusBadge } from '../StatusBadge';

export const AdminDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [view, setView] = useState<'admin' | 'executive'>('executive');
  
  const [users, setUsers] = useState<User[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cadvs, setCadvs] = useState<CashAdvance[]>([]);
  const [liqs, setLiqs] = useState<Liquidation[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const { resolveMetricRange, effectiveScope } = useDashboardPeriod();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/users'),
      apiFetch('/api/claims'),
      apiFetch('/api/cash-advances'),
      apiFetch('/api/liquidations'),
      apiFetch('/api/history'),
      apiFetch('/api/support')
    ]).then(([u, cl, ca, lq, hist, sr]) => {
      setUsers(u);
      setClaims(cl);
      setCadvs(ca);
      setLiqs(lq);
      setHistory(hist);
      setSupportRequests(sr);
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
  
  // Open support tickets, colored by the highest-priority one waiting —
  // High -> danger red, Medium -> warning amber, Low -> neutral slate, so
  // the icon itself communicates urgency without opening the inbox.
  const openTickets = supportRequests.filter(sr => sr.status !== SupportRequestStatus.RESOLVED);
  const highestOpenPriority = openTickets.some(sr => sr.priority === SupportRequestPriority.HIGH) ? SupportRequestPriority.HIGH
    : openTickets.some(sr => sr.priority === SupportRequestPriority.MEDIUM) ? SupportRequestPriority.MEDIUM
    : openTickets.length > 0 ? SupportRequestPriority.LOW
    : undefined;
  const supportBgColorClass = highestOpenPriority === SupportRequestPriority.HIGH ? 'bg-red-500'
    : highestOpenPriority === SupportRequestPriority.MEDIUM ? 'bg-amber-500'
    : 'bg-slate-400';

  const quickActions = [
    { label: 'Manage Users', icon: Users, path: '/settings', colorClass: 'text-white', bgColorClass: 'bg-brand' },
    { label: 'Audit Log', icon: ShieldCheck, path: '/audit', colorClass: 'text-white', bgColorClass: 'bg-indigo-500' },
    { label: 'System Emails', icon: Envelope, path: '/emails', colorClass: 'text-white', bgColorClass: 'bg-amber-500' },
    {
      label: `Support Requests${openTickets.length > 0 ? ` (${openTickets.length} open, highest: ${highestOpenPriority})` : ''}`,
      icon: Lifebuoy,
      path: '/support',
      colorClass: 'text-white',
      bgColorClass: supportBgColorClass,
      badgeCount: openTickets.length,
      badgeColorClass: supportBgColorClass,
    }
  ];

  const adminStatusDistribution = [
    { name: 'Claims', value: claims.length, color: '#2563eb' },
    { name: 'CADVs', value: cadvs.length, color: '#10b981' },
    { name: 'Liquidations', value: liqs.length, color: '#f59e0b' }
  ];

  const ctx: MetricContext = { claims, cashAdvances: cadvs, liquidations: liqs, users, currentUser: user };
  const adminOperationalMetrics = metricsForRole(UserRole.ADMIN).filter(m => m.section !== 'all_time');
  const adminAllTimeMetrics = metricsForRole(UserRole.ADMIN).filter(m => m.section === 'all_time');
  // Read-only oversight only — Admin never gets actionLabel/actionPath here,
  // since Admin can't process payments (segregation of duties, not an
  // oversight).
  const adminPaymentRightNow = metricsForRole(UserRole.CUSTODIAN).filter(m => m.id === 'custodian_pending_payments' || m.id === 'custodian_outstanding_amount');
  const adminPaymentThisPeriod = metricsForRole(UserRole.CUSTODIAN).filter(m => m.id !== 'custodian_pending_payments' && m.id !== 'custodian_outstanding_amount');
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
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 mb-8">
        <DashboardHeader
           user={user}
           summaryText={view === 'executive'
             ? <>Enterprise Overview: <strong className="font-bold text-slate-900">{claims.length + cadvs.length + liqs.length} total lifetime requests</strong>.</>
             : <>System Health: <strong className="font-bold text-slate-900">{users.length} active users</strong>, <strong className="font-bold text-slate-900">{todayHistory.length} audit events</strong> today.</>}
        />
        <div className="flex flex-col items-end gap-2.5">
          <QuickActionsCard actions={quickActions} layout="compact" />
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
          {view === 'executive' && <DashboardPeriodFilter role={UserRole.ADMIN} />}
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
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-slate-800">Recent System Activity</h2>
              <Link to="/audit" className="text-xs font-bold text-brand hover:text-brand-hover inline-flex items-center gap-1">
                View Full Audit Log <ArrowRight size={12} weight="bold" />
              </Link>
            </div>
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

          {/* Only the headline trend chart lives here — category breakdowns
              and department comparisons moved to /reporting so the same
              analysis isn't duplicated in two places with two different
              scopes. This card is the on-ramp to that deeper view. */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <AnalyticsCard title="Annual Trends (Last 12 Months)">
                <SimpleLineChart data={monthlyExpenseData()} dataKey="Amount" name="Expenses (PHP)" />
              </AnalyticsCard>
            </div>
            <Link
              to="/reporting"
              className="corp-card p-6 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all group"
            >
              <div>
                <ChartBar className="w-8 h-8 text-brand mb-3" weight="duotone" />
                <h3 className="text-sm font-bold text-slate-900 mb-1">Full Analytics Report</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Category breakdowns, department comparisons, and claim volume — the deep-dive view.</p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand group-hover:gap-1.5 transition-all">
                View Full Report <ArrowRight size={14} weight="bold" />
              </span>
            </Link>
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

          <div className="mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-slate-800">Payment Performance</h2>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Read-only</span>
            </div>
            <p className="text-sm text-slate-500 mb-4">Custodian disbursement oversight — Admin cannot process payments</p>

            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Right Now</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {adminPaymentRightNow.map(metric => (
                <MetricCard key={metric.id} metric={metric} ctx={ctx} scope={effectiveScope(metric)} value={metric.compute(ctx, resolveMetricRange(metric))} />
              ))}
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">This Period</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {adminPaymentThisPeriod.map(metric => (
                <MetricCard key={metric.id} metric={metric} ctx={ctx} scope={effectiveScope(metric)} value={metric.compute(ctx, resolveMetricRange(metric))} />
              ))}
            </div>
          </div>

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
