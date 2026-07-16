import React from 'react';
import { Chat } from '@phosphor-icons/react';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';

export interface CommentEntry {
  id: string;
  author: string;
  role?: string;
  body: string;
  timestamp: string;
  decision?: string;
}

interface CommentsProps {
  comments: CommentEntry[];
  emptyText?: string;
}

// Shared remarks/comment thread display. Pulls together whatever a page
// has as its "decision + remark" records (e.g. Claim Approval entries) into
// one consistent list, instead of each page inventing its own single-field
// remarks readout.
export const Comments: React.FC<CommentsProps> = ({ comments, emptyText = 'No comments yet.' }) => {
  if (comments.length === 0) {
    return <EmptyState icon={Chat} title="No comments" description={emptyText} />;
  }

  return (
    <div className="space-y-4">
      {comments.map(c => (
        <div key={c.id} className="border border-slate-200/60 rounded-lg p-4 bg-white shadow-sm flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                  {c.author.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 leading-none">
                    {c.author}
                  </div>
                  {c.role && <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">{c.role}</div>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {c.decision && <StatusBadge status={c.decision} size="sm" />}
                <span className="text-[10px] text-slate-400 font-mono">{new Date(c.timestamp).toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-100">
              "{c.body || 'No comment provided.'}"
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
