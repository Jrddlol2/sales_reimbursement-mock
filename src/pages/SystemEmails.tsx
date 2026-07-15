import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Email, UserRole } from '../types';
import { useAuth } from '../components/AuthContext';
import { Mail, Clock, User as UserIcon } from 'lucide-react';

export const SystemEmails: React.FC = () => {
  const { user } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/outbox').then(data => {
      setEmails(data);
      setLoading(false);
      
      // Automatically mark all as read
      const unreadIds = data.filter((e: Email) => !e.read).map((e: Email) => e.id);
      if (unreadIds.length > 0) {
        apiFetch('/api/outbox/read', {
          method: 'PUT',
          body: JSON.stringify({ ids: unreadIds })
        });
      }
    });

    apiFetch('/api/activity/seen', {
      method: 'POST',
      body: JSON.stringify({ section: 'emails' })
    }).catch(console.error);
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Loading emails...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-medium text-gray-900 tracking-tight">
          {user?.role === UserRole.ADMIN ? 'System Emails (All)' : 'Email Inbox'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Simulated view of emails sent by the system.
        </p>
      </div>

      <div className="space-y-4">
        {emails.length === 0 ? (
          <div className="bg-white p-8 text-center border border-gray-200 rounded text-sm text-gray-500 shadow-sm">
            No emails found.
          </div>
        ) : emails.map(email => (
          <div key={email.id} className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm flex flex-col">
            <div className="bg-[#F4F6F8] px-4 py-3 border-b border-gray-200 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{email.subject}</h3>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(email.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex text-[13px] text-gray-600 gap-4 mt-1">
                <div><span className="text-gray-400">From:</span> {email.from}</div>
                <div><span className="text-gray-400">To:</span> {email.to}</div>
              </div>
            </div>
            <div className="p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {email.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
