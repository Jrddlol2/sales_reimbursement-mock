import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { ClaimStatus, UserRole } from '../types';
import {
  FileText, CheckCircle, Question, Warning,
  MapPin, Calendar, Clock, CurrencyDollar, Shield, Check, Info, ArrowRight,
  PencilSimple, Download, ArrowCounterClockwise
} from '@phosphor-icons/react';
import { formatPHP, getClaimNumber } from '../utils';
import { MomEditForm } from '../components/MomEditForm';
import { ClaimMomSummary } from '../components/ClaimMomSummary';
import { ClaimLineItems } from '../components/ClaimLineItems';
import { ClaimApprovalInfo } from '../components/ClaimApprovalInfo';
import { ClaimActivityTimeline } from '../components/ClaimActivityTimeline';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { StatusBadge } from '../components/StatusBadge';
import { WorkflowTimeline } from '../components/WorkflowTimeline';
import { DetailHeader } from '../components/DetailHeader';
import { SummaryCard } from '../components/SummaryCard';
import { Attachments } from '../components/Attachments';
import { Comments, CommentEntry } from '../components/Comments';
import { EmptyState } from '../components/EmptyState';

const WORKFLOW_STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
];

const workflowStepIndex = (status: ClaimStatus) => {
  switch (status) {
    case ClaimStatus.DRAFT: return 0;
    case ClaimStatus.PENDING_APPROVAL: return 1;
    case ClaimStatus.PROCESSING: return 2;
    case ClaimStatus.READY_FOR_CLAIM: return 3;
    case ClaimStatus.COMPLETED: return 4;
    case ClaimStatus.REJECTED: return 1;
    case ClaimStatus.RETURNED: return 1;
    default: return 0;
  }
};

interface ClaimDetailProps {
  claimId?: string;
  onClose?: () => void;
  onUpdate?: () => void;
}

