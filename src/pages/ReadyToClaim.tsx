import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Claim, ClaimStatus } from '../types';
import { ClaimDetail } from './ClaimDetail';
import { getClaimNumber, formatPHP, getStatusDisplayLabel } from '../utils';
import { Wallet, Key, Calendar, Tag, ArrowRight, CurrencyDollar } from '@phosphor-icons/react';
import { useAuth } from '../components/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export const ReadyToClaim: React.FC = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const fetchClaims = () => {
    setLoading(true);
    apiFetch('/api/claims')
      .then((data: Claim[]) => {
        const readyToClaim = data.filter(c => c.status === ClaimStatus.READY_FOR_CLAIM);
        setClaims(readyToClaim);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching claims:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
          <div>
            <div className="h-6 w-48 bg-slate-200 rounded"></div>
            <div className="h-4 w-96 bg-slate-100 rounded mt-2"></div>
          </div>
        </div>

        {/* Skeleton Grid of cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[280px]">
              <div className="p-5 border-b border-slate-100 space-y-2">
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
                <div className="h-6 w-32 bg-slate-100 rounded"></div>
              </div>
              <div className="p-5 flex-1 space-y-3">
                <div className="h-3 w-full bg-slate-100 rounded"></div>
                <div className="h-3 w-full bg-slate-100 rounded"></div>
                <div className="h-3 w-2/3 bg-slate-100 rounded"></div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <div className="h-8 w-24 bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="ready_to_claim_page">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand" />
            Ready to Claim
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Surfaces all of your approved reimbursement claims that are finalized and waiting for your release-code entry.
          </p>
        </div>
      </div>

      {/* Main List */}
      <div className="corp-card flex flex-col overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-2">
            <div className="w-1 h-3 bg-brand rounded-full"></div>
            Actionable Claims ({claims.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          {claims.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-white">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                <Wallet className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No claims are currently ready for release.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                When a custodian prepares and releases your funds, those approved claims will appear here for security code verification.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Reference</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Category / Purpose</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Payment Method</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Total Amount</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Status</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {claims.map((claim) => {
                      const claimNumber = getClaimNumber(claim);
                      return (
                        <tr key={claim.id} className="hover:bg-brand/5 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-gray-950">{claimNumber}</span>
                            <span className="text-[10px] text-gray-400 block">{new Date(claim.updated_at || claim.created_at).toLocaleDateString()}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs">
                            <span className="font-semibold text-slate-800">{claim.expense_category || 'Meals'}</span>
                            {claim.notes && (
                              <span className="text-slate-500 truncate max-w-xs block font-normal">{claim.notes}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-slate-700">
                            {claim.payment_method || 'Cash Release'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-bold text-slate-900">
                            {formatPHP(claim.total_amount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <StatusBadge status={claim.status} label={getStatusDisplayLabel(claim.status)} size="sm" />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <button
                              onClick={() => setSelectedClaimId(claim.id)}
                              className="bg-brand hover:bg-brand-hover text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center justify-center gap-1.5 ml-auto transition-colors"
                              id={`claim_funds_btn_${claim.id}`}
                            >
                              <Key className="w-3.5 h-3.5" /> Enter Code
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Card View */}
              <div className="sm:hidden flex flex-col divide-y divide-slate-100">
                {claims.map((claim) => {
                  const claimNumber = getClaimNumber(claim);
                  return (
                    <div key={claim.id} className="p-4 hover:bg-slate-50 flex flex-col gap-3 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-brand">{claimNumber}</span>
                        <StatusBadge status={claim.status} label={getStatusDisplayLabel(claim.status)} size="sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-y-1.5 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400 font-medium mr-1">Category:</span>
                          <span className="font-semibold text-slate-800">{claim.expense_category}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 font-medium mr-1">Amount:</span>
                          <span className="font-extrabold text-slate-900">{formatPHP(claim.total_amount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium mr-1">Payment:</span>
                          <span className="font-semibold text-slate-700">{claim.payment_method || 'Cash Release'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 font-medium mr-1">Date:</span>
                          <span className="text-slate-700">{new Date(claim.updated_at || claim.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedClaimId(claim.id)}
                        className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2 rounded shadow-sm flex items-center justify-center gap-1.5 transition-colors mt-1"
                        id={`claim_funds_mobile_btn_${claim.id}`}
                      >
                        <Key className="w-3.5 h-3.5" /> Enter Code
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail overlay drawer */}
      {selectedClaimId && (
        <ClaimDetail
          claimId={selectedClaimId}
          onClose={() => setSelectedClaimId(null)}
          onUpdate={fetchClaims}
        />
      )}
    </div>
  );
};
