import React, { useEffect, useState } from 'react';
import { format, differenceInCalendarDays, differenceInHours } from 'date-fns';
import { apiFetch } from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { Claim, ClaimStatus, User } from '../types';
import { ChevronDown, ChevronRight, RefreshCw, Paperclip } from 'lucide-react';

const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Check'];

type ClaimWithDetails = Claim & { requestor?: User; mom?: any; expenses?: any[]; approvals?: any[] };

export const ProcessingQueue: React.FC = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'queue' | 'history'>('queue');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [paymentRef, setPaymentRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [releaseCode, setReleaseCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [resending, setResending] = useState(false);

  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterRequestor, setFilterRequestor] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');

  const fetchClaims = () => {
    apiFetch('/api/claims').then(data => {
      setClaims(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchClaims();
    apiFetch('/api/users').then(setUsers).catch(() => {});
  }, []);

  const pendingClaims = claims.filter(c => c.status === ClaimStatus.FOR_PROCESSING);
  const myProcessed = claims.filter(c => c.status === ClaimStatus.PROCESSED && c.processed_by === user?.id);

  const now = new Date();
  const releasedToday = myProcessed.filter(c => new Date(c.updated_at).toDateString() === now.toDateString()).length;
  const releasedThisMonthClaims = myProcessed.filter(c => {
    const d = new Date(c.updated_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const releasedThisMonthTotal = releasedThisMonthClaims.reduce((sum, c) => sum + c.total_amount, 0);

  const avgReleaseHours = (() => {
    const withApproval = myProcessed.filter(c => c.approved_at);
    if (withApproval.length === 0) return null;
    const total = withApproval.reduce((sum, c) => sum + differenceInHours(new Date(c.updated_at), new Date(c.approved_at!)), 0);
    return total / withApproval.length;
  })();

  const formatDuration = (hours: number | null) => {
    if (hours === null) return '—';
    if (hours < 1) return '<1h';
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  const getApproverInfo = (claim: ClaimWithDetails) => {
    const approvalRecord = (claim.approvals || []).slice().reverse().find((a: any) => a.decision === 'Approved');
    if (approvalRecord) {
      const approver = users.find(u => u.id === approvalRecord.approver_id);
      return { name: approver?.name || 'Unknown Approver', comment: approvalRecord.comment || 'No comment provided.' };
    }
    const approver = users.find(u => u.id === claim.current_approver_id);
    return { name: approver?.name || 'Unknown Approver', comment: 'No comment on file.' };
  };

  const getAgingDays = (claim: ClaimWithDetails) => differenceInCalendarDays(now, new Date(claim.approved_at || claim.updated_at));

  const getAgingBadge = (days: number) => {
    const label = days <= 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'}`;
    if (days >= 5) return { label, color: 'bg-red-100 text-red-800 border-red-200' };
    if (days >= 3) return { label, color: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { label, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  const toggleExpand = (claim: ClaimWithDetails) => {
    if (expandedId === claim.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(claim.id);
    setPaymentRef('');
    setPaymentMethod('');
    setReleaseCode('');
    setConfirming(false);
  };

  const handleMarkProcessedClick = () => {
    if (!paymentRef) return alert('Payment reference is required.');
    if (!paymentMethod) return alert('Payment method is required.');
    if (!releaseCode) return alert('Release code is required.');
    setConfirming(true);
  };

  const confirmProcess = async (claimId: string) => {
    try {
      await apiFetch(`/api/claims/${claimId}/process`, {
        method: 'POST',
        body: JSON.stringify({ payment_reference: paymentRef, payment_method: paymentMethod, release_code: releaseCode })
      });
      setExpandedId(null);
      setConfirming(false);
      fetchClaims();
    } catch (err: any) {
      alert(err.message || 'Failed to process claim');
      setConfirming(false);
    }
  };

  const handleResendCode = async (claimId: string) => {
    setResending(true);
    try {
      await apiFetch(`/api/claims/${claimId}/resend-code`, { method: 'PUT' });
      fetchClaims();
      alert('A new release code has been generated and emailed to the Custodian inbox.');
    } catch (err: any) {
      alert(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const historyRequestors = Array.from(new Set(myProcessed.map(c => c.requestor_id)))
    .map(id => users.find(u => u.id === id))
    .filter(Boolean) as User[];

  const filteredHistory = myProcessed.filter(c => {
    if (filterFrom && new Date(c.updated_at) < new Date(filterFrom)) return false;
    if (filterTo && new Date(c.updated_at) > new Date(`${filterTo}T23:59:59`)) return false;
    if (filterRequestor && c.requestor_id !== filterRequestor) return false;
    if (filterMinAmount && c.total_amount < Number(filterMinAmount)) return false;
    if (filterMaxAmount && c.total_amount > Number(filterMaxAmount)) return false;
    return true;
  }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  if (loading) return <div className="text-sm text-gray-500">Loading queue...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium text-gray-900 tracking-tight">Processing Queue</h2>
        <p className="mt-1 text-sm text-gray-500">Approved claims waiting for payment and processing.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Pending Release</div>
          <div className="text-2xl font-light text-gray-900 mt-1">{pendingClaims.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Released Today</div>
          <div className="text-2xl font-light text-gray-900 mt-1">{releasedToday}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Released This Month</div>
          <div className="text-2xl font-light text-[#0095D5] mt-1">₱{releasedThisMonthTotal.toFixed(2)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Avg. Time to Release</div>
          <div className="text-2xl font-light text-gray-900 mt-1">{formatDuration(avgReleaseHours)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button onClick={() => setTab('queue')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'queue' ? 'border-[#0095D5] text-[#0095D5]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Queue ({pendingClaims.length})
        </button>
        <button onClick={() => setTab('history')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'history' ? 'border-[#0095D5] text-[#0095D5]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Processing History
        </button>
      </div>

      {tab === 'queue' ? (
        <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm">
          <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-medium text-gray-800 text-sm">For Processing</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F4F6F8]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Requestor</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Approved Date</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Aging</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {pendingClaims.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No claims awaiting processing.</td>
                  </tr>
                ) : pendingClaims.map(claim => {
                  const isExpanded = expandedId === claim.id;
                  const days = getAgingDays(claim);
                  const badge = getAgingBadge(days);
                  const approverInfo = getApproverInfo(claim);
                  return (
                    <React.Fragment key={claim.id}>
                      <tr className="hover:bg-blue-50/50 transition-colors cursor-pointer" onClick={() => toggleExpand(claim)}>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{claim.requestor?.name}</div>
                              <div className="text-[11px] text-gray-500">{claim.requestor?.department}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium text-gray-900">${claim.total_amount.toFixed(2)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-[11px] text-gray-500">
                          {format(new Date(claim.approved_at || claim.updated_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-center">
                          <span className={`px-2 py-0.5 inline-flex text-[11px] font-semibold rounded-full border ${badge.color}`}>{badge.label}</span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={(e) => { e.stopPropagation(); toggleExpand(claim); }} className="text-[#0095D5] hover:text-[#007BAF]">
                            {isExpanded ? 'Close' : 'Review'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="bg-[#F9FAFB] border-t border-b border-gray-200 px-6 py-5">
                            <div className="space-y-4 max-w-3xl">
                              {claim.client_meeting_details && (
                                <div className="border border-gray-200 rounded text-sm overflow-hidden bg-white">
                                  <div className="bg-[#F4F6F8] px-4 py-2 border-b border-gray-200 font-medium text-gray-700 text-xs uppercase tracking-wider">Client Meeting Details</div>
                                  <div className="p-4 grid grid-cols-2 gap-3">
                                    <div><span className="text-gray-500 block text-xs mb-0.5">Company</span>{claim.client_meeting_details.company_name}</div>
                                    <div><span className="text-gray-500 block text-xs mb-0.5">Account Type</span>{claim.client_meeting_details.type_of_account}</div>
                                    <div className="col-span-2"><span className="text-gray-500 block text-xs mb-0.5">Purpose</span>{claim.client_meeting_details.purpose_of_meeting}</div>
                                    <div><span className="text-gray-500 block text-xs mb-0.5">Contact</span>{claim.client_meeting_details.contact_person} ({claim.client_meeting_details.contact_person_designation})</div>
                                    <div><span className="text-gray-500 block text-xs mb-0.5">Location</span>{claim.client_meeting_details.location}</div>
                                    {claim.mom?.summary && (
                                      <div className="col-span-2 pt-2 border-t border-gray-100">
                                        <span className="text-gray-500 block text-xs mb-0.5">MOM Summary</span>{claim.mom.summary}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="border border-gray-200 rounded text-sm overflow-hidden bg-white">
                                <div className="bg-[#F4F6F8] px-4 py-2 border-b border-gray-200 font-medium text-gray-700 text-xs uppercase tracking-wider">Approval</div>
                                <div className="p-4">
                                  <div><span className="text-gray-500 block text-xs mb-0.5">Approved By</span>{approverInfo.name}</div>
                                  <div className="mt-2"><span className="text-gray-500 block text-xs mb-0.5">Comment</span>{approverInfo.comment}</div>
                                </div>
                              </div>

                              <div className="border border-gray-200 rounded text-sm overflow-hidden bg-white">
                                <div className="bg-[#F4F6F8] px-4 py-2 border-b border-gray-200 font-medium text-gray-700 text-xs uppercase tracking-wider">Line Items</div>
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead>
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Vendor / Purpose</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Receipt</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {(claim.expenses || []).map((exp: any) => (
                                      <tr key={exp.id}>
                                        <td className="px-4 py-2">
                                          <div className="font-medium text-gray-900">{exp.vendor}</div>
                                          <div className="text-xs text-gray-500">{exp.expense_date} • {exp.business_purpose}</div>
                                        </td>
                                        <td className="px-4 py-2 text-gray-600 text-xs">{exp.category}</td>
                                        <td className="px-4 py-2 text-xs">
                                          {exp.receipt_url ? (
                                            <a href={exp.receipt_url} target="_blank" rel="noreferrer" className="text-[#0095D5] hover:underline inline-flex items-center gap-1">
                                              <Paperclip className="w-3 h-3" /> View Receipt
                                            </a>
                                          ) : (
                                            <span className="text-gray-400 italic">None</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-right font-medium text-gray-900">${exp.amount.toFixed(2)}</td>
                                      </tr>
                                    ))}
                                    <tr className="bg-gray-50 border-t border-gray-200">
                                      <td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold uppercase text-gray-700">Total</td>
                                      <td className="px-4 py-2 text-right font-bold text-[#0095D5]">${claim.total_amount.toFixed(2)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <div className="border border-[#0095D5] rounded text-sm bg-blue-50/10 shadow-sm">
                                <div className="bg-[#0095D5] bg-opacity-10 px-4 py-2 border-b border-[#0095D5] border-opacity-20 font-semibold text-[#0095D5] text-xs uppercase tracking-wider flex items-center justify-between">
                                  Release Payment
                                  <button
                                    onClick={() => handleResendCode(claim.id)}
                                    disabled={resending}
                                    className="flex items-center gap-1 text-[11px] font-medium text-[#0095D5] hover:text-[#007BAF] normal-case disabled:opacity-50"
                                  >
                                    <RefreshCw className="w-3 h-3" /> Resend Release Code
                                  </button>
                                </div>
                                <div className="p-4 space-y-4">
                                  {!confirming ? (
                                    <>
                                      <div className="grid grid-cols-3 gap-4">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Payment Reference</label>
                                          <input type="text" className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                                            value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="e.g. TXN-987654321" />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                                          <select className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                                            value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                            <option value="">Select...</option>
                                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Release Code (from Email)</label>
                                          <input type="text" className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5] uppercase"
                                            value={releaseCode} onChange={e => setReleaseCode(e.target.value.toUpperCase())} placeholder="e.g. A1B2C3" />
                                        </div>
                                      </div>
                                      <button onClick={handleMarkProcessedClick} className="bg-[#0095D5] text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-[#007BAF] transition-colors shadow-sm">
                                        Mark as Processed
                                      </button>
                                    </>
                                  ) : (
                                    <div className="bg-amber-50 border border-amber-200 rounded p-4 space-y-3">
                                      <p className="text-sm text-gray-800">
                                        You're about to release <span className="font-semibold">${claim.total_amount.toFixed(2)}</span> to{' '}
                                        <span className="font-semibold">{claim.requestor?.name}</span> for claim{' '}
                                        <span className="font-mono font-semibold">#{claim.id.substring(0, 8)}</span>, approved by{' '}
                                        <span className="font-semibold">{approverInfo.name}</span>.
                                      </p>
                                      <div className="flex gap-2">
                                        <button onClick={() => confirmProcess(claim.id)} className="bg-[#0095D5] text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-[#007BAF] transition-colors shadow-sm">
                                          Confirm & Release
                                        </button>
                                        <button onClick={() => setConfirming(false)} className="bg-white border border-gray-300 text-gray-700 px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-50 transition-colors">
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded p-4 shadow-sm grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
              <input type="date" className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
              <input type="date" className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Requestor</label>
              <select className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                value={filterRequestor} onChange={e => setFilterRequestor(e.target.value)}>
                <option value="">All</option>
                {historyRequestors.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Min Amount</label>
              <input type="number" className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                value={filterMinAmount} onChange={e => setFilterMinAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Amount</label>
              <input type="number" className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                value={filterMaxAmount} onChange={e => setFilterMaxAmount(e.target.value)} placeholder="No limit" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#F4F6F8]">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Claim ID</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Requestor</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Payment Ref</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Processed Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No processed claims match these filters.</td>
                    </tr>
                  ) : filteredHistory.map(claim => (
                    <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">{claim.id.substring(0, 8)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">{claim.requestor?.name}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium text-gray-900">${claim.total_amount.toFixed(2)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm font-mono text-gray-600">{claim.payment_reference}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">{claim.payment_method || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[11px] text-gray-500">{format(new Date(claim.updated_at), 'MMM d, yyyy h:mm a')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
