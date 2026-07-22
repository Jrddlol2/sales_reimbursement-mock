import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Claim, ClaimStatus, CashAdvance, User } from '../types';
import { SimpleLineChart, SimpleBarChart, DonutChart, CHART_COLORS } from '../components/dashboard/AnalyticsCharts';
import { formatPHP } from '../utils';
import { ChartBar } from '@phosphor-icons/react';

export const AdminReporting: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cadvs, setCadvs] = useState<CashAdvance[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/claims'),
      apiFetch('/api/cash-advances'),
      apiFetch('/api/users')
    ]).then(([cData, caData, uData]) => {
      setClaims(cData);
      setCadvs(caData);
      setUsers(uData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading reports...</div>;
  }

  // Calculate stats
  const completedClaims = claims.filter(c => c.status === ClaimStatus.COMPLETED);
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

  // Requests by Department — This Month, moved here from the Admin Dashboard
  // so the same breakdown doesn't live in two places at once.
  const now = new Date();
  const departmentData = () => {
    const deps: Record<string, number> = {};
    claims
      .filter(c => {
        const d = new Date(c.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .forEach(c => {
        const u = users.find(u => u.id === c.requestor_id);
        if (u) deps[u.department] = (deps[u.department] || 0) + 1;
      });
    return Object.keys(deps).map(k => ({ name: k, count: deps[k] }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-display flex items-center gap-2">
          <ChartBar className="w-6 h-6 text-brand" /> System Reporting
        </h2>
        <p className="mt-1 text-xs text-slate-500">Comprehensive overview of platform analytics — the full deep-dive; the Dashboard only shows a summary.</p>
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
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{claims.length}</p>
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
          <h3 className="text-sm font-bold text-slate-800 mb-4">Requests by Department (This Month)</h3>
          <div className="h-64">
            <SimpleBarChart data={departmentData()} dataKey="count" colors={CHART_COLORS} name="Requests" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Claim Volume by Status</h3>
          <div className="h-64">
            <SimpleBarChart data={[
               { name: 'Pending', count: claims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL).length, color: '#d97706' },
               { name: 'Processing', count: claims.filter(c => c.status === ClaimStatus.PROCESSING).length, color: '#7c3aed' },
               { name: 'Completed', count: claims.filter(c => c.status === ClaimStatus.COMPLETED).length, color: '#16a34a' },
               { name: 'Rejected', count: claims.filter(c => c.status === ClaimStatus.REJECTED).length, color: '#dc2626' }
            ]} dataKey="count" colors={['#d97706', '#7c3aed', '#16a34a', '#dc2626']} name="Claims" />
          </div>
        </div>
      </div>
    </div>
  );
};
