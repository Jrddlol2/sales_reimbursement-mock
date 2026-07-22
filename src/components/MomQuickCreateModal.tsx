import React, { useState, useEffect } from 'react';
import { FileText, PaperPlaneRight } from '@phosphor-icons/react';
import { apiFetch } from '../lib/api';
import { Mom, MomStatus, MinutesSource, Company } from '../types';
import { useToast } from './Toast';
import { Modal, ModalHeader } from './Modal';

interface MomQuickCreateModalProps {
  onClose: () => void;
  onCreated: (mom: Mom) => void;
}

// Same template fields and create-then-finalize flow as the "Create Minutes in
// System" form in Moms.tsx (see handleFormSubmitAndSend), packaged as a modal
// so the claim wizard never has to leave claim context to unblock itself.
export const MomQuickCreateModal: React.FC<MomQuickCreateModalProps> = ({ onClose, onCreated }) => {
  const toast = useToast();
  const [client, setClient] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPersonEmail, setContactPersonEmail] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingTime, setMeetingTime] = useState('14:00');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [discussion, setDiscussion] = useState('');
  const [agreements, setAgreements] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [companyDirectory, setCompanyDirectory] = useState<Company[]>([]);
  const [clientMode, setClientMode] = useState<'select' | 'custom'>('select');

  useEffect(() => {
    apiFetch('/api/companies').then(setCompanyDirectory).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !contactPerson || !contactPersonEmail || !meetingDate || !purpose || !discussion) {
      toast.error('Please fill out all required fields to complete the MOM.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        client,
        contact_person: contactPerson,
        contact_person_email: contactPersonEmail,
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        location,
        purpose,
        discussion,
        agreements,
        action_items: actionItems,
        status: MomStatus.DRAFT,
        minutes_source: MinutesSource.TEMPLATE
      };

      const savedMom = await apiFetch('/api/moms', { method: 'POST', body: JSON.stringify(payload) });
      const completedMom = await apiFetch(`/api/moms/${savedMom.id}/send`, { method: 'POST' });
      toast.success('Minutes of Meeting created and finalized — it\'s attached below.');
      onCreated(completedMom);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create Minutes of Meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidthClass="max-w-xl" ariaLabel="Create Minutes of Meeting">
      <ModalHeader title="Create Minutes of Meeting" icon={<FileText className="w-5 h-5 text-brand" />} onClose={onClose} />
      <div className="overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-gray-500 -mt-1">
            This finalizes and sends the MOM immediately so it's ready to attach to your claim.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Client (Company Name) *</label>
              <select
                required={clientMode === 'select'}
                value={clientMode === 'custom' ? '__custom__' : client}
                onChange={e => {
                  if (e.target.value === '__custom__') {
                    setClientMode('custom');
                    setClient('');
                  } else {
                    setClientMode('select');
                    setClient(e.target.value);
                  }
                }}
                className="block w-full text-sm border border-gray-300 rounded px-3 py-2 focus:border-brand focus:outline-none bg-white"
              >
                <option value="">-- Select Company --</option>
                {companyDirectory.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
                <option value="__custom__">+ Specify your own...</option>
              </select>
              {clientMode === 'custom' && (
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter new company name"
                  value={client}
                  onChange={e => setClient(e.target.value)}
                  className="block w-full text-sm border border-gray-300 rounded px-3 py-2 mt-2 focus:border-brand focus:outline-none"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Contact Person Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Maria Santos"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                className="block w-full text-sm border border-gray-300 rounded px-3 py-2 focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Contact Person Email *</label>
            <input
              type="email"
              required
              placeholder="e.g. msantos@smprime.com"
              value={contactPersonEmail}
              onChange={e => setContactPersonEmail(e.target.value)}
              className="block w-full text-sm border border-gray-300 rounded px-3 py-2 focus:border-brand focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Meeting Date *</label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
                className="block w-full text-sm border border-gray-300 rounded px-3 py-2 focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Meeting Time</label>
              <input
                type="time"
                value={meetingTime}
                onChange={e => setMeetingTime(e.target.value)}
                className="block w-full text-sm border border-gray-300 rounded px-3 py-2 focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Location / Platform</label>
            <input
              type="text"
              placeholder="e.g. Quezon City Office / MS Teams"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="block w-full text-sm border border-gray-300 rounded px-3 py-2 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Purpose *</label>
            <input
              type="text"
              required
              placeholder="e.g. Partnership kickoff"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              className="block w-full text-sm border border-gray-300 rounded px-3 py-2 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Discussion Details *</label>
            <textarea
              required
              rows={3}
              placeholder="Summarize what was discussed with the client..."
              value={discussion}
              onChange={e => setDiscussion(e.target.value)}
              className="block w-full text-sm border border-gray-300 rounded px-3 py-2 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Agreements Made</label>
            <textarea
              rows={2}
              placeholder="Any agreements reached..."
              value={agreements}
              onChange={e => setAgreements(e.target.value)}
              className="block w-full text-sm border border-gray-300 rounded px-3 py-2 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Action Items</label>
            <textarea
              rows={2}
              placeholder="Next steps and owners..."
              value={actionItems}
              onChange={e => setActionItems(e.target.value)}
              className="block w-full text-sm border border-gray-300 rounded px-3 py-2 focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="corp-btn-primary"
            >
              <PaperPlaneRight className="w-4 h-4" /> {submitting ? 'Finalizing...' : 'Finalize & Attach'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
