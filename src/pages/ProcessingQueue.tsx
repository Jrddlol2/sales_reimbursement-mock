import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { apiFetch } from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { Claim, ClaimStatus, User } from '../types';
import { 
  CaretDown, CaretRight, ArrowsClockwise,
  Key, Check, CurrencyDollar, ArrowSquareOut, Calendar, User as UserIcon,
  Tag, Info, Bank, Question, FileText, Tray, FolderOpen, WarningCircle, Pulse, Clock, Wallet
} from '@phosphor-icons/react';
import { KPICard } from '../components/dashboard/KPICard';
import { formatPHP, getClaimNumber, getApproverInfo } from '../utils';
import { getAgingInfo } from '../statusConfig';
import { SourceLiquidationTag } from '../components/SourceLiquidationTag';
import { ClaimMomSummary } from '../components/ClaimMomSummary';
import { ClaimLineItems } from '../components/ClaimLineItems';
import { ClaimApprovalInfo } from '../components/ClaimApprovalInfo';
import { ClaimActivityTimeline } from '../components/ClaimActivityTimeline';
import { useToast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';
import { useNewDataAvailable } from '../hooks/useNewDataAvailable';

type ClaimWithDetails = Claim & { requestor?: User; mom?: any; expenses?: any[]; approvals?: any[] };

export const ProcessingQueue: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<'queue' | 'history' | 'cadv'>((searchParams.get('tab') as any) || 'queue');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Cash Advance / Liquidation states
  const [cashAdvances, setCashAdvances] = useState<any[]>([]);
  const [liquidations, setLiquidations] = useState<any[]>([]);
  const [releaseVouchers, setReleaseVouchers] = useState<Record<string, string>>({});

  // Form states
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customClaimCode, setCustomClaimCode] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Filter states
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterRequestor, setFilterRequestor] = useState('');

  const [filterMissingReceipts, setFilterMissingReceipts] = useState(false);

  const [isProcessingAdvance, setIsProcessingAdvance] = useState<string | null>(null);
  const [isProcessingRefund, setIsProcessingRefund] = useState<string | null>(null);

  // Optimistic UI: ids of items already actioned locally but not yet
  // reflected in a fresh fetch — hidden from their pending lists immediately
  // on click instead of waiting for the round-trip, then reconciled (or
  // un-hidden on error) once the request settles.
  const [pendingRemovalIds, setPendingRemovalIds] = useState<Set<string>>(new Set());
  const hideOptimistically = (id: string) => setPendingRemovalIds(prev => new Set(prev).add(id));
  const unhideOptimistically = (id: string) => setPendingRemovalIds(prev => {
    const next = new Set(prev);
    next.delete(id);
    return next;
  });

  const fetchClaims = () => {
    setLoading(true);
    setLoadError(false);
    Promise.all([
      apiFetch('/api/claims'),
      apiFetch('/api/cash-advances'),
      apiFetch('/api/liquidations'),
      apiFetch('/api/users')
    ])
      .then(([claimsData, caData, liqData, usersData]) => {
        setClaims(claimsData);
        setCashAdvances(caData);
        setLiquidations(liqData);
        setUsers(usersData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        setLoadError(true);
        toast.error('Failed to load the processing queue. Please try again.');
      });
  };

  // Background check for new/changed claims entering Processing (e.g. an
  // Approver just approved one elsewhere) — never replaces the list on its
  // own, just surfaces a banner the user can act on when ready.
  const { hasNewData: hasNewProcessingData, dismiss: dismissNewProcessingData } = useNewDataAvailable({
    intervalMs: 60000,
    currentIds: claims.filter(c => c.status === ClaimStatus.PROCESSING).map(c => c.id),
    fetchIds: async () => {
      const claimsData = await apiFetch('/api/claims');
      return claimsData.filter((c: Claim) => c.status === ClaimStatus.PROCESSING).map((c: Claim) => c.id);
    },
  });

  const handleReleaseAdvance = async (id: string) => {
    const reference = releaseVouchers[id] || '';
    if (!reference.trim()) {
      return toast.error('A Release Voucher Reference is required to release cash advance funds.');
    }
    setIsProcessingAdvance(id);
    hideOptimistically(id);
    try {
      await apiFetch(`/api/cash-advances/${id}/release`, {
        method: 'POST',
        body: JSON.stringify({ releaseReference: reference })
      });
      toast.success('Cash Advance funds released successfully.');
      fetchClaims();
    } catch (err: any) {
      unhideOptimistically(id);
      toast.error(err.message || 'Failed to release Cash Advance.');
    } finally {
      setIsProcessingAdvance(null);
    }
  };

  const handleCollectRefund = async (id: string) => {
    setIsProcessingRefund(id);
    hideOptimistically(id);
    try {
      await apiFetch(`/api/liquidations/${id}/collect-refund`, {
        method: 'POST'
      });
      toast.success('Refund collected and liquidation report successfully closed.');
      fetchClaims();
    } catch (err: any) {
      unhideOptimistically(id);
      toast.error(err.message || 'Failed to collect refund.');
    } finally {
      setIsProcessingRefund(null);
    }
  };

  const approvedAdvances = cashAdvances.filter(ca => ca.status === 'Approved' && !pendingRemovalIds.has(ca.id));
  const reviewedLiqs = liquidations.filter(l => l.status === 'Reviewed' && !pendingRemovalIds.has(l.id));

  useEffect(() => {
    fetchClaims();
    apiFetch('/api/activity/seen', {
      method: 'POST',
      body: JSON.stringify({ section: 'processing' })
    }).catch(console.error);
  }, []);

  const getClaimAging = (claim: ClaimWithDetails) => getAgingInfo(claim.approved_at || claim.created_at);

  const isMissingReceipt = (c: ClaimWithDetails) => {
    if (c.expenses && c.expenses.length > 0) {
      return c.expenses.some(e => !e.receipt_url || e.receipt_url === '');
    }
    return !c.receipt_url || c.receipt_url === '';
  };

  const pendingClaims = claims.filter(c => c.status === ClaimStatus.PROCESSING && !pendingRemovalIds.has(c.id) && (!filterMissingReceipts || isMissingReceipt(c)));
  const historyClaims = claims.filter(c => 
    [ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(c.status) && (!filterMissingReceipts || isMissingReceipt(c))
  );

  const missingReceiptsCount = claims.filter(c => 
    [ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM].includes(c.status) && isMissingReceipt(c)
  ).length;

  const totalAmountProcessing = claims
    .filter(c => c.status === ClaimStatus.PROCESSING)
    .reduce((sum, c) => sum + (c.total_amount || 0), 0);
    
  const totalAmountReady = claims
    .filter(c => c.status === ClaimStatus.READY_FOR_CLAIM)
    .reduce((sum, c) => sum + (c.total_amount || 0), 0);

  let oldestProcessingDays = 0;
  const processingClaims = claims.filter(c => c.status === ClaimStatus.PROCESSING);
  if (processingClaims.length > 0) {
    oldestProcessingDays = Math.max(...processingClaims.map(c => getClaimAging(c).days));
  }

  const toggleExpand = (claim: ClaimWithDetails) => {
    if (expandedId === claim.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(claim.id);
    setPaymentMethod('Cash');
    setCustomClaimCode(claim.release_code || '');
  };

  // Generate / Regenerate Code via put endpoint
  const handleGenerateCode = async (claimId: string, forceCustom?: string) => {
    try {
      const codeToSend = forceCustom || Math.random().toString(36).substring(2, 8).toUpperCase();
      const updated = await apiFetch(`/api/claims/${claimId}/claim-code`, {
        method: 'PUT',
        body: JSON.stringify({ code: codeToSend })
      });
      setCustomClaimCode(updated.release_code || '');
      // Update local state
      setClaims(claims.map(c => c.id === claimId ? { ...c, release_code: updated.release_code } : c));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update Claim Code');
    }
  };

  const handleMarkReadyForClaim = async (claimId: string) => {
    if (!customClaimCode) {
      return toast.error('Please generate or enter a Claim Code first.');
    }
    setIsProcessingAction(true);
    setExpandedId(null);
    hideOptimistically(claimId);
    try {
      // 1. Ensure the code is saved
      await apiFetch(`/api/claims/${claimId}/claim-code`, {
        method: 'PUT',
        body: JSON.stringify({ code: customClaimCode })
      });

      // 2. Mark Ready to Claim
      await apiFetch(`/api/claims/${claimId}/ready-for-claim`, {
        method: 'POST',
        body: JSON.stringify({ payment_method: paymentMethod })
      });

      fetchClaims();
      toast.success('Claim marked as Ready to Claim! The requestor has been notified with their Claim Code.');
    } catch (err: any) {
      unhideOptimistically(claimId);
      setExpandedId(claimId);
      toast.error(err.message || 'Failed to process claim');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const filteredHistory = historyClaims.filter(c => {
    if (filterFrom && new Date(c.updated_at) < new Date(filterFrom)) return false;
    if (filterTo && new Date(c.updated_at) > new Date(`${filterTo}T23:59:59`)) return false;
    if (filterRequestor && c.requestor_id !== filterRequestor) return false;
    return true;
  }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  if (loadError) {
    return (
      <div className="corp-card flex flex-col items-center justify-center text-center py-16 px-6">
        <WarningCircle className="w-10 h-10 text-red-400 mb-3" />
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Couldn't load the processing queue</h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
          Something went wrong while fetching claims, cash advances, and liquidations. The queue may not actually be empty — please try again.
        </p>
        <button onClick={fetchClaims} className="corp-btn-primary text-xs font-semibold px-4 py-2 rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="processing_queue_view">
      {/* Header title */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 font-display">Processing & Disbursement Queue</h1>
        <p className="mt-1 text-xs text-slate-500">
          Review approved Reimbursement claims to generate Claim Codes and disburse Philippine Peso (₱) cash funds, and release approved Cash Advances or collect Liquidation refunds under the Advances & Liquidations tab.
        </p>
      </div>

      {hasNewProcessingData && (
        <div className="bg-brand/10 border border-brand/30 text-brand text-xs font-semibold rounded-lg px-4 py-2.5 flex items-center justify-between gap-3">
          <span>New claims are available in the disbursement queue.</span>
          <button
            onClick={() => { dismissNewProcessingData(); fetchClaims(); }}
            className="flex items-center gap-1.5 font-bold underline decoration-2 underline-offset-2 hover:text-brand-hover shrink-0"
          >
            <ArrowsClockwise className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      )}

      {/* Metrics Cards - same KPICard component/sizing as the Dashboard, for visual consistency */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Missing Receipts"
          value={missingReceiptsCount}
          description={filterMissingReceipts ? "Claims without receipts. (Filtered)" : "Claims without receipts. (Click to filter)"}
          icon={WarningCircle}
          onClick={() => setFilterMissingReceipts(!filterMissingReceipts)}
          variant={filterMissingReceipts ? "action" : "info"}
        />
        <KPICard
          title="Total Pending Disbursement"
          value={formatPHP(totalAmountProcessing)}
          subValue={<span>{formatPHP(totalAmountReady)} <span className="text-[10px] font-semibold uppercase tracking-wider">Ready</span></span>}
          description="Value of claims awaiting disbursement."
          icon={Pulse}
          variant="info"
        />
        <KPICard
          title="Oldest In Processing"
          value={`${oldestProcessingDays}d`}
          description="Longest waiting claim in Processing status."
          icon={Clock}
          variant="warning"
        />
        <KPICard
          title="Advances & Liquidations"
          value={approvedAdvances.length + reviewedLiqs.length}
          description="Cash Advances to release and Liquidation refunds to collect."
          icon={Wallet}
          variant={approvedAdvances.length + reviewedLiqs.length > 0 ? "action" : "success"}
          onClick={() => { setTab('cadv'); searchParams.set('tab', 'cadv'); setSearchParams(searchParams); }}
        />
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => { setTab('queue'); searchParams.set('tab', 'queue'); setSearchParams(searchParams); }}
          className={`px-4 py-2 text-xs font-extrabold border-b-2 -mb-px transition-colors font-display flex items-center gap-1.5 ${
            tab === 'queue' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Disbursement Queue ({pendingClaims.length})
          {pendingClaims.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-center shrink-0">
              {pendingClaims.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setTab('cadv'); searchParams.set('tab', 'cadv'); setSearchParams(searchParams); }}
          className={`px-4 py-2 text-xs font-extrabold border-b-2 -mb-px transition-colors font-display flex items-center gap-1.5 ${
            tab === 'cadv' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Advances & Liquidations ({approvedAdvances.length + reviewedLiqs.length})
          {(approvedAdvances.length + reviewedLiqs.length) > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-center shrink-0">
              {approvedAdvances.length + reviewedLiqs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setTab('history'); searchParams.set('tab', 'history'); setSearchParams(searchParams); }}
          className={`px-4 py-2 text-xs font-extrabold border-b-2 -mb-px transition-colors font-display ${
            tab === 'history' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Disbursement History ({historyClaims.length})
        </button>
      </div>

      {tab === 'cadv' ? (
        <div className="space-y-6">
          {/* Approved Cash Advances awaiting release */}
          <div className="corp-card flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-2"><div className="w-1 h-3 bg-brand rounded-full"></div>Cash Advances Awaiting Funds Release</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {approvedAdvances.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400 italic">No cash advances awaiting disbursement release.</div>
              ) : (
                approvedAdvances.map(ca => {
                  const reqUser = users.find(u => u.id === ca.requestorId);
                  return (
                    <div key={ca.id} className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <Link 
                            to={`/cash-advances/${ca.id}`}
                            className="font-bold text-brand hover:underline text-sm block"
                          >
                            CADV-{ca.id.substring(0,6).toUpperCase()}
                          </Link>
                          <div className="text-xs text-slate-500 font-semibold mt-0.5">
                            Requestor: <strong className="text-slate-800">{reqUser?.name || 'Unknown'}</strong> ({reqUser?.department || 'No Dept'})
                          </div>
                          <div className="text-xs text-slate-600 mt-2 italic">Purpose: "{ca.purpose}"</div>
                        </div>
                        <div className="text-right font-extrabold text-slate-950 font-display text-sm">
                          {formatPHP(ca.amount)}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Enter Voucher Number / Disbursement Reference * (e.g. VCH-10492)"
                          value={releaseVouchers[ca.id] || ''}
                          onChange={e => setReleaseVouchers(p => ({ ...p, [ca.id]: e.target.value }))}
                          className="flex-1 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
                        />
                        <button
                          onClick={() => handleReleaseAdvance(ca.id)}
                          disabled={isProcessingAdvance === ca.id}
                          className="corp-btn-primary px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider w-full sm:w-auto text-center disabled:opacity-50"
                        >
                          Release Cash Funds
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Reviewed Liquidations awaiting refund collection */}
          <div className="corp-card flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-2"><div className="w-1 h-3 bg-brand rounded-full"></div>Liquidation Refunds to Collect</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {reviewedLiqs.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400 italic">No liquidation refunds currently awaiting custodian collection.</div>
              ) : (
                reviewedLiqs.map(l => {
                  const ca = cashAdvances.find(c => c.id === l.cashAdvanceId);
                  const reqUser = users.find(u => u.id === l.requestorId);
                  return (
                    <div key={l.id} className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                            <Link 
                              to={`/liquidations/${l.id}`}
                              className="font-bold text-brand hover:underline"
                            >
                              LIQ-{l.id.substring(0,6).toUpperCase()}
                            </Link>
                            <span className="text-slate-400 font-medium">(for</span>
                            {ca ? (
                              <Link 
                                to={`/cash-advances/${ca.id}`}
                                className="font-bold text-brand hover:underline"
                              >
                                CADV-{ca.id.substring(0,6).toUpperCase()}
                              </Link>
                            ) : (
                              <span className="text-slate-500 font-bold">None</span>
                            )}
                            <span className="text-slate-400 font-medium">)</span>
                          </div>
                          <div className="text-xs text-slate-500 font-semibold mt-0.5">
                            Requestor: <strong className="text-slate-800">{reqUser?.name || 'Unknown'}</strong> ({reqUser?.department || 'No Dept'})
                          </div>
                          <div className="text-[11px] text-slate-600 mt-2 font-bold space-x-3">
                            <span>Original Advance: {formatPHP(ca?.amount || 0)}</span>
                            <span>Total Spent Listed: {formatPHP(l.totalSpent)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Refund Due to Company</span>
                          <span className="text-amber-600 text-sm font-extrabold font-display">{formatPHP(Math.abs(l.varianceAmount))}</span>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleCollectRefund(l.id)}
                          disabled={isProcessingRefund === l.id}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                        >
                          Collect Refund & Close
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : tab === 'queue' ? (
        /* Queue View */
        <div className="corp-card overflow-hidden">
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Claim / Requestor</th>
                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Category</th>
                    <th className="px-4 py-3 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Amount</th>
                    <th className="px-4 py-3 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Aging</th>
                    <th className="px-4 py-3 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {pendingClaims.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-4">
                        <EmptyState icon={Tray} title="All Clear!" description="There are no approved reimbursement claims currently awaiting disbursement or processing." />
                      </td>
                    </tr>
                  ) : (
                    pendingClaims.map(claim => {
                      const isExpanded = expandedId === claim.id;
                      const aging = getClaimAging(claim);
                      const claimNumber = getClaimNumber(claim);

                      return (
                        <React.Fragment key={claim.id}>
                          {/* Table row */}
                          <tr 
                            onClick={() => toggleExpand(claim)}
                            className={`transition-colors cursor-pointer ${isExpanded ? 'bg-brand/10' : 'hover:bg-brand/5'}`}
                          >
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {isExpanded ? <CaretDown className="w-4 h-4 text-gray-400 shrink-0" /> : <CaretRight className="w-4 h-4 text-gray-400 shrink-0" />}
                                <div>
                                  <span className="font-mono text-xs font-bold text-gray-800 block">{claimNumber}</span>
                                  <span className="text-sm font-bold text-gray-900 block">{claim.requestor?.name}</span>
                                  <span className="text-[10px] text-gray-500 block">
                                    {claim.requestor?.job_title ? `${claim.requestor.job_title} · ${claim.requestor.department}` : claim.requestor?.department}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                              <div>{claim.expense_category || 'Meals'}</div>
                              {claim.sourceLiquidationId && (
                                <div className="mt-1">
                                  <SourceLiquidationTag />
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right font-bold text-gray-900 text-sm">
                              {formatPHP(claim.total_amount)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-center">
                              <span className={`px-2.5 py-0.5 inline-flex text-[10px] font-bold rounded-full border ${aging.badgeClass}`}>
                                {aging.label}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-bold">
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleExpand(claim); }}
                                className="text-brand hover:text-brand-hover"
                              >
                                {isExpanded ? 'Close' : 'Review & Disburse'}
                              </button>
                            </td>
                          </tr>

                          {/* Expandable row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={5} className="bg-gray-50 border-t border-b border-gray-100 px-8 py-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
                                  
                                  {/* Column 1: Details and Audit */}
                                  <div className="space-y-4">
                                    {/* MOM Details */}
                                    <div className="bg-white border border-gray-200 rounded p-4">
                                      <span className="text-[10px] text-brand font-bold uppercase tracking-wider block mb-2">Attached Minutes of Meeting</span>
                                      <ClaimMomSummary mom={claim.mom} compact />
                                    </div>

                                    {/* Approval Information */}
                                    <div className="bg-white border border-gray-200 rounded p-4">
                                      <ClaimApprovalInfo claim={claim} users={users} compact />
                                    </div>

                                    {/* Pulse Timeline */}
                                    <div className="bg-white border border-gray-200 rounded p-4">
                                      <span className="text-[10px] text-brand font-bold uppercase tracking-wider block mb-2">Pulse Timeline</span>
                                      <ClaimActivityTimeline history={claim.history} />
                                    </div>

                                    {/* Line items / receipts */}
                                    <div className="bg-white border border-gray-200 rounded overflow-hidden">
                                      <ClaimLineItems expenses={claim.expenses} totalAmount={claim.total_amount} fallbackReceiptUrl={claim.receipt_url} />
                                    </div>
                                  </div>

                                  {/* Column 2: Disbursement Input */}
                                  <div className="bg-white border border-brand rounded p-5 space-y-4">
                                    <span className="text-[10px] text-brand font-bold uppercase tracking-widest block border-b border-brand/10 pb-2">
                                      Generate Claim Code
                                    </span>

                                    {/* Payment method select */}
                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Channel</label>
                                      <select
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                        className="block w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none font-bold text-gray-800"
                                      >
                                        <option value="Cash">Cash Release</option>
                                        <option value="GCash">GCash E-Wallet</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                      </select>
                                    </div>

                                    {/* Claim Code generator block */}
                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Disbursement Claim Code</label>
                                      <div className="flex gap-2">
                                        <input 
                                          type="text" 
                                          value={customClaimCode}
                                          onChange={e => setCustomClaimCode(e.target.value.toUpperCase())}
                                          placeholder="e.g. SL8X9B"
                                          className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none font-mono font-bold uppercase text-gray-800 tracking-widest text-slate-800 bg-white"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleGenerateCode(claim.id)}
                                          className="px-3 py-1.5 border border-gray-300 hover:bg-brand/5 text-xs font-bold text-gray-700 rounded flex items-center gap-1 shrink-0"
                                        >
                                          <ArrowsClockwise className="w-3.5 h-3.5" /> Auto Code
                                        </button>
                                      </div>
                                      <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                                        This unique code is required by the employee to claim their cash funds.
                                      </p>
                                    </div>

                                    {/* Action mark */}
                                    <div className="pt-4 border-t border-gray-100">
                                      <button
                                        type="button"
                                        disabled={isProcessingAction}
                                        onClick={() => handleMarkReadyForClaim(claim.id)}
                                        className="corp-btn-primary"
                                      >
                                        <Check className="w-4 h-4" /> 
                                        {isProcessingAction ? 'Dispatching Notification...' : 'Finalize & Mark Ready to Claim'}
                                      </button>
                                    </div>

                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="sm:hidden flex flex-col divide-y divide-slate-100">
              {pendingClaims.length === 0 ? (
                <EmptyState icon={Tray} title="All Clear!" description="There are no approved reimbursement claims currently awaiting disbursement or processing." />
              ) : (
                pendingClaims.map(claim => {
                  const isExpanded = expandedId === claim.id;
                  const aging = getClaimAging(claim);
                  const claimNumber = getClaimNumber(claim);

                  return (
                    <div key={claim.id} className="flex flex-col">
                      <div 
                        onClick={() => toggleExpand(claim)}
                        className={`p-4 hover:bg-slate-50 cursor-pointer flex flex-col gap-2 transition-colors ${isExpanded ? 'bg-brand/5 font-semibold' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-brand text-xs">{claimNumber}</span>
                          <span className={`px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full border ${aging.badgeClass}`}>
                            {aging.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400 font-medium mr-1">Claimant:</span>
                            <span className="font-bold text-slate-900">{claim.requestor?.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 font-medium mr-1">Amount:</span>
                            <span className="font-extrabold text-slate-900">{formatPHP(claim.total_amount)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 font-medium mr-1">Category:</span>
                            <span className="font-semibold text-slate-800">{claim.expense_category || 'Meals'}</span>
                          </div>
                        </div>
                        <div className="flex justify-end mt-1 text-brand font-bold text-xs items-center gap-0.5">
                          <span>{isExpanded ? 'Collapse' : 'Review & Disburse'}</span>
                          {isExpanded ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-slate-50 border-t border-b border-slate-100 p-4 space-y-4">
                          <div className="space-y-4">
                            {/* MOM Details */}
                            <div className="bg-white border border-gray-200 rounded p-4">
                              <span className="text-[10px] text-brand font-bold uppercase tracking-wider block mb-2 font-display">Attached Minutes of Meeting</span>
                              <ClaimMomSummary mom={claim.mom} compact />
                            </div>

                            {/* Approval Information */}
                            <div className="bg-white border border-gray-200 rounded p-4">
                              <ClaimApprovalInfo claim={claim} users={users} compact />
                            </div>

                            {/* Pulse Timeline */}
                            <div className="bg-white border border-gray-200 rounded p-4">
                              <span className="text-[10px] text-brand font-bold uppercase tracking-wider block mb-2 font-display">Pulse Timeline</span>
                              <ClaimActivityTimeline history={claim.history} />
                            </div>

                            {/* Line items / receipts */}
                            <div className="bg-white border border-gray-200 rounded overflow-hidden">
                              <ClaimLineItems expenses={claim.expenses} totalAmount={claim.total_amount} fallbackReceiptUrl={claim.receipt_url} />
                            </div>
                          </div>

                          {/* Disbursement Input */}
                          <div className="bg-white border border-brand rounded p-4 space-y-4">
                            <span className="text-[10px] text-brand font-bold uppercase tracking-widest block border-b border-brand/10 pb-2 font-display">
                              Generate Claim Code
                            </span>

                            {/* Payment method select */}
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Channel</label>
                              <select
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                className="block w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none font-bold text-gray-800 bg-white"
                              >
                                <option value="Cash">Cash Release</option>
                                <option value="GCash">GCash E-Wallet</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                              </select>
                            </div>

                            {/* Claim Code generator block */}
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Disbursement Claim Code</label>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={customClaimCode}
                                  onChange={e => setCustomClaimCode(e.target.value.toUpperCase())}
                                  placeholder="e.g. SL8X9B"
                                  className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none font-mono font-bold uppercase text-gray-800 tracking-widest text-slate-800 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleGenerateCode(claim.id)}
                                  className="px-3 py-1.5 border border-gray-300 hover:bg-brand/5 text-xs font-bold text-gray-700 rounded flex items-center gap-1 shrink-0 bg-white"
                                >
                                  <ArrowsClockwise className="w-3.5 h-3.5" /> Auto Code
                                </button>
                              </div>
                            </div>

                            {/* Action mark */}
                            <div className="pt-4 border-t border-gray-100">
                              <button
                                type="button"
                                disabled={isProcessingAction}
                                onClick={() => handleMarkReadyForClaim(claim.id)}
                                className="w-full corp-btn-primary py-2 flex items-center justify-center gap-1.5 text-xs"
                              >
                                <Check className="w-4 h-4" /> 
                                {isProcessingAction ? 'Dispatching Notification...' : 'Finalize & Mark Ready to Claim'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* History View */
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-slate-50 border border-slate-200 rounded p-4 shadow-sm mb-4">
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-display">From Date</label>
                <input 
                  type="date" 
                  value={filterFrom}
                  onChange={e => setFilterFrom(e.target.value)}
                  className="block w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-sm font-sans text-slate-800"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-display">To Date</label>
                <input 
                  type="date" 
                  value={filterTo}
                  onChange={e => setFilterTo(e.target.value)}
                  className="block w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-sm font-sans text-slate-800"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-display">Search Claimant</label>
                <input 
                  type="text" 
                  placeholder="Search claimant name..."
                  value={filterRequestor}
                  onChange={e => setFilterRequestor(e.target.value)}
                  className="block w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-sm font-sans text-slate-800"
                />
              </div>
              <div className="pb-1 shrink-0">
                {(filterFrom || filterTo || filterRequestor) ? (
                  <button 
                    onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterRequestor(''); }}
                    className="text-xs text-brand hover:text-brand-hover font-bold hover:underline px-2"
                  >
                    Reset filters
                  </button>
                ) : (
                  <span className="text-xs text-transparent font-bold px-2 cursor-default pointer-events-none select-none">Reset filters</span>
                )}
              </div>
            </div>
          </div>

          {/* Table history */}
          <div className="corp-card overflow-hidden">
            <div className="overflow-x-auto">
              {/* Desktop View */}
              <div className="hidden md:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Claim Code / ID</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Employee</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Category</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Amount</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Disbursement Method</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Status</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Processed Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-4">
                          <EmptyState icon={FolderOpen} title="No History Found" description="No processed or historical claims found matching the current selected filters." />
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map(claim => {
                        const claimNumber = getClaimNumber(claim);
                        const isClaimed = claim.status === ClaimStatus.COMPLETED;
                        
                        // Match filter claimant name
                        if (filterRequestor && claim.requestor?.name && !claim.requestor.name.toLowerCase().includes(filterRequestor.toLowerCase())) {
                          return null;
                        }

                        return (
                          <tr key={claim.id} className="hover:bg-brand/5 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="font-mono text-xs font-bold text-gray-900 block">{claimNumber}</span>
                              <span className="text-[10px] text-gray-400 font-bold font-mono uppercase">CODE: {claim.release_code || '—'}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-xs text-gray-800 font-bold">{claim.requestor?.name}</div>
                              <div className="text-[10px] text-gray-500">
                                {claim.requestor?.job_title ? `${claim.requestor.job_title} · ${claim.requestor.department}` : claim.requestor?.department}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{claim.expense_category}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-gray-900 text-xs">{formatPHP(claim.total_amount)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 font-bold">{claim.payment_method || 'Cash'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                isClaimed 
                                  ? 'bg-green-50 border-green-200 text-green-700' 
                                  : 'bg-amber-50 border-amber-200 text-amber-700'
                              }`}>
                                {isClaimed ? 'Completed (Claimed)' : 'Ready to Claim'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-[10px] text-gray-500">
                              {claim.processing_date ? format(new Date(claim.processing_date), 'MMM d, yyyy h:mm a') : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden flex flex-col divide-y divide-slate-100">
                {filteredHistory.length === 0 ? (
                  <EmptyState icon={FolderOpen} title="No History Found" description="No processed or historical claims found matching the current selected filters." />
                ) : (
                  filteredHistory.map(claim => {
                    const claimNumber = getClaimNumber(claim);
                    const isClaimed = claim.status === ClaimStatus.COMPLETED;
                    
                    // Match filter claimant name
                    if (filterRequestor && claim.requestor?.name && !claim.requestor.name.toLowerCase().includes(filterRequestor.toLowerCase())) {
                      return null;
                    }

                    return (
                      <div key={claim.id} className="p-4 hover:bg-slate-50 flex flex-col gap-2 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-brand text-xs block">{claimNumber}</span>
                            <span className="text-[10px] text-gray-400 font-bold font-mono uppercase">CODE: {claim.release_code || '—'}</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            isClaimed 
                              ? 'bg-green-50 border-green-200 text-green-700' 
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            {isClaimed ? 'Claimed' : 'Ready'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400 font-medium mr-1">Employee:</span>
                            <span className="font-bold text-slate-900">{claim.requestor?.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 font-medium mr-1">Amount:</span>
                            <span className="font-extrabold text-slate-900">{formatPHP(claim.total_amount)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium mr-1">Category:</span>
                            <span className="font-semibold text-slate-800">{claim.expense_category}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 font-medium mr-1">Channel:</span>
                            <span className="font-bold text-slate-800">{claim.payment_method || 'Cash'}</span>
                          </div>
                          <div className="col-span-2 text-[10px] text-slate-400">
                            Processed: {claim.processing_date ? format(new Date(claim.processing_date), 'MMM d, yyyy h:mm a') : '—'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
