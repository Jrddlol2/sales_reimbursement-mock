import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Email, UserRole } from '../types';
import { useAuth } from '../components/AuthContext';
import { Envelope, Clock, User as UserIcon, ArrowLeft } from '@phosphor-icons/react';

export const SystemEmails: React.FC = () => {
  const { user } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [mobileEmail, setMobileEmail] = useState<Email | null>(null);

  useEffect(() => {
    apiFetch('/api/outbox').then(data => {
      setEmails(data);
      setLoading(false);
      
      // Select the first/most recent email by default for desktop
      if (data && data.length > 0) {
        const firstEmail = data[0];
        setSelectedEmail(firstEmail);
        
        // If the first email is unread, let's mark it as read immediately
        if (!firstEmail.read) {
          markEmailAsRead(firstEmail.id);
        }
      }
    }).catch(console.error);
  }, []);

  const markEmailAsRead = (emailId: string) => {
    // Optimistically update local read status
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, read: true } : e));
    
    // Call API to mark as read
    apiFetch('/api/outbox/read', {
      method: 'PUT',
      body: JSON.stringify({ ids: [emailId] })
    }).catch(console.error);
  };

  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email);
    setMobileEmail(email);
    
    if (!email.read) {
      markEmailAsRead(email.id);
    }
  };

  const handleMobileBack = () => {
    setMobileEmail(null);
  };

  // Strips standard headers/footers to extract a clean preview line
  const cleanEmailPreview = (body: string): string => {
    if (!body) return '';
    
    let text = body;
    
    // Strip "From:...To:...Subject:..." headers
    const dearIndex = text.indexOf('Dear ');
    if (dearIndex !== -1) {
      const startOfActualBody = text.indexOf('\n', dearIndex);
      if (startOfActualBody !== -1) {
        text = text.substring(startOfActualBody).trim();
      }
    }
    
    // Strip standard footer
    const footerIndex = text.indexOf('This is an automatically generated email.');
    if (footerIndex !== -1) {
      text = text.substring(0, footerIndex).trim();
    }
    
    // Also strip default signature if footer index is not found
    const sigIndex = text.indexOf('Sales Reimbursement System');
    if (sigIndex !== -1) {
      text = text.substring(0, sigIndex).trim();
    }
    
    // Collapse spacing/newlines to single space for a one-line preview
    return text.replace(/\s+/g, ' ').trim();
  };

  const formatEmailTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 h-full min-h-0 w-full space-y-6 px-1 sm:px-4">
        {/* Skeleton Header */}
        <div className="animate-pulse shrink-0">
          <div className="h-7 w-48 bg-slate-200 rounded-md mb-2"></div>
          <div className="h-4 w-96 bg-slate-100 rounded-md"></div>
        </div>

        {/* Skeleton Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
          {/* Email List Left Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden animate-pulse h-full">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="h-4 w-24 bg-slate-200 rounded"></div>
              <div className="h-4 w-12 bg-slate-200 rounded"></div>
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto p-3 space-y-3 flex-1 min-h-0">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-2 shrink-0">
                  <div className="flex justify-between">
                    <div className="h-3 w-32 bg-slate-200 rounded"></div>
                    <div className="h-3 w-12 bg-slate-200 rounded"></div>
                  </div>
                  <div className="h-4 w-48 bg-slate-100 rounded"></div>
                  <div className="h-3 w-full bg-slate-50 rounded"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Email Detail Right Panel */}
          <div className="hidden lg:flex lg:col-span-7 bg-white border border-slate-200 rounded-xl flex-col overflow-hidden animate-pulse p-6 space-y-4 h-full">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 shrink-0">
              <div className="space-y-2">
                <div className="h-5 w-48 bg-slate-200 rounded"></div>
                <div className="h-3.5 w-32 bg-slate-100 rounded"></div>
              </div>
              <div className="h-4 w-20 bg-slate-100 rounded"></div>
            </div>
            <div className="space-y-3 pt-2 flex-1 min-h-0">
              <div className="h-4 w-full bg-slate-100 rounded"></div>
              <div className="h-4 w-full bg-slate-100 rounded"></div>
              <div className="h-4 w-3/4 bg-slate-100 rounded"></div>
              <div className="h-24 bg-slate-50 rounded-lg w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 w-full space-y-6 px-1 sm:px-4">
      {/* Header (Always show on Desktop, and on Mobile list view) */}
      {(!mobileEmail) && (
        <div className="shrink-0">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Envelope className="w-6 h-6 text-brand" />
            {user?.role === UserRole.ADMIN ? 'System Emails (All)' : 'Email Inbox'}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Simulated workspace inbox containing transactional and system notifications.
          </p>
        </div>
      )}

      {emails.length === 0 ? (
        <div className="bg-white p-8 text-center border border-slate-200 rounded-xl text-sm text-slate-500 shadow-sm shrink-0">
          No emails found.
        </div>
      ) : (
        <div className="grid grid-cols-12 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0">
          {/* List Pane */}
          <div className={`col-span-12 md:col-span-5 lg:col-span-4 border-r border-slate-200 flex flex-col h-full min-h-0 bg-white ${mobileEmail ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider font-display">
                All Messages ({emails.length})
              </span>
              <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-bold">
                {emails.filter(e => !e.read).length} Unread
              </span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
              {emails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                const bodyPreview = cleanEmailPreview(email.body);

                return (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`p-3.5 cursor-pointer transition-all flex flex-col gap-1 relative ${
                      isSelected ? 'bg-brand/5 border-l-4 border-brand' : 'hover:bg-slate-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 truncate max-w-[140px] font-medium">
                        {email.from.split(' <')[0]}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {formatEmailTime(email.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!email.read && (
                        <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" title="Unread" />
                      )}
                      <h4 className={`text-xs truncate text-slate-900 ${!email.read ? 'font-bold' : 'font-semibold'}`}>
                        {email.subject}
                      </h4>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-1 leading-normal">
                      {bodyPreview || '(No content)'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail Pane */}
          <div className={`col-span-12 md:col-span-7 lg:col-span-8 flex flex-col h-full bg-slate-50/40 min-h-0 ${mobileEmail ? 'flex' : 'hidden md:flex'}`}>
            {/* Mobile Header / Back bar */}
            {mobileEmail && (
              <div className="md:hidden bg-white border-b border-slate-200 p-3 flex items-center gap-3 shrink-0">
                <button
                  onClick={handleMobileBack}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800">Back to Inbox</span>
              </div>
            )}

            {selectedEmail ? (
              <div className="flex-1 flex flex-col min-w-0 bg-white min-h-0">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/30 shrink-0">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {selectedEmail.subject}
                  </h3>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        <UserIcon className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {selectedEmail.from}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          To: {selectedEmail.to}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-500 font-medium flex items-center gap-1.5 sm:self-center">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(selectedEmail.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 min-h-0 p-5 sm:p-6 overflow-y-auto text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-white">
                  {selectedEmail.body}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6">
                <Envelope className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-xs font-medium">Select a message to read</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
