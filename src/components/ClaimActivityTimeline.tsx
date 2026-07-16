import React from 'react';
import { StatusHistory, User } from '../types';
import { getStatusColor } from '../utils';

export const ClaimActivityTimeline: React.FC<{ history?: StatusHistory[] }> = ({ history }) => {
  if (!history || history.length === 0) {
    return <div className="text-xs text-slate-500 italic p-4 text-center border border-dashed border-slate-200 rounded-lg">No activity recorded.</div>;
  }

  return (
    <div className="space-y-6 pt-2">
      {history.map((item, index) => (
        <div key={item.id} className="relative flex gap-5">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-brand shrink-0 z-10 shadow-[0_0_0_4px_rgba(37,99,235,0.1)]" />
            {index < history.length - 1 && <div className="w-px h-full bg-slate-200 mt-2" />}
          </div>
          <div className="pb-6 -mt-1.5 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusColor(item.new_status)}`}>
                {item.new_status}
              </span>
              <span className="text-[11px] text-slate-400 font-mono font-medium">
                {new Date(item.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="bg-white border border-slate-100 shadow-sm rounded-lg p-3">
              <div className="text-sm text-slate-900 font-bold flex items-center gap-2">
                {item.changedBy ? item.changedBy.name : item.changed_by}
              </div>
              {item.changedBy && (
                <div className="text-xs text-slate-500 mt-0.5">
                  {item.changedBy.job_title ? `${item.changedBy.job_title} · ${item.changedBy.department}` : item.changedBy.department}
                </div>
              )}
              {item.reason && (
                <div className="text-xs text-slate-700 mt-3 p-2 bg-slate-50 rounded border border-slate-100 italic">
                  "{item.reason}"
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
