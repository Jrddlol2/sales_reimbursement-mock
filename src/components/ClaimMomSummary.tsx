import React from 'react';

interface ClaimMomSummaryProps {
  mom: any;
  compact?: boolean;
}

// Pure display of a claim's linked MOM - no edit/replace/download actions here,
// those are role-specific and stay in whichever container renders this
// (e.g. ClaimDetail wraps this with Approver-only action buttons above it).
export const ClaimMomSummary: React.FC<ClaimMomSummaryProps> = ({ mom, compact = false }) => {
  if (!mom) {
    return <p className="text-xs text-slate-500 italic p-4 bg-slate-50 border border-slate-200 rounded">No MOM document found.</p>;
  }

  if (compact) {
    return (
      <div className="space-y-1 text-xs">
        <p className="font-extrabold text-slate-950 font-display">{mom.client}</p>
        <p className="text-slate-600 font-medium">Date: {mom.meeting_date}</p>
        <p className="text-slate-600 font-medium">Location: {mom.location}</p>
        <p className="text-slate-700 italic border-t border-slate-100 pt-1.5 mt-1">{mom.purpose}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-extrabold text-slate-950 block text-sm font-display">{mom.client}</span>
          <span className="text-[10px] text-brand font-bold uppercase tracking-wider block mt-0.5 font-display">Verified Minutes Document</span>
        </div>
        <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 font-bold rounded text-[9px] uppercase font-mono">
          {mom.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-slate-100 pt-2.5">
        <div><span className="text-slate-400 font-bold block">Meeting Date:</span>{mom.meeting_date}</div>
        <div><span className="text-slate-400 font-bold block">Location:</span>{mom.location}</div>
        <div><span className="text-slate-400 font-bold block mt-1">Contact Person:</span>{mom.contact_person}</div>
        <div><span className="text-slate-400 font-bold block mt-1">Contact Email:</span>{mom.contact_person_email}</div>
        <div className="col-span-2"><span className="text-slate-400 font-bold block mt-1">Business SOW / Discussion:</span>
          <p className="text-slate-600 italic bg-slate-50 p-2 border border-slate-100 rounded mt-0.5">{mom.purpose}</p>
        </div>
      </div>
    </div>
  );
};
