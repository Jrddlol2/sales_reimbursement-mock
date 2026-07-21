import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../lib/api';
import { Claim, CashAdvance, Liquidation } from '../types';
import { MyRequestsCards } from '../components/dashboard/MyRequestsCards';
import { RecentActivityTable } from '../components/dashboard/RecentActivityTable';
import { PlusCircle, UserCircle, Wallet, X } from '@phosphor-icons/react';

export const MyRequests: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
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

  const filteredItems = statusFilter ? myItems.filter(i => i.status === statusFilter) : myItems;

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

      <MyRequestsCards user={user} claims={claims} cadvs={cadvs} liqs={liqs} basePath="/my-requests" />

      {statusFilter && (
        <div className="flex items-center gap-2 -mt-4">
          <span className="text-xs font-semibold text-slate-500">Filtered by status:</span>
          <span className="inline-flex items-center gap-1.5 bg-brand/10 text-brand text-xs font-bold px-2.5 py-1 rounded-full">
            {statusFilter}
            <button
              onClick={() => { searchParams.delete('status'); setSearchParams(searchParams); }}
              className="hover:text-brand-hover"
              aria-label="Clear status filter"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      <RecentActivityTable
        title="My Submission History"
        items={filteredItems}
        emptyMessage={statusFilter ? `No ${statusFilter} requests found.` : "No requests submitted yet — new reimbursements, cash advances, and liquidations you file will show up here."}
      />
    </div>
  );
};
