import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { ClaimStatus, UserRole } from '../types';
import { X } from 'lucide-react';

interface ClaimDetailProps {
  claimId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export const ClaimDetail: React.FC<ClaimDetailProps> = ({ claimId, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');

  // Admin reassignment state
  const [users, setUsers] = useState<any[]>([]);
  const [newApproverId, setNewApproverId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/claims/${claimId}`)
      .then(setClaim)
      .finally(() => setLoading(false));
      
    if (user?.role === UserRole.ADMIN) {
      apiFetch('/api/users').then(setUsers);
    }
  }, [claimId, user]);

  const handleApproveReject = async (decision: string) => {
    if ((decision === 'Rejected' || decision === 'Returned') && !comment) {
      return alert('Comment is required for rejection/return.');
    }
    try {
      await apiFetch(`/api/claims/${claimId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decision, comment })
      });
      onUpdate();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to process');
    }
  };

  const handleReassign = async () => {
    if (!newApproverId || !reassignReason) return alert('Please select a new approver and provide a reason.');
    try {
      await apiFetch(`/api/claims/${claimId}/reassign`, {
        method: 'PUT',
        body: JSON.stringify({ new_approver_id: newApproverId, reason: reassignReason })
      });
      onUpdate();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to reassign');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-20 transition-opacity" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col relative z-10 border-l border-gray-200 transform transition-transform duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#F4F6F8]">
          <h2 className="text-lg font-semibold text-gray-900">Claim Details <span className="text-gray-500 font-normal text-sm ml-2">#{claimId.substring(0,8)}</span></h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
             <div className="text-sm text-gray-500">Loading claim...</div>
          ) : !claim ? (
             <div className="text-sm text-red-500">Claim not found</div>
          ) : (
            <>
              {/* STATUS & REQUESTOR */}
              <div className="flex justify-between items-start">
                 <div>
                   <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Status</div>
                   <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full border ${
                      claim.status === ClaimStatus.PENDING_APPROVAL ? 'bg-[#0095D5] bg-opacity-10 text-[#0095D5] border-[#0095D5] border-opacity-20' :
                      (claim.status === ClaimStatus.APPROVED || claim.status === ClaimStatus.PROCESSED) ? 'bg-green-100 text-green-800 border-green-200' :
                      claim.status === ClaimStatus.REJECTED ? 'bg-red-100 text-red-800 border-red-200' :
                      claim.status === ClaimStatus.RETURNED ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      'bg-gray-100 text-gray-800 border-gray-200'
                   }`}>
                     {claim.status}
                   </span>
                 </div>
                 <div className="text-right">
                   <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Requestor</div>
                   <div className="text-sm font-medium text-gray-900">{claim.requestor?.name}</div>
                   <div className="text-xs text-gray-500">{claim.requestor?.department} Dept</div>
                 </div>
              </div>

              {/* Client Meeting Details */}
              {claim.client_meeting_details && (
                <div className="border border-gray-200 rounded text-sm overflow-hidden mb-6">
                  <div className="bg-[#F4F6F8] px-4 py-2 border-b border-gray-200 font-medium text-gray-700 text-xs uppercase tracking-wider">Client Meeting Details</div>
                  <div className="p-4 grid grid-cols-2 gap-4 bg-white">
                    <div><span className="text-gray-500 block text-xs mb-1">Company</span>{claim.client_meeting_details.company_name}</div>
                    <div><span className="text-gray-500 block text-xs mb-1">Account Type</span>{claim.client_meeting_details.type_of_account}</div>
                    <div className="col-span-2"><span className="text-gray-500 block text-xs mb-1">Purpose</span>{claim.client_meeting_details.purpose_of_meeting}</div>
                    <div><span className="text-gray-500 block text-xs mb-1">Category</span>{claim.client_meeting_details.category}</div>
                    <div><span className="text-gray-500 block text-xs mb-1">Location</span>{claim.client_meeting_details.location}</div>
                    <div><span className="text-gray-500 block text-xs mb-1">Contact</span>{claim.client_meeting_details.contact_person} ({claim.client_meeting_details.contact_person_designation})</div>
                    <div><span className="text-gray-500 block text-xs mb-1">Contact Email</span>{claim.client_meeting_details.contact_person_email}</div>
                    {claim.client_meeting_details.description && <div className="col-span-2"><span className="text-gray-500 block text-xs mb-1">Description</span>{claim.client_meeting_details.description}</div>}
                  </div>
                </div>
              )}

              {/* MOM Details */}
              {claim.mom ? (
                <div className="border border-gray-200 rounded text-sm overflow-hidden relative group">
                  <div className="bg-[#F4F6F8] px-4 py-2 border-b border-gray-200 font-medium text-gray-700 text-xs uppercase tracking-wider flex justify-between items-center">
                    Review Meeting (MOM)
                    {user?.role === UserRole.REQUESTOR && claim.status === ClaimStatus.MEETING_SCHEDULED && (
                      <button onClick={() => {
                        const newDate = prompt('Enter new date and time (e.g., 2026-07-20 10:00 AM):', claim.mom?.meeting_date);
                        if (newDate) {
                          apiFetch(`/api/claims/${claim.id}/reschedule`, { method: 'PUT', body: JSON.stringify({ meeting_date: newDate }) })
                            .then(() => { onUpdate(); })
                            .catch(e => alert(e.message || 'Failed to reschedule'));
                        }
                      }} className="text-[#0095D5] hover:underline normal-case font-normal text-xs">
                        Reschedule
                      </button>
                    )}
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4 bg-white">
                    <div><span className="text-gray-500 block text-xs mb-1">Status</span>
                      <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full border ${claim.mom.status === 'Uploaded' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>{claim.mom.status}</span>
                    </div>
                    <div><span className="text-gray-500 block text-xs mb-1">Date</span>{claim.mom.meeting_date}</div>
                    <div className="col-span-2"><span className="text-gray-500 block text-xs mb-1">Attendees</span>{claim.mom.attendees}</div>
                    {claim.mom.summary && <div className="col-span-2"><span className="text-gray-500 block text-xs mb-1">Summary</span><div className="mt-1 bg-gray-50 p-2 border border-gray-100 rounded text-gray-700">{claim.mom.summary}</div></div>}
                    {claim.mom.file_url && <div className="col-span-2"><span className="text-gray-500 block text-xs mb-1">Attachment</span><a href={claim.mom.file_url} className="text-[#0095D5] hover:underline" target="_blank" rel="noreferrer">View File</a></div>}
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded text-sm overflow-hidden bg-gray-50 p-4 text-center text-gray-500">
                  No review meeting scheduled yet.
                </div>
              )}

              {/* Action Areas based on role */}
              {user?.role === UserRole.REQUESTOR && claim.status === ClaimStatus.MEETING_SCHEDULED && (
                <div className="border border-[#0095D5] rounded text-sm bg-blue-50/10 mt-6 shadow-sm">
                  <div className="bg-[#0095D5] bg-opacity-10 px-4 py-2 border-b border-[#0095D5] border-opacity-20 font-semibold text-[#0095D5] text-xs uppercase tracking-wider">Next Step: Upload MOM</div>
                  <div className="p-4 space-y-4">
                    <div className="text-gray-700 text-sm">After the meeting, provide a summary or upload the Minutes of Meeting (MOM) file.</div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Summary (Optional if uploading file)</label>
                      <textarea rows={3} className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5] shadow-sm"
                        id="momSummary" placeholder="Meeting outcomes..." />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-gray-700 mb-1">Upload MOM File (Optional)</label>
                       <input type="file" id="momFile" className="block w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-50 file:text-[#0095D5] hover:file:bg-gray-100 transition-colors" />
                    </div>
                    <button onClick={async () => {
                       const summary = (document.getElementById('momSummary') as HTMLTextAreaElement).value;
                       const fileInput = document.getElementById('momFile') as HTMLInputElement;
                       let file_url = '';
                       if (fileInput.files && fileInput.files.length > 0) file_url = `https://fake-s3-bucket.com/${fileInput.files[0].name}`;
                       if (!summary && !file_url) return alert('Provide either a summary or a file.');
                       try {
                         await apiFetch(`/api/claims/${claim.id}/mom`, { method: 'POST', body: JSON.stringify({ summary, file_url }) });
                         onUpdate();
                         onClose();
                       } catch (e: any) { alert(e.message || 'Failed to upload MOM'); }
                    }} className="bg-[#0095D5] text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-[#007BAF] transition-colors shadow-sm">
                      Submit MOM & Request Approval
                    </button>
                  </div>
                </div>
              )}

              {/* Expenses Table */}
              <div className="border border-gray-200 rounded text-sm overflow-hidden">
                <div className="bg-[#F4F6F8] px-4 py-2 border-b border-gray-200 font-medium text-gray-700 text-xs uppercase tracking-wider">Line Items</div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Vendor / Purpose</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Receipt</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {claim.expenses.map((exp: any) => (
                      <tr key={exp.id}>
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900">{exp.vendor}</div>
                          <div className="text-xs text-gray-500">{exp.expense_date} • {exp.business_purpose}</div>
                        </td>
                        <td className="px-4 py-2 text-gray-600 text-xs">{exp.category}</td>
                        <td className="px-4 py-2 text-xs">
                          {exp.receipt_url ? (
                            <a href={exp.receipt_url} target="_blank" rel="noreferrer" className="text-[#0095D5] hover:underline">View Receipt</a>
                          ) : (
                            <span className="text-gray-400 italic">None</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">${exp.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={3} className="px-4 py-3 font-semibold text-gray-900 text-right text-xs uppercase tracking-wider">Total</td>
                      <td className="px-4 py-3 font-bold text-[#0095D5] text-right">${claim.total_amount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Payment Details if present */}
              {claim.payment_reference && (
                <div className="border border-gray-200 rounded text-sm overflow-hidden">
                  <div className="bg-[#F4F6F8] px-4 py-2 border-b border-gray-200 font-medium text-gray-700 text-xs uppercase tracking-wider">Payment Details</div>
                  <div className="p-4 bg-white">
                    <span className="text-gray-500 block text-xs mb-1">Reference Number</span>
                    <span className="font-mono text-gray-900 font-medium">{claim.payment_reference}</span>
                  </div>
                </div>
              )}

              {/* Action Areas based on role */}
              {user?.role === UserRole.APPROVER && claim.status === ClaimStatus.PENDING_APPROVAL && claim.current_approver_id === user?.id && (
                <div className="border border-[#0095D5] rounded text-sm bg-blue-50/10 mt-6 shadow-sm">
                  <div className="bg-[#0095D5] bg-opacity-10 px-4 py-2 border-b border-[#0095D5] border-opacity-20 font-semibold text-[#0095D5] text-xs uppercase tracking-wider">Approver Actions</div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Comment (Required for Return/Reject)</label>
                      <textarea rows={2} className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5] shadow-sm"
                        value={comment} onChange={e => setComment(e.target.value)} placeholder="Add your remarks..." />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveReject('Approved')} className="bg-[#0095D5] text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-[#007BAF] transition-colors shadow-sm">Approve</button>
                      <button onClick={() => handleApproveReject('Returned')} className="bg-amber-500 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-amber-600 transition-colors shadow-sm">Return</button>
                      <button onClick={() => handleApproveReject('Rejected')} className="bg-red-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-red-700 transition-colors shadow-sm">Reject</button>
                    </div>
                  </div>
                </div>
              )}

              {user?.role === UserRole.ADMIN && (
                <div className="border border-purple-500 rounded text-sm bg-purple-50/10 mt-6 shadow-sm">
                  <div className="bg-purple-500 bg-opacity-10 px-4 py-2 border-b border-purple-500 border-opacity-20 font-semibold text-purple-600 text-xs uppercase tracking-wider">Admin Reassignment</div>
                  <div className="p-4 space-y-4">
                    <p className="text-xs text-gray-600">Current Approver: {users.find(u => u.id === claim.current_approver_id)?.name || claim.current_approver_id}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">New Approver</label>
                        <select className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-purple-500 shadow-sm"
                          value={newApproverId} onChange={e => setNewApproverId(e.target.value)}>
                          <option value="">Select Approver</option>
                          {users.filter(u => u.role === UserRole.APPROVER).map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Reassignment</label>
                        <input type="text" className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-purple-500 shadow-sm"
                          value={reassignReason} onChange={e => setReassignReason(e.target.value)} placeholder="e.g. Employee left company" />
                      </div>
                    </div>
                    <button onClick={handleReassign} className="bg-purple-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm">
                      Reassign Approver
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
