import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Claim, ClaimStatus, CashAdvance, Liquidation } from '../types';
import { SimpleLineChart, SimpleBarChart, DonutChart } from '../components/dashboard/AnalyticsCharts';
import { ChartBar } from '@phosphor-icons/react';

export const AdminReporting: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cadvs, setCadvs] = useState<CashAdvance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/claims'),
      apiFetch('/api/cash-advances')
    ]).then(([cData, caData]) => {
      setClaims(cData);
      setCadvs(caData);
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
    
  // Spend Trend (by month)
  const monthlySpend: Record<string, number> = {};
  completedClaims.forEach(c => {
    const d = new Date(c.updated_at);
    const m = d.toLocaleString('default', { month: 'short' });
    monthlySpend[m] = (monthlySpend[m] || 0) + (c.expenses?.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) || 0);
  });
  const trendData = Object.entries(monthlySpend).map(([name, Total]) => ({ name, Total }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-display flex items-center gap-2">
          <ChartBar className="w-6 h-6 text-brand" /> System Reporting
        </h2>
        <p className="mt-1 text-xs text-slate-500">Comprehensive overview of platform analytics.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Top Expense Categories</h3>
          <div className="h-64">
            <DonutChart data={categoryData} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Monthly Spend Trend</h3>
          <div className="h-64">
            <SimpleLineChart data={trendData} dataKey="Total" name="Spend" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Claim Volume by Status</h3>
          <div className="h-64">
            <SimpleBarChart data={[
               { name: 'Pending', count: claims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL).length },
               { name: 'Processing', count: claims.filter(c => c.status === ClaimStatus.PROCESSING).length },
               { name: 'Completed', count: claims.filter(c => c.status === ClaimStatus.COMPLETED).length },
               { name: 'Rejected', count: claims.filter(c => c.status === ClaimStatus.REJECTED).length }
            ]} dataKey="count" name="Claims" />
          </div>
        </div>
      </div>
    </div>
  );
};
