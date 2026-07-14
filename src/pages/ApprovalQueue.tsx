import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Claim, ClaimStatus } from '../types';
import { ClaimDetail } from './ClaimDetail';
import { getStatusColor } from '../utils';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export const ApprovalQueue: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = () => {
    apiFetch('/api/claims').then(data => {
      setClaims(data.filter((c: Claim) => c.status === ClaimStatus.PENDING_APPROVAL));
      setLoading(false);
    });
  };

  if (loading) return <div className="text-sm text-gray-500">Loading queue...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium text-gray-900 tracking-tight">Approval Queue</h2>
        <p className="mt-1 text-sm text-gray-500">Claims pending your review from direct reports.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm">
        <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium text-gray-800 text-sm">Pending Claims</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#F4F6F8]">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">Requestor <ChevronDown className="w-3 h-3 text-transparent"/></div>
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">MOM Date <ChevronDown className="w-3 h-3 text-transparent"/></div>
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center justify-end gap-1">Amount <ChevronDown className="w-3 h-3 text-transparent"/></div>
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">Submitted <ChevronDown className="w-3 h-3 text-gray-400"/></div>
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No pending approvals. You're all caught up!</td>
                </tr>
              ) : claims.map((claim: any) => (
                <tr key={claim.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="text-sm font-medium text-[#0095D5] cursor-pointer hover:underline" onClick={() => setSelectedClaimId(claim.id)}>{claim.requestor?.name}</div>
                    <div className="text-[11px] text-gray-500">{claim.requestor?.department}</div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                    {claim.mom?.meeting_date || 'N/A'}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    ${claim.total_amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-[11px] text-gray-500">
                    {new Date(claim.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setSelectedClaimId(claim.id)} className="text-[#0095D5] hover:text-[#007BAF]">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination visually represented */}
        <div className="bg-white px-4 py-2 border-t border-gray-200 flex items-center justify-between sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] text-gray-500">
                Showing <span className="font-medium text-gray-900">1</span> to <span className="font-medium text-gray-900">{claims.length}</span> of <span className="font-medium text-gray-900">{claims.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-1.5 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="relative inline-flex items-center px-2 py-1.5 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
      
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
