import React, { useState, useEffect } from 'react';
import { User, Claim, CashAdvance, Liquidation, ClaimStatus, CashAdvanceStatus, LiquidationStatus } from '../../types';
import { apiFetch } from '../../lib/api';
import { KPICard } from './KPICard';
import { MyRequestsCards } from './MyRequestsCards';
import { MyRecentSubmissionsTable } from './MyRecentSubmissionsTable';
import { DashboardHeader } from './DashboardHeader';
import { QuickActionsCard } from './QuickActionsCard';
import { AnalyticsCard } from './AnalyticsCard';
import { SimpleLineChart, SimpleBarChart, DonutChart } from './AnalyticsCharts';
import { Users, FileText, CheckCircle, Warning, Clock, Envelope, ShieldCheck, Heartbeat, ChartBar, Briefcase, HardDrives, Gear } from '@phosphor-icons/react';
import { formatPHP } from '../../utils';

export const AdminDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [view, setView] = useState<'admin' | 'executive'>('executive');
  
  const [users, setUsers] = useState<User[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cadvs, setCadvs] = useState<CashAdvance[]>([]);
  const [liqs, setLiqs] = useState<Liquidation[]>([]);
  const [history, setHistory] = useState<any[]>([]);
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
  const totalReimbursed = completedClaims.reduce((acc, c) => acc + c.total_amount, 0);
  const totalCadvs = cadvs.filter(c => c.status === CashAdvanceStatus.RELEASED || c.status === CashAdvanceStatus.LIQUIDATED).reduce((acc, c) => acc + c.requestedAmount, 0);
  
  const activeRequests = claims.filter(c => [ClaimStatus.PENDING_APPROVAL, ClaimStatus.PROCESSING].includes(c.status)).length 
    + cadvs.filter(c => [CashAdvanceStatus.SUBMITTED, CashAdvanceStatus.APPROVED].includes(c.status)).length;

  const departmentData = () => {
    const deps: Record<string, number> = {};
    claims.forEach(c => {
      const u = users.find(u => u.id === c.requestor_id);
      if (u) {
        deps[u.department] = (deps[u.department] || 0) + 1;
      }
    });
    return Object.keys(deps).map(k => ({ name: k, count: deps[k] }));
  };

  const monthlyExpenseData = () => {
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

  // --- ADMIN KPIs & DATA ---
  const todayHistory = history.filter(h => {
    const d = new Date(h.timestamp);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  
  const quickActions = [
    { label: 'Manage Users', icon: Users, path: '/settings', colorClass: 'text-blue-600', bgColorClass: 'bg-blue-50' },
    { label: 'Audit Log', icon: ShieldCheck, path: '/audit', colorClass: 'text-indigo-600', bgColorClass: 'bg-indigo-50' },
    { label: 'System Emails', icon: Envelope, path: '/emails', colorClass: 'text-amber-600', bgColorClass: 'bg-amber-50' }
  ];

  const adminStatusDistribution = [
    { name: 'Claims', value: claims.length, color: '#4f46e5' },
    { name: 'CADVs', value: cadvs.length, color: '#10b981' },
    { name: 'Liquidations', value: liqs.length, color: '#f59e0b' }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <DashboardHeader 
           user={user} 
           summaryText={view === 'executive' 
             ? `Enterprise Overview: ${claims.length + cadvs.length + liqs.length} total lifetime requests.` 
             : `System Health: ${users.length} active users, ${todayHistory.length} audit events today.`}
        />
        <div className="flex bg-slate-100 p-1 rounded-lg">
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
      
      {view === 'executive' ? (
        <>
          <div className="bg-brand text-white p-6 rounded-xl mb-8 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ChartBar className="w-6 h-6" /> Executive Overview
              </h2>
              <p className="text-blue-100 mt-1">Enterprise performance, financial summaries, and claim analytics</p>
            </div>
            <Briefcase className="w-24 h-24 text-white opacity-10 absolute -right-2 -bottom-4 transform -rotate-12" weight="fill" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard title="Total Reimbursements" value={formatPHP(totalReimbursed)} icon={FileText} colorClass="text-indigo-600 bg-white" />
            <KPICard title="Total Cash Advances" value={formatPHP(totalCadvs)} icon={FileText} colorClass="text-emerald-600 bg-white" />
            <KPICard title="Active Requests" value={activeRequests} icon={Clock} colorClass="text-amber-600 bg-white" />
            <KPICard title="Completed Requests" value={completedClaims.length} icon={CheckCircle} colorClass="text-blue-600 bg-white" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <AnalyticsCard title="Enterprise Expense Trend">
              <SimpleLineChart data={monthlyExpenseData()} dataKey="Amount" name="Expenses (PHP)" />
            </AnalyticsCard>
            <AnalyticsCard title="Requests by Department">
              <SimpleBarChart data={departmentData()} dataKey="count" color="#2563eb" name="Requests" />
            </AnalyticsCard>
          </div>
        </>
      ) : (
        <>
          <div className="bg-slate-800 text-white p-6 rounded-xl mb-8 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <HardDrives className="w-6 h-6 text-indigo-400" /> System Administration
              </h2>
              <p className="text-slate-300 mt-1">Operational health, system management, and access controls</p>
            </div>
            <Gear className="w-24 h-24 text-slate-100 opacity-5 absolute -right-2 -bottom-4 animate-[spin_20s_linear_infinite]" weight="fill" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard title="Total Users" value={users.length} icon={Users} colorClass="text-blue-600 bg-white" />
            <KPICard title="Total Requests" value={claims.length + cadvs.length} icon={FileText} colorClass="text-slate-600 bg-white" />
            <KPICard title="System Audit (Today)" value={todayHistory.length} icon={ShieldCheck} colorClass="text-indigo-600 bg-white" />
            <KPICard title="System Health" value="100%" icon={Heartbeat} colorClass="text-emerald-600 bg-white" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <AnalyticsCard title="System Data Distribution">
                <DonutChart data={adminStatusDistribution} />
              </AnalyticsCard>
            </div>
            <div>
              <QuickActionsCard actions={quickActions} />
            </div>
          </div>
        </>
      )}

      <MyRequestsCards user={user} claims={claims} cadvs={cadvs} liqs={liqs} outstandingActionsCount={todayHistory.length} />
      <MyRecentSubmissionsTable user={user} claims={claims} cadvs={cadvs} liqs={liqs} />
    </div>
  );
};
