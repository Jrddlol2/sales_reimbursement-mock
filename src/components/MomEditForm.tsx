import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import { Mom } from '../types';
import { UploadCloud, X } from 'lucide-react';
import { useToast } from './Toast';

interface MomEditFormProps {
  mom: Mom;
  onSaved: (mom: Mom) => void;
  onCancel: () => void;
}

// Lightweight MOM correction form, purpose-built for an Approver making a minor
// fix to a linked MOM without leaving the claim review panel - not the full
// Requestor drafting experience in Moms.tsx (no live preview, no draft/finalize
// distinction), since "minor MOM corrections should not require rejection."
export const MomEditForm: React.FC<MomEditFormProps> = ({ mom, onSaved, onCancel }) => {
  const toast = useToast();
  const [client, setClient] = useState(mom.client || '');
  const [contactPerson, setContactPerson] = useState(mom.contact_person || '');
  const [contactPersonEmail, setContactPersonEmail] = useState(mom.contact_person_email || '');
  const [meetingDate, setMeetingDate] = useState(mom.meeting_date || '');
  const [meetingTime, setMeetingTime] = useState(mom.meeting_time || '');
  const [location, setLocation] = useState(mom.location || '');
  const [purpose, setPurpose] = useState(mom.purpose || '');
  const [discussion, setDiscussion] = useState(mom.discussion || '');
  const [agreements, setAgreements] = useState(mom.agreements || '');
  const [actionItems, setActionItems] = useState(mom.action_items || '');
  const [fileName, setFileName] = useState(mom.file_name || '');
  const [saving, setSaving] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiFetch(`/api/moms/${mom.id}`, {
        method: 'PUT',
        body: JSON.stringify({
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
          file_name: fileName,
          file_url: fileName ? `/uploads/${fileName}` : undefined
        })
      });
      onSaved(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save MOM changes');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "block w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:border-brand";
  const labelClass = "block text-[10px] font-bold text-gray-500 uppercase mb-1";

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Client</label>
          <input value={client} onChange={e => setClient(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Contact Person</label>
          <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Contact Person Email</label>
        <input type="email" value={contactPersonEmail} onChange={e => setContactPersonEmail(e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Meeting Date</label>
          <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Meeting Time</label>
          <input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Location</label>
        <input value={location} onChange={e => setLocation(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Purpose</label>
        <input value={purpose} onChange={e => setPurpose(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Discussion</label>
        <textarea rows={3} value={discussion} onChange={e => setDiscussion(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Agreements</label>
        <textarea rows={2} value={agreements} onChange={e => setAgreements(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Action Items</label>
        <textarea rows={2} value={actionItems} onChange={e => setActionItems(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Replace Attached Document (PDF/DOC/DOCX)</label>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="file" id="mom_replace_file" accept=".pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" />
          <label htmlFor="mom_replace_file" className="cursor-pointer inline-flex items-center gap-1 border border-gray-300 rounded px-2 py-1 text-[10px] font-semibold text-gray-600 hover:border-brand hover:text-brand">
            <UploadCloud className="w-3.5 h-3.5" /> Choose File
          </label>
          {fileName && (
            <span className="text-[10px] text-gray-600 truncate max-w-[160px] flex items-center gap-1 bg-gray-50 border border-gray-100 rounded px-2 py-1">
              {fileName}
              <button type="button" onClick={() => setFileName('')} className="text-red-500 hover:text-red-700">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="flex-1 bg-brand hover:bg-brand-hover text-white font-semibold py-1.5 rounded text-xs disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-xs font-semibold">
          Cancel
        </button>
      </div>
    </form>
  );
};
