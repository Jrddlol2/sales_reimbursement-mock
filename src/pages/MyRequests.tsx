import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../lib/api';
import { Claim, CashAdvance, Liquidation, User, UserRole } from '../types';
import { RecentActivityTable } from '../components/dashboard/RecentActivityTable';
import { MetricCard } from '../components/dashboard/MetricCard';
import { metricsForRole, MetricContext } from '../metrics/registry';
import { DashboardPeriodProvider, useDashboardPeriod } from '../contexts/DashboardPeriodContext';
import { PlusCircle, UserCircle, Wallet, X, CaretLeft, CaretRight } from '@phosphor-icons/react';

const PAGE_SIZE = 10;

// Mirrors the Requestor Dashboard's own "My Requests" panel exactly (same
// registry metrics, same MetricCard, same colors/icons/period-scoped
// labels) — this page is the one place both Requestors and Approvers land
// on to see their own submissions, so it shouldn't show a different KPI set
// than the Requestor dashboard homepage already does. Needs its own period
// provider since this page lives outside the Dashboard route's.
const MyRequestsKPIs: React.FC<{ user: User; claims: Claim[]; cadvs: CashAdvance[]; liqs: Liquidation[] }> = ({ user, claims, cadvs, liqs }) => {
  const { resolveMetricRange, effectiveScope } = useDashboardPeriod();
  const ctx: MetricContext = { claims, cashAdvances: cadvs, liquidations: liqs, users: [], currentUser: user };
  const metricDefs = metricsForRole(UserRole.REQUESTOR);
  const metricActionMap: Record<string, { actionLabel: string; actionPath: string }> = {
    requestor_my_claims: { actionLabel: 'View All', actionPath: '/my-requests' },
    requestor_pending_claims: { actionLabel: 'View Pending', actionPath: '/my-requests?status=Pending Approval' },
    requestor_approved_this_month: { actionLabel: 'View Processing', actionPath: '/my-requests?status=Processing' },
    requestor_rejected_this_month: { actionLabel: 'View Rejected', actionPath: '/my-requests?status=Rejected' },
    requestor_amount_reimbursed_ytd: { actionLabel: 'View Completed', actionPath: '/my-requests?status=Completed' },
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-slate-800 mb-1">My Requests</h2>
      <p className="text-sm text-slate-500 mb-4">Track the status of your submitted requests, each scoped to its own relevant period</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {metricDefs.map(metric => {
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
  );
};

export const MyRequests: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const typeFilter = searchParams.get('type');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cadvs, setCadvs] = useState<CashAdvance[]>([]);
  const [liqs, setLiqs] = useState<Liquidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

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

  if (loading || !user) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 w-56 bg-slate-200 rounded"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-28"></div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl h-64"></div>
      </div>
    );
  }

  const myItems = [
    ...claims.filter(c => c.requestor_id === user.id).map(c => ({
      id: c.id,
      reference: `REIM-${c.id.substring(0, 6)}`,
      type: 'Reimbursement',
      status: c.status,
      amount: c.total_amount,
      date: c.created_at,
      path: `/claims/${c.id}`
    })),
    ...cadvs.filter(c => c.requestorId === user.id).map(c => ({
      id: c.id,
      reference: `CADV-${c.id.substring(0, 6)}`,
      type: 'Cash Advance',
      status: c.status,
      amount: c.amount,
      date: c.createdAt,
      path: `/cash-advances/${c.id}`
    })),
    ...liqs.filter(l => l.requestorId === user.id).map(l => ({
      id: l.id,
      reference: `LIQ-${l.id.substring(0, 6)}`,
      type: 'Liquidation',
      status: l.status,
      amount: l.totalSpent,
      date: l.createdAt,
      path: `/liquidations/${l.id}`
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const availableStatuses = Array.from(new Set(myItems.map(i => i.status))).sort();

  const filteredItems = myItems
    .filter(i => !statusFilter || i.status === statusFilter)
    .filter(i => !typeFilter || i.type === typeFilter);

  // The submission history has no natural cap (a long-tenured requestor can
  // have hundreds of rows), so it needs pagination rather than rendering
  // everything into one indefinitely-scrolling table.
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-brand" /> My Requests
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your own submitted reimbursements, cash advances, and liquidations — separate from your approval queue.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/ready-to-claim"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Wallet className="w-4 h-4" /> Ready to Claim
          </Link>
          <Link
            to="/claims/new"
            className="corp-btn-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
          >
            <PlusCircle className="w-4 h-4" /> New Request
          </Link>
        </div>
      </div>

      <DashboardPeriodProvider>
        <MyRequestsKPIs user={user} claims={claims} cadvs={cadvs} liqs={liqs} />
      </DashboardPeriodProvider>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter || 'All'}
          onChange={e => {
            if (e.target.value === 'All') searchParams.delete('status');
            else searchParams.set('status', e.target.value);
            setSearchParams(searchParams);
            setPage(1);
          }}
          className="border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:border-brand focus:outline-none font-semibold text-slate-700"
        >
          <option value="All">All Statuses</option>
          {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={typeFilter || 'All'}
          onChange={e => {
            if (e.target.value === 'All') searchParams.delete('type');
            else searchParams.set('type', e.target.value);
            setSearchParams(searchParams);
            setPage(1);
          }}
          className="border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:border-brand focus:outline-none font-semibold text-slate-700"
        >
          <option value="All">All Types</option>
          <option value="Reimbursement">Reimbursement</option>
          <option value="Cash Advance">Cash Advance</option>
          <option value="Liquidation">Liquidation</option>
        </select>
        {(statusFilter || typeFilter) && (
          <button
            onClick={() => { searchParams.delete('status'); searchParams.delete('type'); setSearchParams(searchParams); }}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            <X className="w-3 h-3" /> Clear filters
          </button>
        )}
      </div>

      <RecentActivityTable
        title="My Submission History"
        items={paginatedItems}
        emptyMessage={statusFilter || typeFilter ? "No requests match the selected filters." : "No requests submitted yet — new reimbursements, cash advances, and liquidations you file will show up here."}
      />

      {filteredItems.length > 0 && (
        <div className="flex items-center justify-between -mt-4">
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredItems.length)}</span> of <span className="font-semibold text-slate-700">{filteredItems.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-600 px-2 py-1.5 rounded border border-slate-300 bg-white"
            >
              <CaretLeft className="w-3 h-3" /> Prev
            </button>
            <span className="text-xs text-slate-500 font-semibold">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-600 px-2 py-1.5 rounded border border-slate-300 bg-white"
            >
              Next <CaretRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