export const ClaimDetail: React.FC<ClaimDetailProps> = ({ claimId: propClaimId, onClose: propOnClose, onUpdate: propOnUpdate }) => {
  const { id: routeClaimId } = useParams<{ id: string }>();
  const claimId = propClaimId || routeClaimId || '';
  const navigate = useNavigate();
  const onClose = propOnClose || (() => navigate(-1));
  const onUpdate = propOnUpdate || (() => {});

  const { user } = useAuth();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showClaimPrompt, setShowClaimPrompt] = useState(false);
  const [claimCodeInput, setClaimCodeInput] = useState("");

  const [comment, setComment] = useState('');
  const [editingMom, setEditingMom] = useState(false);

  // Admin re-assignment state
  const [users, setUsers] = useState<any[]>([]);
  const [newApproverId, setNewApproverId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  const [previewFile, setPreviewFile] = useState<{ type: 'mom' | 'receipt', url: string, name: string } | null>(null);

  const fetchClaimDetails = () => {
    setLoading(true);
    apiFetch(`/api/claims/${claimId}`)
      .then((data) => {
        setClaim(data);
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to load claim details.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClaimDetails();
    // Needed for both the Admin reassignment dropdown and to resolve the
    // approver's display name in the Approval summary for any viewer.
    apiFetch('/api/users').then(setUsers).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, user]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleApproveReject = async (decision: string) => {
    const action = decision === 'Approved' ? 'approve' : decision === 'Rejected' ? 'reject' : 'return';
    if ((action === 'reject' || action === 'return') && !comment) {
      return toast.error('A brief comment is required to return or reject this claim.');
    }
    try {
      await apiFetch(`/api/claims/${claimId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decision, comment })
      });
      toast.success(`Claim has been successfully ${decision.toLowerCase()}!`);
      onUpdate();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update approval decision.');
    }
  };

  const handleReassign = async () => {
    if (!newApproverId || !reassignReason) {
      return toast.error('Please select a new approver and provide a brief justification.');
    }
    try {
      await apiFetch(`/api/claims/${claimId}/reassign`, {
        method: 'PUT',
        body: JSON.stringify({ new_approver_id: newApproverId, reason: reassignReason })
      });
      toast.success('Claim successfully reassigned to the new approver!');
      onUpdate();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reassign');
    }
  };

  const handleClaimPayment = async () => {
    if (!claimCodeInput.trim()) {
      return toast.error('Please enter the Claim Code');
    }
    try {
      await apiFetch(`/api/claims/${claimId}/claim`, { 
        method: 'POST',
        body: JSON.stringify({ code: claimCodeInput })
      });
      toast.success('Claim marked as Completed! Your receipt confirmation has been logged.');
      setShowClaimPrompt(false);
      onUpdate();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to finalize claim');
    }
  };

  const claimNumber = claim ? getClaimNumber(claim) : `REIM-${claimId.substring(0, 6)}`;

  const drawerContent = (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-[2px]" id="claim_detail_side_panel">
      {/* Backdrop */}
      <div className="absolute inset-0 transition-opacity" onClick={onClose} />
      
      {/* Preview Section (Left Side) */}
      {previewFile && (
        <div className="flex-1 hidden lg:flex flex-col relative bg-slate-900/90 border-r border-slate-800">
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="bg-slate-800 rounded-lg shadow-2xl overflow-hidden w-full flex flex-col" style={{ height: '85vh', maxWidth: '850px' }}>
              <div className="bg-slate-950 px-4 py-3 flex justify-between items-center border-b border-slate-800">
                <span className="text-slate-300 font-mono text-xs">{previewFile.name}</span>
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{previewFile.type}</span>
              </div>
              <div className="flex-1 bg-slate-900 flex items-center justify-center p-4 relative">
                {previewFile.url.endsWith('.pdf') ? (
                  <div className="text-slate-500 text-sm flex flex-col items-center">
                    <FileText className="w-12 h-12 mb-3 opacity-50" />
                    PDF Viewer Placeholder
                    <span className="text-xs text-slate-600 mt-2">{previewFile.name}</span>
                  </div>
                ) : (
                  <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain drop-shadow-xl" onError={(e) => {
                    (e.target as any).style.display = 'none';
                    if ((e.target as any).nextElementSibling) {
                      (e.target as any).nextElementSibling.style.display = 'flex';
                    }
                  }} />
                )}
                <div className="hidden flex-col items-center justify-center text-slate-500 w-full h-full absolute inset-0 bg-slate-900">
                  <FileText className="w-12 h-12 mb-3 opacity-50" />
                  <span className="text-sm">Document not found</span>
                  <span className="text-xs text-slate-600 mt-2">{previewFile.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slider / Panel (Right Side) */}
      <div className={`bg-white shadow-2xl h-full flex flex-col relative z-10 shrink-0 transform transition-transform duration-300 translate-x-0 animate-slide-in-right ${previewFile ? 'w-full lg:w-[600px] xl:w-[700px]' : 'w-full md:w-[90%] lg:w-[80%] xl:w-[75%]'}`}>
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
          <DetailHeader
            eyebrow="Reimbursement Request"
            title={claimNumber}
            status={claim && <StatusBadge status={claim.status} />}
            onClose={onClose}
            actions={
              <>
                {claim && claim.receipt_url && (
                  <button
                    onClick={() => setPreviewFile(previewFile?.type === 'receipt' ? null : { type: 'receipt', url: claim.receipt_url, name: claim.receipt_url.split('/').pop() || 'Receipt' })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded shadow-sm transition-colors ${previewFile?.type === 'receipt' ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <FileText className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                    Receipt
                  </button>
                )}
                {claim && claim.mom?.file_url && (
                  <button
                    onClick={() => setPreviewFile(previewFile?.type === 'mom' ? null : { type: 'mom', url: claim.mom.file_url, name: claim.mom.file_name || 'MOM Document' })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded shadow-sm transition-colors ${previewFile?.type === 'mom' ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <FileText className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                    Minutes (MOM)
                  </button>
                )}
              </>
            }
          />
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50">
          {loading ? (
            <EmptyState icon={Clock} title="Loading claim" description="Reading claim database..." />
          ) : !claim ? (
            <EmptyState icon={Warning} title="Not found" description="Reimbursement claim details not found." />
          ) : (
            <>
              {/* STATUS BADGE + WORKFLOW TIMELINE */}
              <WorkflowTimeline
                steps={WORKFLOW_STEPS}
                currentIndex={workflowStepIndex(claim.status)}
                variant={claim.status === ClaimStatus.REJECTED ? 'error' : claim.status === ClaimStatus.RETURNED ? 'warning' : 'default'}
                variantLabel={claim.status === ClaimStatus.REJECTED ? 'REJECTED' : claim.status === ClaimStatus.RETURNED ? 'RETURNED TO REQUESTOR' : undefined}
              />

              {/* SUMMARY */}
              <SummaryCard title="Summary">
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50 p-3.5 border border-slate-200 rounded flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5">
                    <div>
                      <span className="text-slate-400 font-bold mr-1.5 font-display">Claimant:</span>
                      <span className="font-extrabold text-slate-900">{claim.requestor?.name || 'Claimant'}</span>
                      <span className="text-slate-500 font-mono ml-1.5">({claim.requestor?.email || ''})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold mr-1.5 font-display">Department:</span>
                      <span className="font-bold text-slate-800">
                        {claim.requestor?.job_title ? `${claim.requestor.job_title} · ${claim.requestor.department}` : claim.requestor?.department || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5 font-display">Expense Category</span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 inline-block mt-0.5 uppercase tracking-wide font-mono">{claim.expense_category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5 font-display">Business Remarks & Justification</span>
                    <p className="text-slate-700 bg-slate-50 p-3 border border-brand/10 rounded leading-relaxed italic">
                      {claim.remarks || 'No descriptive comments provided.'}
                    </p>
                  </div>
                </div>
              </SummaryCard>

              {/* FINANCIAL INFORMATION */}
              <SummaryCard title="Financial Information">
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5 font-display">Amount in PHP (₱)</span>
                    <span className="font-extrabold text-brand text-sm font-display">{formatPHP(claim.total_amount)}</span>
                  </div>
                  {(claim.release_code || claim.payment_method) && (
                    <div className="pt-3 border-t border-brand/10 bg-blue-50/30 -mx-4 -mb-4 px-4 pb-4 space-y-2">
                      <div className="grid grid-cols-2 gap-3 pt-3">
                        <div>
                          <span className="text-gray-500 font-semibold block">Payment Method</span>
                          <span className="font-bold text-gray-900">{claim.payment_method || 'Cash Release'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-semibold block">Claim Code</span>
                          <span className="font-mono font-bold text-blue-800 tracking-wider text-sm">{claim.release_code || '—'}</span>
                        </div>
                      </div>
                      {claim.status === ClaimStatus.READY_FOR_CLAIM && user?.id === claim.requestor_id && (
                        <div className="pt-3 border-t border-blue-100 space-y-2">
                          <p className="text-[10px] text-gray-600 leading-normal font-medium">
                            The Custodian has marked your funds as ready! Present your unique Claim Code to claim cash. Click below once you have collected the money.
                          </p>
                          {showClaimPrompt ? (
                            <div className="space-y-2 pt-2">
                              <input
                                type="text"
                                placeholder="Enter Claim Code"
                                value={claimCodeInput}
                                onChange={(e) => setClaimCodeInput(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-brand focus:outline-none uppercase"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setShowClaimPrompt(false)}
                                  className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 rounded shadow-sm text-xs transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleClaimPayment}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded shadow-sm text-xs transition-all flex justify-center items-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> Submit
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowClaimPrompt(true)}
                              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded shadow-sm flex items-center justify-center gap-1 transition-all"
                            >
                              <Check className="w-4 h-4" /> Claim Reimbursement
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </SummaryCard>

              {/* ATTACHMENTS */}
              <SummaryCard title="Attachments" bodyClassName="p-0">
                <ClaimLineItems expenses={claim.expenses} totalAmount={claim.total_amount} fallbackReceiptUrl={claim.receipt_url} onPreviewReceipt={(url) => setPreviewFile({ type: 'receipt', url, name: url.split('/').pop() || 'Receipt' })} />
                {claim.supporting_documents && (
                  <Attachments
                    items={[{ id: 'supporting-doc', name: 'Supporting Document', meta: claim.supporting_documents }]}
                  />
                )}
              </SummaryCard>

              {/* LINKED MINUTES OF MEETING (MOM) */}
              {claim.mom && (
                <SummaryCard
                  title="Linked Minutes of Meeting"
                  actions={user?.role === UserRole.APPROVER && claim.status === ClaimStatus.PENDING_APPROVAL && !editingMom && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingMom(true)}
                        className="flex items-center gap-1 text-[10px] font-semibold text-brand hover:text-brand-hover normal-case"
                      >
                        <PencilSimple className="w-3 h-3" /> Edit / Replace
                      </button>
                      {claim.mom.file_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewFile({ type: 'mom', url: claim.mom.file_url, name: claim.mom.file_name || 'MOM Document' })}
                          className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-gray-800 normal-case"
                        >
                          <FileText className="w-3 h-3" /> View Minutes
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toast.info(`Downloading MOM document: ${claim.mom.file_name || `${(claim.mom.client || 'meeting').replace(/\s+/g, '_')}_MOM.pdf`}`)}
                          className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-gray-800 normal-case"
                        >
                          <Download className="w-3 h-3" /> Download
                        </button>
                      )}
                    </div>
                  )}
                >
                  {editingMom ? (
                    <MomEditForm
                      mom={claim.mom}
                      onSaved={(updatedMom) => {
                        setClaim({ ...claim, mom: updatedMom });
                        setEditingMom(false);
                      }}
                      onCancel={() => setEditingMom(false)}
                    />
                  ) : (
                    <ClaimMomSummary mom={claim.mom} />
                  )}
                </SummaryCard>
              )}

              {/* APPROVAL SUMMARY */}
              {(claim.approvals || []).some((a: any) => a.decision === 'Approved') && (
                <SummaryCard title="Approval Information">
                  <ClaimApprovalInfo claim={claim} users={users} />
                </SummaryCard>
              )}

              {/* COMMENTS */}
              <SummaryCard title="Comments">
                <Comments
                  comments={(claim.approvals || []).map((a: any): CommentEntry => ({
                    id: a.id,
                    author: users.find(u => u.id === a.approver_id)?.name || 'Approver',
                    role: 'Approver',
                    body: a.comment,
                    timestamp: a.timestamp,
                    decision: a.decision,
                  }))}
                  emptyText="No approver remarks have been recorded on this claim yet."
                />
              </SummaryCard>

              {/* AUDIT HISTORY */}
              {claim.history && claim.history.length > 0 && (
                <SummaryCard title="Audit History">
                  <ClaimActivityTimeline history={claim.history} />
                </SummaryCard>
              )}

              {/* REQUESTOR: REVISE & RESUBMIT A RETURNED CLAIM */}
              {claim.status === ClaimStatus.RETURNED && user?.id === claim.requestor_id && (
                <div className="border border-amber-300 rounded p-5 space-y-3 bg-amber-50 shadow-sm">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block border-b border-amber-100 pb-1.5">
                    Returned for Revision
                  </span>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Your Approver returned this claim - see their comment above. Update the details and resubmit; it will go back to Pending Approval and your Approver will be notified.
                  </p>
                  <button
                    onClick={() => { onClose(); navigate(`/claims/${claim.id}/resubmit`); }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ArrowCounterClockwise className="w-4 h-4" /> Revise & Resubmit
                  </button>
                </div>
              )}

              {/* ADMIN ACTION REASSIGNMENT */}
              {user?.role === UserRole.ADMIN && [ClaimStatus.PENDING_APPROVAL, ClaimStatus.PROCESSING, ClaimStatus.RETURNED].includes(claim.status) && (
                <div className="border border-purple-500 border-opacity-30 bg-purple-50 bg-opacity-20 rounded p-5 space-y-3 shadow-sm">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block border-b border-purple-100 pb-1">
                    Administrative Reassignment (Segregation Audit Override)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Assigned Approver</label>
                      <select
                        value={newApproverId}
                        onChange={e => setNewApproverId(e.target.value)}
                        className="block w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:border-purple-500"
                      >
                        <option value="">-- Choose Approver --</option>
                        {users.filter(u => u.role === UserRole.APPROVER && u.id !== claim.requestor_id).map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Reason for Change</label>
                      <input
                        type="text"
                        value={reassignReason}
                        onChange={e => setReassignReason(e.target.value)}
                        placeholder="e.g. Leave of absence"
                        className="block w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleReassign}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1.5 rounded transition-colors shadow-sm"
                  >
                    Override Assigned Approver
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky Action Footer */}
        {user?.role === UserRole.APPROVER && claim?.status === ClaimStatus.PENDING_APPROVAL && claim?.current_approver_id === user?.id && claim?.requestor_id !== user?.id && (
           <div className="sticky bottom-0 z-20 bg-white border-t border-slate-200 p-4 md:p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
               <div className="flex flex-col sm:flex-row gap-4 items-end">
                   <div className="flex-1 w-full">
                       <label className="block text-[11px] font-bold text-slate-500 uppercase mb-2">Remarks / Comments (Required for Return or Reject)</label>
                       <textarea 
                           rows={2} 
                           value={comment}
                           onChange={e => setComment(e.target.value)}
                           placeholder="e.g. Approved for processing. / Please re-verify SOW file name. / Rejected due to wrong client."
                           className="corp-input w-full text-xs"
                       />
                   </div>
                   <div className="flex gap-2 w-full sm:w-auto shrink-0">
                       <button onClick={() => handleApproveReject('Returned')} className="corp-btn-secondary border-amber-300 text-amber-700 hover:bg-amber-50">Return</button>
                       <button onClick={() => handleApproveReject('Rejected')} className="corp-btn-danger">Reject</button>
                       <button onClick={() => handleApproveReject('Approved')} className="corp-btn-primary bg-green-600 hover:bg-green-700 shadow-sm flex-1 sm:flex-none"><Check className="w-4 h-4" /> Approve</button>
                   </div>
               </div>
           </div>
        )}
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
};
