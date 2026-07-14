import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../lib/api';
import { Claim, ClaimStatus, UserRole } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { ClaimDetail } from './ClaimDetail';
import { getStatusColor } from '../utils';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const fetchClaims = () => {
    setLoading(true);
    apiFetch('/api/claims')
      .then(setClaims)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    if (user.role === UserRole.APPROVER) navigate('/approvals');
    if (user.role === UserRole.CUSTODIAN) navigate('/processing');
    if (user.role === UserRole.ADMIN) navigate('/audit');
    fetchClaims();
  }, [user, navigate]);

  if (loading && claims.length === 0) return <div className="text-sm text-gray-500">Loading dashboard...</div>;

  const pendingCount = claims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL).length;
  const approvedThisMonth = claims.filter(c => {
    const isApprovedOrProcessed = c.status === ClaimStatus.APPROVED || c.status === ClaimStatus.PROCESSED;
    const isThisMonth = new Date(c.updated_at).getMonth() === new Date().getMonth();
    return isApprovedOrProcessed && isThisMonth;
  }).length;
  const totalReimbursed = claims.filter(c => c.status === ClaimStatus.PROCESSED).reduce((sum, c) => sum + c.total_amount, 0);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-gray-900 tracking-tight">Dashboard</h2>
        <Link to="/claims/new" className="bg-[#0095D5] text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-[#007BAF] transition-colors shadow-sm">
          New Claim
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded p-4 flex flex-col justify-center shadow-sm">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Pending Approval</div>
          <div className="text-2xl font-light text-gray-900 mt-1">{pendingCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4 flex flex-col justify-center shadow-sm">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Approved This Month</div>
          <div className="text-2xl font-light text-gray-900 mt-1">{approvedThisMonth}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4 flex flex-col justify-center shadow-sm">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Total Reimbursed</div>
          <div className="text-2xl font-light text-[#0095D5] mt-1">${totalReimbursed.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm">
        <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium text-gray-800 text-sm">Recent Claims</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#F4F6F8]">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">ID / Date <ChevronDown className="w-3 h-3 text-gray-400"/></div>
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">MOM Date <ChevronDown className="w-3 h-3 text-transparent"/></div>
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center justify-end gap-1">Amount <ChevronDown className="w-3 h-3 text-transparent"/></div>
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center justify-center gap-1">Status <ChevronDown className="w-3 h-3 text-transparent"/></div>
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No claims found.</td>
                </tr>
              ) : claims.map((claim: any) => (
                <tr key={claim.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm">
                    <div className="font-medium text-[#0095D5] cursor-pointer hover:underline" onClick={() => setSelectedClaimId(claim.id)}>{claim.id.substring(0,8)}</div>
                    <div className="text-[11px] text-gray-500">{new Date(claim.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                    {claim.mom?.meeting_date || 'Pending'}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    ${claim.total_amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-center">
                    <span className={`px-2 py-0.5 inline-flex text-[11px] leading-4 font-semibold rounded-full border ${getStatusColor(claim.status)}`}>
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setSelectedClaimId(claim.id)} className="text-[#0095D5] hover:text-[#007BAF]">View</button>
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
                <button className="relative inline-flex items-center px-2 py-1.5 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="relative inline-flex items-center px-3 py-1.5 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  1
                </button>
                <button className="relative inline-flex items-center px-2 py-1.5 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Next</span>
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
