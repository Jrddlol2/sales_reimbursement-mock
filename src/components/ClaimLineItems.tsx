import React from 'react';
import { Paperclip } from 'lucide-react';
import { formatPHP } from '../utils';

interface ExpenseLike {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  expense_date: string;
  business_purpose: string;
  receipt_url?: string;
  attachment_type?: string;
}

interface ClaimLineItemsProps {
  expenses?: ExpenseLike[];
  totalAmount: number;
  fallbackReceiptUrl?: string;
  onPreviewReceipt?: (url: string) => void;
}

// Shared line-item / receipt display. Renders every ExpenseLineItem row when
// the claim has them (the schema has always supported more than one per
// claim, e.g. a multi-day trip with separate accommodation + transport
// lines) - falling back to the claim's single receipt_url for claims that
// predate or bypass the expenses array.
export const ClaimLineItems: React.FC<ClaimLineItemsProps> = ({ expenses, totalAmount, fallbackReceiptUrl, onPreviewReceipt }) => {
  if (expenses && expenses.length > 0) {
    return (
      <table className="min-w-full divide-y divide-slate-200 text-xs">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Vendor / Purpose</th>
            <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Category</th>
            <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Receipt</th>
            <th className="px-4 py-2.5 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {expenses.map(exp => (
            <tr key={exp.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3">
                <div className="font-bold text-slate-950">{exp.vendor}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{exp.expense_date} — {exp.business_purpose}</div>
              </td>
              <td className="px-4 py-3 text-slate-600 font-medium">{exp.category}</td>
              <td className="px-4 py-3">
                {exp.receipt_url && exp.receipt_url !== 'No Official Receipt' ? (
                  onPreviewReceipt ? (
                    <button type="button" onClick={() => onPreviewReceipt(exp.receipt_url!)} className="text-brand hover:underline inline-flex items-center gap-1 font-semibold">
                      <Paperclip className="w-3 h-3" /> View {exp.attachment_type || 'Receipt'}
                    </button>
                  ) : (
                    <a href={exp.receipt_url} target="_blank" rel="noreferrer" className="text-brand hover:underline inline-flex items-center gap-1 font-semibold">
                      <Paperclip className="w-3 h-3" /> View {exp.attachment_type || 'Receipt'}
                    </a>
                  )
                ) : (
                  <span className="text-slate-400 italic">
                    {exp.attachment_type === 'No Official Receipt' || exp.receipt_url === 'No Official Receipt' ? 'No Official Receipt' : 'None'}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-extrabold text-slate-950 font-display">{formatPHP(exp.amount)}</td>
            </tr>
          ))}
          {expenses.length > 1 && (
            <tr className="bg-slate-50 border-t border-slate-200">
              <td colSpan={3} className="px-4 py-2.5 text-right text-[10px] font-extrabold uppercase text-slate-500 font-display">Total</td>
              <td className="px-4 py-2.5 text-right font-extrabold text-brand font-display">{formatPHP(totalAmount)}</td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  if (fallbackReceiptUrl) {
    return (
      <div className="flex items-center justify-between text-xs p-3.5 bg-white border border-slate-200 rounded shadow-xs">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span className="font-extrabold text-slate-800 block font-display">Official Receipt</span>
            <span className="text-[10px] text-slate-400 font-mono">{fallbackReceiptUrl.split('/').pop()}</span>
          </div>
        </div>
        {onPreviewReceipt ? (
          <button type="button" onClick={() => onPreviewReceipt(fallbackReceiptUrl)} className="text-brand font-extrabold hover:underline">
            View Receipt
          </button>
        ) : (
          <a href={fallbackReceiptUrl} target="_blank" rel="noreferrer" className="text-brand font-extrabold hover:underline">
            View Receipt
          </a>
        )}
      </div>
    );
  }

  return <p className="text-xs text-slate-500 italic p-4 bg-slate-50 border border-slate-200 rounded">No receipt on file.</p>;
};
