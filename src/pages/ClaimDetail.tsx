import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { ClaimStatus, UserRole } from '../types';
import {
  X, FileText, CheckCircle, HelpCircle, AlertTriangle,
  MapPin, Calendar, Clock, DollarSign, Shield, Check, Info, ArrowRight,
  Edit, Download, RotateCcw
} from 'lucide-react';
import { getStatusColor, formatPHP, getClaimNumber } from '../utils';
import { MomEditForm } from '../components/MomEditForm';
import { ClaimMomSummary } from '../components/ClaimMomSummary';
import { ClaimLineItems } from '../components/ClaimLineItems';
import { ClaimApprovalInfo } from '../components/ClaimApprovalInfo';
import { ClaimActivityTimeline } from '../components/ClaimActivityTimeline';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';

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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex bg-gray-900 bg-opacity-30" id="claim_detail_side_panel">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900 bg-opacity-30 transition-opacity" onClick={onClose} />
      
      {/* Preview Section (Left Side) */}
      {previewFile && (
        <div className="flex-1 hidden lg:flex flex-col relative bg-gray-900 border-r border-gray-800">
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden w-full flex flex-col" style={{ height: '85vh', maxWidth: '850px' }}>
              <div className="bg-gray-950 px-4 py-3 flex justify-between items-center border-b border-gray-800">
                <span className="text-gray-300 font-mono text-xs">{previewFile.name}</span>
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">{previewFile.type}</span>
              </div>
              <div className="flex-1 bg-gray-900 flex items-center justify-center p-4 relative">
                {previewFile.url.endsWith('.pdf') ? (
                  <div className="text-gray-500 text-sm flex flex-col items-center">
                    <FileText className="w-12 h-12 mb-3 opacity-50" />
                    PDF Viewer Placeholder
                    <span className="text-xs text-gray-600 mt-2">{previewFile.name}</span>
                  </div>
                ) : (
                  <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain" onError={(e) => {
                    (e.target as any).style.display = 'none';
                    if ((e.target as any).nextElementSibling) {
                      (e.target as any).nextElementSibling.style.display = 'flex';
                    }
                  }} />
                )}
                <div className="hidden flex-col items-center justify-center text-gray-500 w-full h-full absolute inset-0 bg-gray-900">
                  <FileText className="w-12 h-12 mb-3 opacity-50" />
                  <span className="text-sm">Document not found</span>
                  <span className="text-xs text-gray-600 mt-2">{previewFile.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slider / Panel (Right Side) */}
      <div className={`w-full bg-white shadow-2xl h-full flex flex-col relative z-10 shrink-0 transition-all ${previewFile ? 'lg:w-[600px] xl:w-[700px]' : 'max-w-4xl mx-auto lg:my-6 lg:h-[calc(100%-3rem)] lg:rounded-xl overflow-hidden'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 font-mono tracking-wider uppercase">{claimNumber}</h2>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase font-display">Reimbursement Request</span>
          </div>
          <div className="flex items-center gap-2">
            {claim && claim.receipt_url && (
              <button 
                onClick={() => setPreviewFile(previewFile?.type === 'receipt' ? null : { type: 'receipt', url: claim.receipt_url, name: claim.receipt_url.split('/').pop() || 'Receipt' })}
                className={`px-3 py-1.5 text-xs font-semibold rounded shadow-sm transition-colors ${previewFile?.type === 'receipt' ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <FileText className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                Receipt
              </button>
            )}
            {claim && claim.mom?.file_url && (
              <button 
                onClick={() => setPreviewFile(previewFile?.type === 'mom' ? null : { type: 'mom', url: claim.mom.file_url, name: claim.mom.file_name || 'MOM Document' })}
                className={`px-3 py-1.5 text-xs font-semibold rounded shadow-sm transition-colors ${previewFile?.type === 'mom' ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <FileText className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                Minutes (MOM)
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500 italic">Reading claim database...</div>
          ) : !claim ? (
            <div className="text-center py-12 text-red-500 italic">Reimbursement claim details not found.</div>
          ) : (
            <>
              {/* WORKFLOW STATUS STEPPER & REQUESTOR INFO */}
              <div className="space-y-4">
                {/* Horizontal Stepper */}
                <div className="bg-white border border-gray-200 rounded p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-4 block">Workflow Progress</span>
                    {(claim.status === ClaimStatus.REJECTED || claim.status === ClaimStatus.RETURNED) && (
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full mb-4 ${
                        claim.status === ClaimStatus.REJECTED ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {claim.status === ClaimStatus.REJECTED ? 'REJECTED' : 'RETURNED TO REQUESTOR'}
                      </span>
                    )}
                  </div>
                  
                  <div className="relative flex items-center justify-between w-full mt-2 px-2">
                    {/* Connecting Line background */}
                    <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
                    
                    {/* Connecting Line active progress fill */}
                    <div 
                      className="absolute top-3 left-0 h-0.5 bg-brand -translate-y-1/2 z-0 transition-all duration-300"
                      style={{ 
                        width: `${(() => {
                          const statusIndex = (() => {
                            switch (claim.status) {
                              case ClaimStatus.DRAFT: return 0;
                              case ClaimStatus.PENDING_APPROVAL: return 1;
                              case ClaimStatus.PROCESSING: return 2;
                              case ClaimStatus.READY_FOR_CLAIM: return 3;
                              case ClaimStatus.COMPLETED: return 4;
                              case ClaimStatus.REJECTED: return 1;
                              case ClaimStatus.RETURNED: return 1;
                              default: return 0;
                            }
                          })();
                          return (statusIndex / 4) * 100;
                        })()}%` 
                      }}
                    />

                    {[
                      { label: 'Draft', status: ClaimStatus.DRAFT },
                      { label: 'Pending', status: ClaimStatus.PENDING_APPROVAL },
                      { label: 'Processing', status: ClaimStatus.PROCESSING },
                      { label: 'Ready', status: ClaimStatus.READY_FOR_CLAIM },
                      { label: 'Completed', status: ClaimStatus.COMPLETED }
                    ].map((step, idx) => {
                      const currentIdx = (() => {
                        switch (claim.status) {
                          case ClaimStatus.DRAFT: return 0;
                          case ClaimStatus.PENDING_APPROVAL: return 1;
                          case ClaimStatus.PROCESSING: return 2;
                          case ClaimStatus.READY_FOR_CLAIM: return 3;
                          case ClaimStatus.COMPLETED: return 4;
                          case ClaimStatus.REJECTED: return 1;
                          case ClaimStatus.RETURNED: return 1;
                          default: return 0;
                        }
                      })();
                      const isCompleted = idx < currentIdx;
                      const isActive = idx === currentIdx;
                      
                      let circleBg = 'bg-gray-200 text-gray-400 border-gray-200';
                      let labelColor = 'text-gray-400 font-medium';
                      
                      if (isCompleted) {
                        circleBg = 'bg-brand text-white border-brand';
                        labelColor = 'text-gray-900 font-medium';
                      } else if (isActive) {
                        if (claim.status === ClaimStatus.REJECTED) {
                          circleBg = 'bg-red-600 text-white border-red-600 ring-4 ring-red-100';
                          labelColor = 'text-red-600 font-bold';
                        } else if (claim.status === ClaimStatus.RETURNED) {
                          circleBg = 'bg-orange-500 text-white border-orange-500 ring-4 ring-orange-100';
                          labelColor = 'text-orange-600 font-bold';
                        } else {
                          circleBg = 'bg-brand text-white border-brand ring-4 ring-brand/10';
                          labelColor = 'text-brand font-bold';
                        }
                      }

                      return (
                        <div key={step.label} className="flex flex-col items-center relative z-10 w-1/5">
                          {/* Step Circle */}
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] ${circleBg} transition-all duration-300`}>
                            {isCompleted ? (
                              <span className="font-bold text-[9px]">✓</span>
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>
                          
                          {/* Step Label */}
                          <span className={`text-[10px] mt-1.5 whitespace-nowrap text-center ${labelColor}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submitter details box */}
                <div className="bg-slate-50 p-3.5 border border-slate-200 rounded flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs gap-1.5">
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
              </div>

              {/* CLAIM PARTICULARS */}
              <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display">Claim Particulars</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5 font-display">Expense Category</span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 inline-block mt-0.5 uppercase tracking-wide font-mono">{claim.expense_category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5 font-display">Amount in PHP (₱)</span>
                    <span className="font-extrabold text-brand text-sm font-display">{formatPHP(claim.total_amount)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold block mb-0.5 font-display">Business Remarks & Justification</span>
                    <p className="text-slate-700 bg-slate-50 p-3 border border-slate-100 rounded leading-relaxed italic">
                      {claim.remarks || 'No descriptive comments provided.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ATTACHED DOCUMENTS */}
              <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display">Line Items & Documents</h3>
                </div>
                <div className="p-0 border-b border-slate-100">
                  <ClaimLineItems expenses={claim.expenses} totalAmount={claim.total_amount} fallbackReceiptUrl={claim.receipt_url} onPreviewReceipt={(url) => setPreviewFile({ type: 'receipt', url, name: url.split('/').pop() || 'Receipt' })} />
                </div>
                {claim.supporting_documents && (
                  <div className="flex items-center justify-between text-xs p-4 bg-slate-50 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800 block">Supporting Document</span>
                        <span className="text-[10px] text-slate-400">{claim.supporting_documents}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ATTACHED MEETING MINUTES (MOM) */}
              {claim.mom && (
                <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display">Linked Minutes of Meeting</h3>
                    {user?.role === UserRole.APPROVER && claim.status === ClaimStatus.PENDING_APPROVAL && !editingMom && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingMom(true)}
                          className="flex items-center gap-1 text-[10px] font-semibold text-brand hover:text-brand-hover normal-case"
                        >
                          <Edit className="w-3 h-3" /> Edit / Replace
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
                  </div>
                  <div className="p-4 text-xs">
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
                  </div>
                </div>
              )}

              {/* APPROVAL SUMMARY */}
              {(claim.approvals || []).some((a: any) => a.decision === 'Approved') && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-[#F8F9FA] px-4 py-3 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Approval Information</h3>
                  </div>
                  <div className="p-4 text-xs">
                    <ClaimApprovalInfo claim={claim} users={users} />
                  </div>
                </div>
              )}

              {/* DISBURSEMENT DETAILS IF APPLICABLE */}
              {(claim.release_code || claim.payment_method) && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-[#F8F9FA] px-4 py-3 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Disbursement Details</h3>
                  </div>
                  <div className="p-4 bg-blue-50/30 text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-3">
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
                </div>
              )}

              {/* TIMELINE AUDIT HISTORY */}
              {claim.history && claim.history.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-[#F8F9FA] px-4 py-3 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Activity Timeline</h3>
                  </div>
                  <div className="p-4">
                    <ClaimActivityTimeline history={claim.history} />
                  </div>
                </div>
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
                    <RotateCcw className="w-4 h-4" /> Revise & Resubmit
                  </button>
                </div>
              )}

              {/* SUPERVISOR APPROVER ACTION FORM */}
              {user?.role === UserRole.APPROVER && claim.status === ClaimStatus.PENDING_APPROVAL && claim.current_approver_id === user?.id && (
                <div className="bg-brand bg-opacity-5 border border-brand border-opacity-20 rounded p-5 space-y-4 shadow-sm">
                  <span className="text-xs font-bold text-brand uppercase tracking-wider block border-b border-blue-100 pb-1.5">
                    Approver Decisions
                  </span>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Remarks / Comments (Required for Return or Reject)</label>
                    <textarea 
                      rows={2} 
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="e.g. Approved for processing. / Please re-verify SOW file name. / Rejected due to wrong client."
                      className="block w-full border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-brand bg-white text-gray-800"
                    />
                  </div>

                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleApproveReject('Approved')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 rounded transition-colors shadow-sm"
                    >
                      Approve & Route to Custodian
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveReject('Returned')}
                      className="px-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-1.5 rounded transition-colors"
                    >
                      Return
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveReject('Rejected')}
                      className="px-3 bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 rounded transition-colors"
                    >
                      Reject
                    </button>
                  </div>
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

      </div>
    </div>
  );
};
