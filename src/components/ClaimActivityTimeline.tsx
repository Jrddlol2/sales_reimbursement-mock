import React from 'react';
import { StatusHistory, User } from '../types';
import { getStatusColor } from '../utils';

export const ClaimActivityTimeline: React.FC<{ history?: StatusHistory[] }> = ({ history }) => {
  if (!history || history.length === 0) {
    return <div className="text-xs text-slate-500 italic">No activity recorded.</div>;
  }

  return (
    <div className="space-y-4">
      {history.map((item, index) => (
        <div key={item.id} className="relative flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-brand shrink-0 z-10" />
            {index < history.length - 1 && <div className="w-px h-full bg-slate-200 mt-2" />}
          </div>
          <div className="pb-4 -mt-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wide ${getStatusColor(item.new_status)}`}>
                {item.new_status}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(item.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-slate-900 font-bold">
              {item.changedBy ? item.changedBy.name : item.changed_by}
            </div>
            {item.changedBy && (
              <div className="text-[10px] text-slate-500 mt-0.5">
                {item.changedBy.job_title ? `${item.changedBy.job_title} · ${item.changedBy.department}` : item.changedBy.department}
              </div>
            )}
            {item.reason && (
              <div className="text-[10px] text-slate-600 mt-1 italic font-serif">
                "{item.reason}"
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
