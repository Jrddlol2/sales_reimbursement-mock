import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { SupportRequest, SupportRequestMessage, SupportRequestStatus, SupportRequestPriority, UserRole } from '../types';
import { useAuth } from '../components/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { WorkflowOwnerTag } from '../components/WorkflowOwnerTag';
import { format } from 'date-fns';
import { ArrowLeft, Lifebuoy, PaperPlaneRight, User as UserIcon, ShieldCheck } from '@phosphor-icons/react';
import { useToast } from '../components/Toast';

export const SupportDetail: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  
  const [request, setRequest] = useState<SupportRequest | null>(null);
  const [messages, setMessages] = useState<SupportRequestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const [updating, setUpdating] = useState(false);

  const fetchRequest = async () => {
    try {
      const data = await apiFetch(`/api/support/${id}`);
      setRequest(data);
      setMessages(data.messages || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load support request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const msg = await apiFetch(`/api/support/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: newMessage })
      });
      setMessages([...messages, msg]);
      setNewMessage('');
      fetchRequest(); // reload request for updated_at
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (status: SupportRequestStatus) => {
    if (!request) return;
    setUpdating(true);
    try {
      const updated = await apiFetch(`/api/support/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      setRequest(updated);
      toast.success('Status updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePriority = async (priority: SupportRequestPriority) => {
    if (!request) return;
    setUpdating(true);
    try {
      const updated = await apiFetch(`/api/support/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ priority })
      });
      setRequest(updated);
      toast.success('Priority updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update priority');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 italic">Loading ticket...</div>;
  if (!request) return <div className="p-8 text-center text-red-500">Support request not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/support" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors uppercase tracking-wider font-display">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Support Requests
      </Link>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
        <div className="p-6 flex-1 space-y-4">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
              <Lifebuoy className="w-6 h-6 text-brand" />
              {request.subject}
            </h1>
            <span className="flex items-center gap-1.5 shrink-0">
              <StatusBadge status={request.status} />
              <WorkflowOwnerTag status={request.status} />
            </span>
          </div>
          
          <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded border border-gray-100 whitespace-pre-wrap">
            {request.description}
          </div>
          
          {request.related_entity_type && request.related_entity_id && (
             <div className="text-xs text-gray-500 flex items-center gap-2">
                <strong>Related to:</strong> {request.related_entity_type} <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{request.related_entity_id.split('-')[0]}...</span>
             </div>
          )}
          
          <div className="text-xs text-gray-400">
             Opened {format(new Date(request.created_at), 'MMM d, yyyy HH:mm')}
          </div>
        </div>
        
        <div className="bg-gray-50 p-6 md:w-64 border-t md:border-t-0 md:border-l border-gray-200 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Details</h3>
            <div className="space-y-3">
              <div>
                <span className="block text-[10px] text-gray-400 uppercase font-semibold">Priority</span>
                {user?.role === UserRole.ADMIN ? (
                  <select 
                    value={request.priority} 
                    onChange={e => handleUpdatePriority(e.target.value as SupportRequestPriority)}
                    className="mt-1 block w-full text-xs border-gray-300 rounded py-1 pl-2 pr-6"
                    disabled={updating}
                  >
                    <option value={SupportRequestPriority.LOW}>Low</option>
                    <option value={SupportRequestPriority.MEDIUM}>Medium</option>
                    <option value={SupportRequestPriority.HIGH}>High</option>
                  </select>
                ) : (
                   <span className="text-sm font-semibold">{request.priority}</span>
                )}
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 uppercase font-semibold">Status</span>
                <select 
                  value={request.status} 
                  onChange={e => handleUpdateStatus(e.target.value as SupportRequestStatus)}
                  className="mt-1 block w-full text-xs border-gray-300 rounded py-1 pl-2 pr-6"
                  disabled={updating}
                >
                  <option value={SupportRequestStatus.OPEN}>Open</option>
                  <option value={SupportRequestStatus.IN_PROGRESS}>In Progress</option>
                  <option value={SupportRequestStatus.RESOLVED}>Resolved</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider font-display border-b border-gray-100 pb-2">Discussion Thread</h3>
        
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500 italic text-center py-4">No replies yet.</p>
        ) : (
          <div className="space-y-4">
            {messages.map(msg => {
              const isAdmin = msg.sender_id !== request.requestor_id;
              return (
                <div key={msg.id} className={`flex gap-3 ${isAdmin ? 'bg-slate-100/70' : 'bg-gray-50'} p-4 rounded-lg border ${isAdmin ? 'border-slate-200' : 'border-gray-100'}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? 'bg-slate-200 text-slate-700' : 'bg-gray-200 text-gray-600'}`}>
                     {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start mb-1">
                       <span className="text-sm font-bold text-gray-900">{isAdmin ? 'Support Admin' : 'Requestor'}</span>
                       <span className="text-[10px] text-gray-400 font-semibold">{format(new Date(msg.timestamp), 'MMM d, HH:mm')}</span>
                     </div>
                     <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                   </div>
                </div>
              );
            })}
          </div>
        )}
        
        {request.status !== SupportRequestStatus.RESOLVED ? (
          <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
            <input 
              type="text" 
              value={newMessage} 
              onChange={e => setNewMessage(e.target.value)} 
              placeholder="Type your reply..." 
              className="flex-1 border-gray-300 rounded px-4 py-2 text-sm focus:border-brand focus:ring-brand"
            />
            <button type="submit" disabled={sending || !newMessage.trim()} className="corp-btn-primary shrink-0">
              <PaperPlaneRight className="w-4 h-4" /> Send
            </button>
          </form>
        ) : (
          <div className="mt-4 bg-gray-50 p-3 rounded text-center text-sm text-gray-500 border border-gray-200">
            This request has been marked as resolved. You can reopen it by changing the status above.
          </div>
        )}
      </div>
    </div>
  );
};
