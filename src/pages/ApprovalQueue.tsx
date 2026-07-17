import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { Claim, ClaimStatus, ReviewMeetingStatus } from '../types';
import { ClaimDetail } from './ClaimDetail';
import { getStatusColor, formatPHP, getClaimNumber } from '../utils';
import { CaretDown, Tray, CheckSquare, Pulse, Clock, Warning, CalendarCheck } from '@phosphor-icons/react';
import { useAuth } from '../components/AuthContext';
import { KPITile } from '../components/KPITile';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { ClaimLineItems } from '../components/ClaimLineItems';

export const ApprovalQueue: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [inboxClaims, setInboxClaims] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<'inbox' | 'meetings' | 'history' | 'cadv'>((searchParams.get('tab') as any) || 'inbox');

  // Cash Advance / Liquidation states
  const [cashAdvances, setCashAdvances] = useState<any[]>([]);
  const [liquidations, setLiquidations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [approvalsComment, setApprovalsComment] = useState<Record<string, string>>({});

  // Review Meeting confirmation state
  const [reviewMeetings, setReviewMeetings] = useState<any[]>([]);
  const [meetingComment, setMeetingComment] = useState<Record<string, string>>({});
  const [isProcessingMeeting, setIsProcessingMeeting] = useState<string | null>(null);

  // Bulk actions
  const [selectedForBulk, setSelectedForBulk] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'Approved' | 'Rejected' | null>(null);
  const [bulkComment, setBulkComment] = useState('');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  useEffect(() => {
    fetchClaims();
    apiFetch('/api/activity/seen', {
      method: 'POST',
      body: JSON.stringify({ section: 'inbox' })
    }).catch(console.error);
  }, []);

  const fetchClaims = () => {
    setLoading(true);
    Promise.all([
      apiFetch('/api/claims'),
      apiFetch('/api/cash-advances'),
      apiFetch('/api/liquidations'),
      apiFetch('/api/users'),
      apiFetch('/api/review-meetings')
    ]).then(([claimsData, caData, liqData, usersData, meetingsData]) => {
      setAllClaims(claimsData);
      const pendingApprovals = claimsData.filter((c: Claim) => c.status === ClaimStatus.PENDING_APPROVAL && c.current_approver_id === user?.id);
      const returnedClaims = claimsData.filter((c: Claim) => c.status === ClaimStatus.RETURNED && c.requestor_id === user?.id);
      setInboxClaims([...pendingApprovals, ...returnedClaims].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
      setSelectedForBulk([]);

      // Filter pending items
      const pendingAdvances = caData.filter((ca: any) => ca.status === 'Submitted' && ca.approverId === user?.id);
      const pendingLiqs = liqData.filter((l: any) => l.status === 'Submitted' && caData.find((ca: any) => ca.id === l.cashAdvanceId)?.approverId === user?.id);

      setCashAdvances(caData);
      setLiquidations(liqData);
      setUsers(usersData);
      setReviewMeetings(meetingsData);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const handleConfirmMeeting = async (id: string) => {
    setIsProcessingMeeting(id);
    try {
      await apiFetch(`/api/review-meetings/${id}/confirm`, { method: 'POST' });
      toast.success('Review Meeting confirmed. The requestor has been notified.');
      fetchClaims();
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm the Review Meeting.');
    } finally {
      setIsProcessingMeeting(null);
    }
  };

  const handleDeclineMeeting = async (id: string) => {
    setIsProcessingMeeting(id);
    try {
      await apiFetch(`/api/review-meetings/${id}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason: meetingComment[id] || '' })
      });
      toast.success('Review Meeting declined. The requestor has been asked to propose a new time.');
      setMeetingComment(p => ({ ...p, [id]: '' }));
      fetchClaims();
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline the Review Meeting.');
    } finally {
      setIsProcessingMeeting(null);
    }
  };

  const handleApproveAdvance = async (id: string, decision: 'Approved' | 'Rejected') => {
    const comment = approvalsComment[id] || '';
    if (decision === 'Rejected' && !comment.trim()) {
      return toast.error('A comment is required when rejecting a Cash Advance.');
    }
    try {
      await apiFetch(`/api/cash-advances/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decision, comment })
      });
      toast.success(`Cash Advance successfully ${decision.toLowerCase()}.`);
      fetchClaims();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit decision.');
    }
  };

  const handleReviewLiquidation = async (id: string, decision: 'Approved' | 'Returned') => {
    const comment = approvalsComment[id] || '';
    if (decision === 'Returned' && !comment.trim()) {
      return toast.error('A comment is required when returning a Liquidation for revision.');
    }
    try {
      await apiFetch(`/api/liquidations/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, comment })
      });
      toast.success(`Liquidation successfully ${decision === 'Approved' ? 'approved' : 'returned for revision'}.`);
      fetchClaims();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit decision.');
    }
  };

  const pendingAdvances = cashAdvances.filter(ca => ca.status === 'Submitted' && ca.approverId === user?.id);
  const pendingLiqs = liquidations.filter(l => l.status === 'Submitted' && cashAdvances.find(ca => ca.id === l.cashAdvanceId)?.approverId === user?.id);
  const pendingMeetingConfirmations = reviewMeetings.filter(rm => rm.approver_id === user?.id && rm.status === ReviewMeetingStatus.PENDING_CONFIRMATION);

  const toggleBulkSelection = (id: string) => {
    setSelectedForBulk(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllBulk = () => {
    const pendings = inboxClaims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL);
    if (selectedForBulk.length === pendings.length) {
      setSelectedForBulk([]); // deselect all
    } else {
      setSelectedForBulk(pendings.map(c => c.id));
    }
  };

  const handleBulkSubmit = async (action: 'Approved' | 'Rejected') => {
    const ok = await confirm({
      title: `Bulk ${action}`,
      message: `Are you sure you want to ${action.toLowerCase()} ${selectedForBulk.length} claims?`,
      confirmLabel: `Yes, ${action}`,
      cancelLabel: 'Cancel',
      tone: action === 'Rejected' ? 'danger' : 'default',
    });
    
    if (!ok) return;

    setIsProcessingBulk(true);
    try {
      await Promise.all(selectedForBulk.map(id => 
        apiFetch(`/api/claims/${id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ decision: action, comment: bulkComment || `Bulk ${action}` })
        })
      ));
      toast.success(`Successfully ${action.toLowerCase()} ${selectedForBulk.length} claims.`);
      setBulkAction(null);
      setBulkComment('');
      setSelectedForBulk([]);
      fetchClaims();
    } catch (err: any) {
      toast.error(err.message || `Failed to process bulk action`);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Header */}
        <div className="animate-pulse">
          <div className="h-7 w-48 bg-slate-200 rounded-md mb-2"></div>
          <div className="h-4 w-96 bg-slate-100 rounded-md"></div>
        </div>

        {/* Skeleton KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-28 flex flex-col justify-between">
              <div className="h-4 w-24 bg-slate-200 rounded"></div>
              <div className="h-8 w-16 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>

        {/* Skeleton Table */}
        <div className="corp-card flex flex-col overflow-hidden animate-pulse">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
          </div>
          <div className="p-4 space-y-4">
            <div className="h-8 bg-slate-100 rounded-md w-full"></div>
            <div className="h-12 bg-slate-50 rounded-md w-full"></div>
            <div className="h-12 bg-slate-50 rounded-md w-full"></div>
            <div className="h-12 bg-slate-50 rounded-md w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Derive stats
  const pendingApprovals = inboxClaims.filter(c => c.status === ClaimStatus.PENDING_APPROVAL);
  const returnedClaims = inboxClaims.filter(c => c.status === ClaimStatus.RETURNED);
  
  const approverClaims = allClaims.filter(c => c.current_approver_id === user?.id || c.original_approver_id === user?.id);
  const spendByRequestor = approverClaims
    .filter(c => [ClaimStatus.APPROVED, ClaimStatus.PROCESSING, ClaimStatus.READY_FOR_CLAIM, ClaimStatus.COMPLETED].includes(c.status))
    .reduce((acc, c) => {
      const name = c.requestor?.name || "Unknown";
      acc[name] = (acc[name] || 0) + c.total_amount;
      return acc;
    }, {} as Record<string, number>);
  const requestorData = Object.entries(spendByRequestor).map(([name, value]) => ({ name, value: Number(value) })).sort((a,b) => b.value - a.value);

  const totalAmountPending = pendingApprovals.reduce((sum, c) => sum + (c.total_amount || 0), 0);

  const now = new Date();
  
  // Calculate oldest pending in days based on updated_at
  let oldestPendingDays = 0;
  if (pendingApprovals.length > 0) {
    const oldestDate = pendingApprovals.reduce((oldest, claim) => {
      const date = new Date(claim.updated_at);
      return date < oldest ? date : oldest;
    }, new Date());
    oldestPendingDays = Math.max(0, Math.floor((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const decisionHistoryItems = allClaims
    .filter(c => c.approvals && c.approvals.some((a: any) => a.approver_id === user?.id))
    .map(c => {
      const userApprovals = [...c.approvals].filter((a: any) => a.approver_id === user?.id);
      userApprovals.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const latestApproval = userApprovals[0];
      return {
        claim: c,
        decision: latestApproval.decision,
        date: latestApproval.timestamp,
        comment: latestApproval.comment
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">My Inbox</h2>
        <p className="mt-1 text-xs text-slate-500">Unified action list: Reimbursement claims, Cash Advances, and Liquidations awaiting your decision, plus your own claims returned for revision.</p>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-row gap-4 mb-6">
        <div className="flex-1">
          <KPITile
            label="Pending Approvals"
            value={pendingApprovals.length}
            description="Claims from direct reports awaiting your decision."
            icon={CheckSquare}
          />
        </div>
        <div className="flex-1">
          <KPITile
            label="Returned to You"
            value={returnedClaims.length}
            description="Your own claims needing revision."
            icon={Warning}
            isActive={returnedClaims.length > 0}
          />
        </div>
        <div className="flex-1">
          <KPITile
            label="Oldest Pending"
            value={<span>{oldestPendingDays} <span className="text-sm font-semibold text-slate-500">d</span></span>}
            description="Longest waiting claim in your approval queue."
            icon={Clock}
          />
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button 
          onClick={() => { setTab('inbox'); searchParams.set('tab', 'inbox'); setSearchParams(searchParams); }} 
          className={`px-4 py-2 text-xs font-extrabold border-b-2 -mb-px transition-colors font-display ${
            tab === 'inbox' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Pending ({inboxClaims.length})
        </button>
        <button
          onClick={() => { setTab('meetings'); searchParams.set('tab', 'meetings'); setSearchParams(searchParams); }}
          className={`px-4 py-2 text-xs font-extrabold border-b-2 -mb-px transition-colors font-display ${
            tab === 'meetings' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Review Meetings ({pendingMeetingConfirmations.length})
        </button>
        <button
          onClick={() => { setTab('history'); searchParams.set('tab', 'history'); setSearchParams(searchParams); }}
          className={`px-4 py-2 text-xs font-extrabold border-b-2 -mb-px transition-colors font-display ${
            tab === 'history' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Decision History ({decisionHistoryItems.length})
        </button>
        <button 
          onClick={() => { setTab('cadv'); searchParams.set('tab', 'cadv'); setSearchParams(searchParams); }} 
          className={`px-4 py-2 text-xs font-extrabold border-b-2 -mb-px transition-colors font-display ${
            tab === 'cadv' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Advances & Liquidations ({pendingAdvances.length + pendingLiqs.length})
        </button>
      </div>

      {tab === 'cadv' ? (
        <div className="space-y-6">
          {/* Pending Cash Advances */}
          <div className="corp-card flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-2"><div className="w-1 h-3 bg-brand rounded-full"></div>Cash Advance Requests Pending Approval</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingAdvances.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400 italic">No cash advances currently pending your approval.</div>
              ) : (
                pendingAdvances.map(ca => {
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
                          placeholder="Provide decision comment or rejection reason..."
                          value={approvalsComment[ca.id] || ''}
                          onChange={e => setApprovalsComment(p => ({ ...p, [ca.id]: e.target.value }))}
                          className="flex-1 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
                        />
                        <div className="flex gap-1.5 w-full sm:w-auto">
                          <button
                            onClick={() => handleApproveAdvance(ca.id, 'Rejected')}
                            className="flex-1 sm:flex-none bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveAdvance(ca.id, 'Approved')}
                            className="corp-btn-primary"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pending Liquidations */}
          <div className="corp-card flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-2"><div className="w-1 h-3 bg-brand rounded-full"></div>Liquidation Reports Pending Your Review</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingLiqs.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400 italic">No liquidation reports currently pending your review.</div>
              ) : (
                pendingLiqs.map(l => {
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
                            <span>Advance: {formatPHP(ca?.amount || 0)}</span>
                            <span>Spent: {formatPHP(l.totalSpent)}</span>
                            <span className={l.varianceAmount === 0 ? 'text-green-600' : l.varianceAmount < 0 ? 'text-amber-600' : 'text-indigo-600'}>
                              Discrepancy: {l.varianceAmount === 0 ? '₱0.00 (Settled)' : l.varianceAmount < 0 ? `${formatPHP(Math.abs(l.varianceAmount))} Refund Due` : `${formatPHP(l.varianceAmount)} Reimbursement Due`}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const details = await apiFetch(`/api/liquidations/${l.id}`);
                            confirm({
                              title: `Review Line Items - LIQ-${l.id.substring(0,6).toUpperCase()}`,
                              message: (
                                <div className="space-y-4 max-w-2xl text-xs">
                                  <p>Liquidating Cash Advance: <strong>{formatPHP(ca?.amount || 0)}</strong>. Actual Spent Listed below:</p>
                                  <div className="border border-slate-200 rounded overflow-hidden">
                                    <ClaimLineItems expenses={details.lineItems} totalAmount={l.totalSpent} />
                                  </div>
                                </div>
                              ),
                              confirmLabel: 'Close Preview',
                              cancelLabel: ''
                            });
                          }}
                          className="bg-blue-50 hover:bg-blue-100 text-brand px-3 py-1.5 rounded text-xs font-bold border border-blue-200 uppercase tracking-wider"
                        >
                          Review Line Items
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 items-center pt-2">
                        <input
                          type="text"
                          placeholder="Provide decision comment or return reason..."
                          value={approvalsComment[l.id] || ''}
                          onChange={e => setApprovalsComment(p => ({ ...p, [l.id]: e.target.value }))}
                          className="flex-1 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
                        />
                        <div className="flex gap-1.5 w-full sm:w-auto">
                          <button
                            onClick={() => handleReviewLiquidation(l.id, 'Returned')}
                            className="flex-1 sm:flex-none bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider"
                          >
                            Return for Revision
                          </button>
                          <button
                            onClick={() => handleReviewLiquidation(l.id, 'Approved')}
                            className="corp-btn-primary"
                          >
                            Approve & Close
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : tab === 'meetings' ? (
        <div className="corp-card flex flex-col overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-2"><div className="w-1 h-3 bg-brand rounded-full"></div>Review Meetings Awaiting Your Confirmation</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingMeetingConfirmations.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 italic">No Review Meetings currently awaiting your confirmation.</div>
            ) : (
              pendingMeetingConfirmations.map(rm => (
                <div key={rm.id} className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Link
                        to={`/claims/${rm.claim_id}`}
                        className="font-bold text-brand hover:underline text-sm block"
                      >
                        {rm.claim_number || `REIM-${rm.claim_id.substring(0, 6).toUpperCase()}`}
                      </Link>
                      <div className="text-xs text-slate-500 font-semibold mt-0.5">
                        Requestor: <strong className="text-slate-800">{rm.requestor_name}</strong>
                      </div>
                      <div className="text-xs text-slate-600 mt-2">
                        Proposed: <strong>{new Date(rm.meeting_date).toLocaleDateString()}</strong> at <strong>{rm.meeting_time}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Optional reason if declining..."
                      value={meetingComment[rm.id] || ''}
                      onChange={e => setMeetingComment(p => ({ ...p, [rm.id]: e.target.value }))}
                      className="flex-1 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
                    />
                    <div className="flex gap-1.5 w-full sm:w-auto">
                      <button
                        onClick={() => handleDeclineMeeting(rm.id)}
                        disabled={isProcessingMeeting === rm.id}
                        className="flex-1 sm:flex-none bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleConfirmMeeting(rm.id)}
                        disabled={isProcessingMeeting === rm.id}
                        className="corp-btn-primary"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : tab === 'inbox' ? (
        <div className="corp-card flex flex-col overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-2"><div className="w-1 h-3 bg-brand rounded-full"></div>Action Items</h3>
        </div>
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-brand focus:ring-brand"
                      checked={pendingApprovals.length > 0 && selectedForBulk.length === pendingApprovals.length}
                      onChange={selectAllBulk}
                      disabled={pendingApprovals.length === 0}
                    />
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1">Requestor <CaretDown className="w-3 h-3 text-transparent"/></div>
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1">Category <CaretDown className="w-3 h-3 text-transparent"/></div>
                  </th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-end gap-1">Amount <CaretDown className="w-3 h-3 text-transparent"/></div>
                  </th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-center gap-1">Type/Status <CaretDown className="w-3 h-3 text-transparent"/></div>
                  </th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {inboxClaims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2 py-4">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                          <Tray className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-gray-700">Inbox Zero!</p>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">You have no pending approvals or returned claims.</p>
                      </div>
                    </td>
                  </tr>
                ) : inboxClaims.map((claim: any) => {
                  const claimNumber = getClaimNumber(claim);
                  const isReturned = claim.status === ClaimStatus.RETURNED;
                  return (
                    <tr key={claim.id} className={`transition-colors ${selectedForBulk.includes(claim.id) ? 'bg-brand/10' : 'hover:bg-brand/5'} ${isReturned ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {!isReturned && (
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-brand focus:ring-brand"
                            checked={selectedForBulk.includes(claim.id)}
                            onChange={() => toggleBulkSelection(claim.id)}
                          />
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="text-xs font-mono font-bold text-brand cursor-pointer hover:underline" onClick={() => setSelectedClaimId(claim.id)}>
                          {claimNumber}
                        </div>
                        <div className="text-sm font-bold text-gray-950 mt-0.5">{isReturned ? 'You (Self)' : claim.requestor?.name}</div>
                        <div className="text-[10px] text-gray-500">
                          {claim.requestor?.job_title ? `${claim.requestor.job_title} · ${claim.requestor.department}` : claim.requestor?.department}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex flex-col gap-1 items-start">
                          <span>{claim.expense_category || 'Meals'}</span>
                          {claim.sourceLiquidationId && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              Auto-generated from Cash Advance Shortfall
                            </span>
                          )}
                          {claim.flagged_high_value && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <Warning className="w-2 h-2" /> High Value — Review Closely
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-bold text-gray-900">
                        {formatPHP(claim.total_amount)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                         {isReturned ? (
                           <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Needs Revision</span>
                         ) : (
                           <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Approval Required</span>
                         )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => setSelectedClaimId(claim.id)} className="text-brand hover:text-brand-hover">
                          {isReturned ? 'Fix & Resubmit' : 'Review'}
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
            {inboxClaims.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center justify-center space-y-2 py-4">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                    <Tray className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-gray-700">Inbox Zero!</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">You have no pending approvals or returned claims.</p>
                </div>
              </div>
            ) : inboxClaims.map((claim: any) => {
              const claimNumber = getClaimNumber(claim);
              const isReturned = claim.status === ClaimStatus.RETURNED;
              return (
                <div key={claim.id} className={`p-4 hover:bg-slate-50 flex flex-col gap-2.5 transition-colors ${selectedForBulk.includes(claim.id) ? 'bg-brand/5' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {!isReturned && (
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-brand focus:ring-brand"
                          checked={selectedForBulk.includes(claim.id)}
                          onChange={() => toggleBulkSelection(claim.id)}
                        />
                      )}
                      <span className="font-mono font-bold text-brand text-xs cursor-pointer hover:underline" onClick={() => setSelectedClaimId(claim.id)}>
                        {claimNumber}
                      </span>
                    </div>
                    {isReturned ? (
                      <span className="px-2 py-0.5 inline-flex text-[9px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Needs Revision</span>
                    ) : (
                      <span className="px-2 py-0.5 inline-flex text-[9px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Approval Required</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 font-medium mr-1">Requestor:</span>
                      <span className="font-bold text-slate-900">{isReturned ? 'You (Self)' : claim.requestor?.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 font-medium mr-1">Amount:</span>
                      <span className="font-extrabold text-slate-900">{formatPHP(claim.total_amount)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-medium mr-1">Category:</span>
                      <span className="font-semibold text-slate-800">{claim.expense_category || 'Meals'}</span>
                    </div>
                    {claim.flagged_high_value && (
                      <div className="col-span-2 mt-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <Warning className="w-2.5 h-2.5 mr-0.5 inline" /> High Value — Review Closely
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end mt-1">
                    <button onClick={() => setSelectedClaimId(claim.id)} className="text-xs font-bold text-brand hover:text-brand-hover">
                      {isReturned ? 'Fix & Resubmit' : 'Review'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {inboxClaims.length > 0 && (
          <div className="bg-white px-4 py-2 border-t border-gray-200 sm:px-6">
            <p className="text-[10px] text-gray-500">
              Showing all <span className="font-medium text-gray-900">{inboxClaims.length}</span> result{inboxClaims.length === 1 ? '' : 's'}
            </p>
          </div>
        )}
      </div>
      ) : (
        <div className="corp-card flex flex-col overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-2"><div className="w-1 h-3 bg-brand rounded-full"></div>Decision History</h3>
          </div>
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Requestor</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Date</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Amount</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Decision</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Comment</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {decisionHistoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <p className="text-sm text-gray-500">No decisions made yet.</p>
                      </td>
                    </tr>
                  ) : (
                    decisionHistoryItems.map((item, idx) => {
                      const claimNumber = getClaimNumber(item.claim);
                      return (
                        <tr key={`${item.claim.id}-${idx}`} className="hover:bg-brand/5 transition-colors">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-950">{item.claim.requestor?.name}</div>
                            <div className="text-[10px] text-gray-500">{claimNumber}</div>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-bold text-gray-900">
                            {formatPHP(item.claim.total_amount)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-center">
                            <span className={`px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full ${getStatusColor(item.decision)}`}>
                              {item.decision}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-600 italic truncate max-w-[200px]">
                            {item.comment ? `"${item.comment}"` : "-"}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium">
                            <button onClick={() => setSelectedClaimId(item.claim.id)} className="text-brand hover:text-brand-hover">View Claim</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="sm:hidden flex flex-col divide-y divide-slate-100">
              {decisionHistoryItems.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No decisions made yet.</div>
              ) : (
                decisionHistoryItems.map((item, idx) => {
                  const claimNumber = getClaimNumber(item.claim);
                  return (
                    <div key={`${item.claim.id}-${idx}`} className="p-4 hover:bg-slate-50 flex flex-col gap-2 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-brand text-xs">{claimNumber}</span>
                        <span className={`px-2 py-0.5 inline-flex text-[9px] font-bold rounded-full ${getStatusColor(item.decision)}`}>
                          {item.decision}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400 font-medium mr-1">Requestor:</span>
                          <span className="font-bold text-slate-900">{item.claim.requestor?.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 font-medium mr-1">Amount:</span>
                          <span className="font-extrabold text-slate-900">{formatPHP(item.claim.total_amount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium mr-1">Date:</span>
                          <span className="text-slate-700">{new Date(item.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {item.comment && (
                        <div className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded">
                          "{item.comment}"
                        </div>
                      )}
                      <div className="flex justify-end mt-1">
                        <button onClick={() => setSelectedClaimId(item.claim.id)} className="text-xs font-bold text-brand hover:text-brand-hover">
                          View Claim
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spend Insights Widget */}
      {requestorData.length > 0 && (
        <div className="corp-card space-y-4">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-2"><div className="w-1 h-3 bg-brand rounded-full"></div>Approved Spend by Requestor</h3>
              <p className="text-[10px] text-slate-500">Total approved reimbursements from your reports</p>
            </div>
          </div>
          <div className="px-6 pb-6 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={requestorData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#475569" }}
                  tickFormatter={(name: string) => name.split(' ')[0]}
                  interval={0}
                />
                <YAxis type="number" hide />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  formatter={(value: number) => formatPHP(value)}
                  contentStyle={{ fontSize: "11px", borderRadius: "4px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                  {requestorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? "#2563eb" : "#cbd5e1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedClaimId && (
        <ClaimDetail 
          claimId={selectedClaimId} 
          onClose={() => setSelectedClaimId(null)}
          onUpdate={fetchClaims}
        />
      )}

      {/* Bulk Action Bar */}
      {selectedForBulk.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-gray-200 p-4 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 z-40">
          <div className="text-xs sm:text-sm font-bold text-gray-700 text-center sm:text-left">
            {selectedForBulk.length} claim{selectedForBulk.length > 1 ? 's' : ''} selected
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text" 
              placeholder="Optional comment..." 
              value={bulkComment}
              onChange={e => setBulkComment(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-xs w-full sm:w-64 focus:border-brand focus:outline-none"
            />
            <div className="flex gap-2">
              <button 
                onClick={() => handleBulkSubmit('Rejected')}
                className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-1.5 rounded text-xs font-bold"
                disabled={isProcessingBulk}
              >
                Reject All
              </button>
              <button 
                onClick={() => handleBulkSubmit('Approved')}
                className="flex-1 corp-btn-primary text-xs"
                disabled={isProcessingBulk}
              >
                Approve All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
