import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { Mom, MomStatus, User, ClaimStatus } from '../types';
import { 
  FileText, Sparkle, CloudArrowUp, X, PaperPlaneRight, WarningCircle, 
  Question, Calendar, ShieldCheck, ArrowLeft, Bank, Check, Plus, Trash
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { formatPHP } from '../utils';
import { useToast } from '../components/Toast';
import { ExpenseLineItemEditor } from '../components/ExpenseLineItemEditor';
import { MomQuickCreateModal } from '../components/MomQuickCreateModal';

interface LineItem {
  id: string;
  category: string;
  amount: string;
  receiptName: string;
  isDragOver?: boolean;
  or_number?: string;
}

const REIMBURSEMENT_CATEGORIES = [
  { value: 'Client Meals', label: 'Client Meals' },
  { value: 'Travel', label: 'Travel / Flights' },
  { value: 'Transportation', label: 'Transportation / Taxi' },
  { value: 'Accommodation', label: 'Accommodation' }
];

export const SubmitClaim: React.FC = () => {
  const navigate = useNavigate();
  const { id: resubmitClaimId } = useParams();
  const isResubmit = !!resubmitClaimId;
  const { user } = useAuth();
  const toast = useToast();

  // Data State
  const [moms, setMoms] = useState<Mom[]>([]);
  const [superior, setSuperior] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingMoms, setFetchingMoms] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Form State
  const [selectedMomId, setSelectedMomId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [supportingDocs, setSupportingDocs] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [approverSlots, setApproverSlots] = useState<{ meeting_date: string; meeting_time: string }[]>([]);

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: Math.random().toString(), category: '', amount: '', receiptName: '', or_number: '' }
  ]);

  const [showMomCreateModal, setShowMomCreateModal] = useState(false);
  const [pastClaims, setPastClaims] = useState<any[]>([]);
  const [requestType, setRequestType] = useState<'reimbursement' | 'cash_advance'>('reimbursement');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advancePurpose, setAdvancePurpose] = useState('');
  const [advanceMomId, setAdvanceMomId] = useState('');
  const [cashAdvances, setCashAdvances] = useState<any[]>([]);
  const [submittingAdvance, setSubmittingAdvance] = useState(false);

  const totalClaimAmount = lineItems.reduce((sum, item) => {
    const parsed = parseFloat(item.amount);
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);

  const hasMeetingConflict = !!meetingDate && !!meetingTime && approverSlots.some(
    slot => slot.meeting_date === meetingDate && slot.meeting_time === meetingTime
  );

  useEffect(() => {
    // Fetch completed MOMs
    apiFetch('/api/moms')
      .then((data: Mom[]) => {
        const completed = data.filter(m => m.status === MomStatus.COMPLETED && (!m.claim_id || m.claim_id === resubmitClaimId));
        setMoms(completed);
      })
      .catch(console.error)
      .finally(() => setFetchingMoms(false));

    // Fetch past claims for duplicate detection
    apiFetch('/api/claims')
      .then(data => setPastClaims(data))
      .catch(console.error);

    // Fetch cash advances
    apiFetch('/api/cash-advances')
      .then(data => setCashAdvances(data))
      .catch(console.error);

    // Fetch the Approver's existing Review Meeting slots for client-side conflict warnings
    if (!isResubmit) {
      apiFetch('/api/approver/review-meetings')
        .then(data => setApproverSlots(data))
        .catch(console.error);
    }

    // Fetch supervisor
    if (user?.reports_to) {
      apiFetch('/api/users')
        .then((users: User[]) => {
          const sup = users.find(u => u.id === user.reports_to);
          if (sup) setSuperior(sup);
        })
        .catch(console.error);
    }
  }, [user, resubmitClaimId]);

  useEffect(() => {
    if (!resubmitClaimId) return;
    apiFetch(`/api/claims/${resubmitClaimId}`)
      .then((claim: any) => {
        if (claim.requestor_id !== user?.id || claim.status !== ClaimStatus.RETURNED) {
          setLoadError('This claim is not yours to revise, or is no longer in Returned status.');
          return;
        }
        setSelectedMomId(claim.mom_id || '');
        setRemarks(claim.remarks || '');
        setSupportingDocs(claim.supporting_documents || '');
        
        if (claim.expenses && claim.expenses.length > 0) {
          setLineItems(claim.expenses.map((e: any) => ({
            id: Math.random().toString(),
            category: e.category || '',
            amount: e.amount != null ? String(e.amount) : '',
            receiptName: e.receipt_url ? e.receipt_url.split('/').pop() : '',
            or_number: e.or_number || ''
          })));
        } else {
          setLineItems([{
            id: Math.random().toString(),
            category: claim.expense_category || '',
            amount: claim.total_amount != null ? String(claim.total_amount) : '',
            receiptName: claim.receipt_url ? claim.receipt_url.split('/').pop() : '',
            or_number: claim.or_number || ''
          }]);
        }
      })
      .catch(() => setLoadError('Failed to load the claim to revise.'));
  }, [resubmitClaimId, user]);

  const handleSimulateDuplicate = () => {
    if (moms.length === 0) {
      toast.error('You must have at least one Completed MOM to use this demo.');
      return;
    }
    setSelectedMomId(moms[0].id);
    setLineItems([
      { id: Math.random().toString(), category: 'Client Meals', amount: '1500.00', receiptName: 'Sample_Receipt.pdf' }
    ]);
  };

  const handleQuickFill = () => {
    if (moms.length === 0) {
      toast.error('You must have at least one Completed MOM to use Quick-Fill. Go to the MOM Manager to complete a meeting document first!');
      return;
    }
    setSelectedMomId(moms[0].id);
    setLineItems([
      { id: Math.random().toString(), category: 'Client Meals', amount: '3450.50', receiptName: 'Peninsula_Lunch_Receipt.pdf' },
      { id: Math.random().toString(), category: 'Transportation', amount: '650.00', receiptName: 'Grab_Receipt.pdf' }
    ]);
    setRemarks('Sales meeting lunch with client decision makers. Discussed next steps for contract renewal.');
    setSupportingDocs('SOW_Draft_v1.pdf');
  };

  const handleMomCreated = (mom: Mom) => {
    setMoms(prev => [...prev, mom]);
    setSelectedMomId(mom.id);
    setShowMomCreateModal(false);
  };

  const handleFileDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setLineItems(items => items.map(item => item.id === id ? { ...item, isDragOver: false } : item));
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setLineItems(items => items.map(item => item.id === id ? { ...item, receiptName: e.dataTransfer.files[0].name } : item));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.files && e.target.files.length > 0) {
      const name = e.target.files[0].name;
      setLineItems(items => items.map(item => item.id === id ? { ...item, receiptName: name } : item));
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Math.random().toString(), category: '', amount: '', receiptName: '', or_number: '' }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(items => items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMomId) {
      return toast.error('A Completed Minutes of Meeting must be attached to file a reimbursement claim.');
    }
    
    for (const item of lineItems) {
      if (!item.category) return toast.error('Please select an expense category for all items.');
      const parsedAmount = parseFloat(item.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) return toast.error('Please enter a valid numeric amount for all items.');
      if (!item.receiptName) return toast.error('Official receipt image or document upload is required for all expense items.');
    }

    if (!isResubmit) {
      if (!meetingDate || !meetingTime) {
        return toast.error('Please schedule a Review Meeting date and time with your Approver.');
      }
      if (hasMeetingConflict) {
        return toast.error('Your Approver already has a Review Meeting scheduled at that date and time. Please choose another slot.');
      }
    }

    setLoading(true);
    try {
      const payloadLineItems = lineItems.map(item => ({
        category: item.category,
        amount: parseFloat(item.amount),
        receipt_url: `/uploads/${item.receiptName}`,
        or_number: item.or_number || undefined
      }));

      const body = JSON.stringify({
        mom_id: selectedMomId,
        remarks,
        supporting_documents: supportingDocs || undefined,
        line_items: payloadLineItems,
        ...(isResubmit ? {} : { meeting_date: meetingDate, meeting_time: meetingTime })
      });

      if (isResubmit) {
        await apiFetch(`/api/claims/${resubmitClaimId}/resubmit`, { method: 'PUT', body });
        toast.success('Claim revised and resubmitted! It has been routed back to your supervisor for review.');
      } else {
        await apiFetch('/api/claims', { method: 'POST', body });
        toast.success('Claim submitted successfully! The claim has been auto-routed to your supervisor for review.');
      }
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(advanceAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return toast.error('Amount must be a valid number greater than zero.');
    }
    if (!advancePurpose.trim()) {
      return toast.error('Purpose is required.');
    }
    if (!user?.reports_to) {
      return toast.error('An approver must be configured for your account.');
    }

    setSubmittingAdvance(true);
    try {
      await apiFetch('/api/cash-advances', {
        method: 'POST',
        body: JSON.stringify({
          amount: amountNum,
          purpose: advancePurpose,
          momId: advanceMomId || undefined,
          approverId: user.reports_to
        })
      });
      toast.success('Cash Advance requested successfully! Saved in Draft status.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit Cash Advance request.');
    } finally {
      setSubmittingAdvance(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6" id="submit_claim_view">
      {/* Back button and title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-2 font-display uppercase tracking-wider">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 font-display">
            {isResubmit ? 'Revise & Resubmit Claim' : requestType === 'cash_advance' ? 'Request Cash Advance' : 'Submit Reimbursement Claim'}
          </h1>
          <p className="text-xs text-slate-500">
            {isResubmit
              ? 'This claim was returned for revision. Update the details below and resubmit it for your supervisor\'s review.'
              : requestType === 'cash_advance'
                ? 'Request an advance in Philippine Pesos (₱) for upcoming sales activity, optionally linked to a completed Minutes of Meeting.'
                : 'Submit expense details in Philippine Pesos (₱) by attaching a completed Minutes of Meeting.'}
          </p>
        </div>
        {!isResubmit && moms.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickFill}
              className="inline-flex items-center justify-center text-xs font-bold text-brand bg-blue-50 border border-blue-200 hover:bg-blue-100 px-4 py-2 rounded shadow-sm gap-1.5 uppercase tracking-wider font-display"
            >
              <Sparkle className="w-4 h-4" /> Quick-fill Sample Data
            </button>
            {pastClaims.length > 0 && (
              <button
                type="button"
                onClick={handleSimulateDuplicate}
                className="inline-flex items-center justify-center text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-4 py-2 rounded shadow-sm gap-1.5 uppercase tracking-wider font-display"
              >
                <WarningCircle className="w-4 h-4" /> Simulate Duplicate
              </button>
            )}
          </div>
        )}
      </div>

      {!user?.reports_to && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700 flex items-start gap-2">
          <WarningCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-1">No Approver Configured</span>
            You are at the top of the reporting chain. You cannot submit a claim because there is no configured supervisor to route this to for approval.
          </div>
        </div>
      )}

      {/* Request Type Selector (only on new submission) */}
      {!isResubmit && (
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="space-y-0.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-display">Request Category Type</span>
            <span className="text-slate-500 text-xs font-medium">Select whether you are filing a direct expense reimbursement or requesting an advance.</span>
          </div>
          <div className="flex bg-slate-100 p-1 rounded border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setRequestType('reimbursement')}
              className={`px-4 py-1.5 rounded text-xs font-bold transition-all uppercase tracking-wider font-display ${
                requestType === 'reimbursement'
                  ? 'bg-white text-slate-950 shadow-sm shadow-brand/5'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Reimbursement
            </button>
            <button
              type="button"
              onClick={() => setRequestType('cash_advance')}
              className={`px-4 py-1.5 rounded text-xs font-bold transition-all uppercase tracking-wider font-display ${
                requestType === 'cash_advance'
                  ? 'bg-white text-slate-950 shadow-sm shadow-brand/5'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Cash Advance
            </button>
          </div>
        </div>
      )}

      {requestType === 'cash_advance' ? (
        <form onSubmit={handleSubmitAdvance} className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded border border-slate-200 p-6 shadow-sm space-y-6">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 font-display">Cash Advance request details</h2>

              {(() => {
                const userAdvances = cashAdvances.filter(ca => ca.requestorId === user?.id);
                const activeAdv = userAdvances.find(ca => ca.status !== 'Liquidated' && ca.status !== 'Rejected');
                const isOverdue = activeAdv && activeAdv.status === 'Released' && activeAdv.releaseDate && (() => {
                  const releasedAt = new Date(activeAdv.releaseDate).getTime();
                  const deadlineMs = 7 * 24 * 60 * 60 * 1000;
                  return Date.now() > (releasedAt + deadlineMs);
                })();

                if (!activeAdv) return null;

                return (
                  <div className="bg-amber-50 border border-amber-200 rounded p-4 flex gap-2.5 items-start">
                    <WarningCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 leading-normal font-semibold">
                      <span className="block font-bold uppercase tracking-wider text-[10px] text-amber-900 mb-0.5">Active Cash Advance Notice</span>
                      You already have an active Cash Advance that has not been liquidated (CADV-{activeAdv.id.substring(0,6).toUpperCase()}).
                      {isOverdue && (
                        <span className="block mt-1 text-red-600 font-bold">
                          Your liquidation is overdue — please complete it before requesting another Cash Advance.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Requested Amount (PHP ₱) *
                  </label>
                  <div className="relative rounded shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 text-sm">₱</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      disabled={cashAdvances.some(ca => ca.requestorId === user?.id && ca.status !== 'Liquidated' && ca.status !== 'Rejected')}
                      placeholder="0.00"
                      value={advanceAmount}
                      onChange={e => setAdvanceAmount(e.target.value)}
                      className="block w-full border border-gray-300 rounded pl-7 pr-3 py-2 text-sm focus:border-brand focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Link completed Meeting
                  </label>
                  <select
                    value={advanceMomId}
                    disabled={cashAdvances.some(ca => ca.requestorId === user?.id && ca.status !== 'Liquidated' && ca.status !== 'Rejected')}
                    onChange={e => setAdvanceMomId(e.target.value)}
                    className="block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">-- No linked meeting (Optional) --</option>
                    {moms.map(mom => (
                      <option key={mom.id} value={mom.id}>
                        {mom.client} - {mom.purpose} ({mom.meeting_date})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Business Purpose *
                </label>
                <textarea
                  required
                  rows={3}
                  disabled={cashAdvances.some(ca => ca.requestorId === user?.id && ca.status !== 'Liquidated' && ca.status !== 'Rejected')}
                  placeholder="Detail the sales activity, travel plans, client target, or specific commercial scope..."
                  value={advancePurpose}
                  onChange={e => setAdvancePurpose(e.target.value)}
                  className="block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Form Fields Right Side */}
          <div className="space-y-6">
            <div className="bg-white rounded border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 font-display">Approval Routing</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase text-[10px] tracking-wider mb-0.5">Assigned Approver</span>
                  <span className="text-slate-800 font-bold text-sm block">
                    {superior ? superior.name : 'No supervisor configured'}
                  </span>
                  {superior && (
                    <span className="text-slate-500 font-medium block mt-0.5">
                      {superior.job_title ? `${superior.job_title} · ${superior.department}` : superior.department}
                    </span>
                  )}
                </div>
                <div className="bg-slate-50 rounded border border-slate-200 p-3 text-slate-500 font-medium leading-relaxed">
                  Upon submission, your Cash Advance request will be routed directly to your supervisor for review and approval.
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                to="/"
                className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs px-4 py-2.5 rounded font-bold uppercase tracking-wider font-display text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submittingAdvance || cashAdvances.some(ca => ca.requestorId === user?.id && ca.status !== 'Liquidated' && ca.status !== 'Rejected')}
                className="corp-btn-primary"
              >
                {submittingAdvance ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <>
          {loadError ? (
            <div className="bg-red-50 border border-red-200 rounded p-6 text-center text-sm text-red-700 max-w-2xl mx-auto">
              {loadError}
            </div>
          ) : fetchingMoms ? (
            <div className="text-center py-12 text-gray-500 italic">Verifying compliant Minutes of Meeting records...</div>
          ) : moms.length === 0 ? (
            /* Zero State Warning: must create MOM first */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-200 rounded p-8 text-center space-y-4 max-w-2xl mx-auto"
            >
              <WarningCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-base font-bold text-gray-900">Minutes of Meeting Required</h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                  Under enterprise compliance policy, an approved <strong>Minutes of Meeting</strong> must be finalized and sent to the client before any sales expense reimbursement can be submitted.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowMomCreateModal(true)}
                  className="corp-btn-primary"
                >
                  <Plus className="w-4 h-4" /> Create New MOM
                </button>
                <Link
                  to="/moms"
                  className="inline-flex items-center justify-center text-xs font-bold text-slate-600 hover:text-slate-800 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded uppercase tracking-wider font-display"
                >
                  Go to MOM Manager
                </Link>
              </div>
            </motion.div>
          ) : (
            /* Form view */
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Fields Left Side */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded border border-slate-200 p-6 shadow-sm space-y-6">
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 font-display">Reimbursement details</h2>

                  {/* MOM Picker */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      1. Link Completed Meeting *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        required
                        value={selectedMomId}
                        onChange={e => setSelectedMomId(e.target.value)}
                        className="block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-brand focus:ring-brand focus:outline-none"
                      >
                        <option value="">-- Select Completed MOM --</option>
                        {moms.map(mom => (
                          <option key={mom.id} value={mom.id}>
                            {mom.client} - {mom.purpose} ({mom.meeting_date})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowMomCreateModal(true)}
                        className="inline-flex items-center justify-center gap-1 text-xs font-bold text-brand bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-2 rounded whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-4 h-4" /> Create New MOM
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Only Completed MOMs verified and dispatched to clients are listed here.
                    </p>
                  </div>

                  {/* Line Items */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h3 className="text-sm font-semibold text-gray-800">2. Expense Line Items</h3>
                      <button
                        type="button"
                        onClick={addLineItem}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover"
                      >
                        <Plus className="w-4 h-4" /> Add Expense
                      </button>
                    </div>
                    
                    {lineItems.map((item, index) => {
                      const isDuplicate = item.amount && item.category && pastClaims.some(c => c.id !== resubmitClaimId && c.expenses && c.expenses.some((e: any) => e.category === item.category && e.amount === parseFloat(item.amount)));
                      return (
                        <ExpenseLineItemEditor
                          key={item.id}
                          item={item}
                          index={index}
                          mode="standard"
                          categories={REIMBURSEMENT_CATEGORIES}
                          showRemove={lineItems.length > 1}
                          isDuplicate={!!isDuplicate}
                          onRemove={() => removeLineItem(item.id)}
                          onChange={(field, value) => updateLineItem(item.id, field as any, value)}
                        />
                      );
                    })}
                  </div>

                  {/* Schedule Review Meeting */}
                  {!isResubmit && (
                    <div className="border border-slate-200 rounded p-4 bg-slate-50/50 space-y-3">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        3. Schedule Review Meeting *
                      </label>
                      <p className="text-[10px] text-gray-500 -mt-2">
                        Pick a date/time for your Approver{superior ? ` (${superior.name})` : ''} to review this claim with you. This is your internal review call, separate from the client meeting documented in the MOM above.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Meeting Date
                          </label>
                          <input
                            type="date"
                            required
                            value={meetingDate}
                            onChange={e => setMeetingDate(e.target.value)}
                            className="block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-brand focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Meeting Time
                          </label>
                          <input
                            type="time"
                            required
                            value={meetingTime}
                            onChange={e => setMeetingTime(e.target.value)}
                            className="block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-brand focus:outline-none"
                          />
                        </div>
                      </div>
                      {hasMeetingConflict && (
                        <div className="flex items-start gap-1.5 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">
                          <WarningCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          Your Approver already has a Review Meeting scheduled at that date and time. Please choose another slot.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remarks */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      4. Remarks / Business Purpose
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Detail the sales objective, specific activities, and context of this reimbursement claim..."
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      className="block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    />
                  </div>

                  {/* Supporting docs (optional) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      5. Supporting Documents / Attachments (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SalesProposal_Draft.pdf, Client_Contract_v2.docx"
                      value={supportingDocs}
                      onChange={e => setSupportingDocs(e.target.value)}
                      className="block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Specify any additional file attachments that might justify or clarify this reimbursement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Guidelines Right Side */}
              <div className="space-y-6">
                <div className="bg-white rounded border border-gray-200 p-5 shadow-sm space-y-4 text-xs text-gray-600">
                  <h3 className="font-bold text-gray-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-brand">
                    <ShieldCheck className="w-4 h-4" /> Policy Guidelines
                  </h3>
                  
                  <div className="space-y-3">
                    <p>
                      This system enforces the <strong>Segregation of Duties</strong> regulatory framework:
                    </p>
                    <ul className="list-disc pl-4 space-y-1.5">
                      <li>You cannot approve your own claim.</li>
                      <li>Attached MOM must be completed and previously dispatched to the client.</li>
                      <li>Official receipts must be uploaded for every transaction.</li>
                      <li>Monetary amount must represent real Philippine Pesos (₱).</li>
                    </ul>
                  </div>

                  {superior && (
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded space-y-1 text-gray-800">
                      <span className="font-bold block text-[10px] text-blue-800 uppercase tracking-wider">Assigned Approver</span>
                      <span className="font-semibold text-sm text-gray-900 block">{superior.name}</span>
                      <span className="text-[10px] text-gray-500 block">
                        {superior.job_title ? `${superior.job_title} · ${superior.email}` : superior.email}
                      </span>
                      <p className="text-[10px] text-gray-600 mt-1 leading-normal">
                        This claim will be automatically routed to your supervisor for review. An email notification will be dispatched.
                      </p>
                    </div>
                  )}
                </div>

                {/* Submission Actions */}
                <div className="bg-gray-50 rounded border border-gray-200 p-5 shadow-sm space-y-3">
                  <div className="text-xs text-gray-600">
                    Total Claim Amount:
                    <span className="block font-bold text-gray-900 text-lg mt-1">
                      {totalClaimAmount > 0 ? formatPHP(totalClaimAmount) : '₱0.00'}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !user?.reports_to || (!isResubmit && hasMeetingConflict)}
                    className="corp-btn-primary"
                  >
                    <PaperPlaneRight className="w-4 h-4" /> {loading ? 'Submitting...' : (isResubmit ? 'Resubmit Claim' : 'Submit Claim')}
                  </button>
                </div>
              </div>
            </form>
          )}
        </>
      )}

      {showMomCreateModal && (
        <MomQuickCreateModal
          onClose={() => setShowMomCreateModal(false)}
          onCreated={handleMomCreated}
        />
      )}
    </div>
  );
};
