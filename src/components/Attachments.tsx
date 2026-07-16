import React from 'react';
import { FileText, Icon } from '@phosphor-icons/react';
import { EmptyState } from './EmptyState';

export interface AttachmentItem {
  id: string;
  name: string;
  meta?: string;
  icon?: Icon;
  onView?: () => void;
  actionLabel?: string;
}

interface AttachmentsProps {
  items: AttachmentItem[];
  emptyText?: string;
}

// Shared file-row list for standalone attachments (supporting docs, MOM
// files) that aren't part of a per-line-item expense table - those stay on
// ClaimLineItems, which is a different (tabular) shape.
export const Attachments: React.FC<AttachmentsProps> = ({ items, emptyText = 'No attachments on file.' }) => {
  if (items.length === 0) {
    return <EmptyState icon={FileText} title="No attachments" description={emptyText} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
      {items.map(item => {
        const Icon = item.icon || FileText;
        return (
          <div key={item.id} className="flex items-center justify-between text-xs p-3 border border-slate-200 rounded-lg hover:border-brand/30 hover:bg-brand/5 transition-colors bg-white">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <div className="truncate">
                <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                {item.meta && <span className="text-[10px] text-slate-500 truncate block mt-0.5">{item.meta}</span>}
              </div>
            </div>
            {item.onView && (
              <button type="button" onClick={item.onView} className="text-brand font-extrabold hover:underline shrink-0 ml-3 uppercase tracking-wider text-[10px] bg-white px-2 py-1 rounded shadow-sm border border-slate-200">
                {item.actionLabel || 'View'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
