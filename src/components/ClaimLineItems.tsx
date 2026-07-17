import React, { useState } from 'react';
import { Paperclip, X, Calendar, Tag, Info, FilePdf } from '@phosphor-icons/react';
import { formatPHP } from '../utils';
import { ReceiptThumbnail } from './ReceiptThumbnail';
import { motion, AnimatePresence } from 'motion/react';

interface ExpenseLike {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  expense_date: string;
  business_purpose: string;
  receipt_url?: string;
  attachment_type?: string;
  or_number?: string;
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
  const [previewExpense, setPreviewExpense] = useState<ExpenseLike | null>(null);

  if (expenses && expenses.length > 0) {
    return (
      <div className="relative">
        {/* COMPACT GALLERY STRIP AT THE TOP */}
        {expenses.length > 1 && (
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block mb-2.5">
              Quick Scan Receipt Gallery ({expenses.filter(e => e.receipt_url && e.receipt_url !== 'No Official Receipt').length} attached)
            </span>
            <div className="flex flex-wrap gap-3.5">
              {expenses.map((exp, idx) => (
                <div key={exp.id || idx} className="flex flex-col items-center max-w-[80px]">
                  <ReceiptThumbnail
                    url={exp.receipt_url}
                    orNumber={exp.or_number}
                    vendor={exp.vendor}
                    size="md"
                    onClick={() => {
                      setPreviewExpense(exp);
                      if (onPreviewReceipt && exp.receipt_url) {
                        onPreviewReceipt(exp.receipt_url);
                      }
                    }}
                    className="border-slate-300 shadow-xs"
                  />
                  <span className="text-[9px] text-slate-600 font-bold truncate w-full text-center mt-1" title={exp.vendor}>
                    {exp.vendor || 'Unknown'}
                  </span>
                  <span className="text-[8px] text-slate-400 font-mono truncate w-full text-center">
                    {exp.or_number ? `OR: ${exp.or_number}` : (exp.receipt_url === 'No Official Receipt' ? 'No OR' : 'No Receipt')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Vendor / Purpose</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Category</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Receipt / OR No.</th>
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
                  <div className="flex items-center gap-2.5">
                    <ReceiptThumbnail
                      url={exp.receipt_url}
                      orNumber={exp.or_number}
                      vendor={exp.vendor}
                      onClick={() => {
                        setPreviewExpense(exp);
                        if (onPreviewReceipt && exp.receipt_url) {
                          onPreviewReceipt(exp.receipt_url);
                        }
                      }}
                      size="sm"
                    />
                    <div className="flex flex-col gap-0.5">
                      {exp.or_number ? (
                        <span className="text-[10px] text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono font-bold">
                          OR: {exp.or_number}
                        </span>
                      ) : (
                        exp.receipt_url === 'No Official Receipt' ? (
                          <span className="text-[9px] text-amber-700 font-extrabold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                            Exception Flag
                          </span>
                        ) : (
                          <span className="text-[9px] text-rose-700 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                            No OR Attached
                          </span>
                        )
                      )}
                    </div>
                  </div>
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

        {/* Full-Screen Overlay Modal */}
        <AnimatePresence>
          {previewExpense && previewExpense.receipt_url && previewExpense.receipt_url !== 'No Official Receipt' && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" id="receipt_full_preview_modal">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPreviewExpense(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />

              {/* Modal Box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="bg-white rounded-lg shadow-2xl overflow-hidden max-w-4xl w-full h-[80vh] flex flex-col md:flex-row relative z-10 border border-slate-200"
              >
                {/* Image Section */}
                <div className="flex-1 bg-slate-900 flex items-center justify-center p-0 relative group overflow-hidden border-b md:border-b-0 md:border-r border-slate-200">
                  {previewExpense.receipt_url.toLowerCase().endsWith('.pdf') ? (
                    <iframe src={previewExpense.receipt_url} className="w-full h-full border-0" title="PDF Document" />
                  ) : (
                    <img
                      src={previewExpense.receipt_url}
                      alt={previewExpense.vendor || 'Receipt'}
                      className="max-w-full max-h-full object-contain rounded shadow-lg transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                  )}
                </div>

                {/* Sidebar Info Section */}
                <div className="w-full md:w-[320px] bg-slate-50 flex flex-col p-6 overflow-y-auto">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Receipt Details</span>
                    <button
                      onClick={() => setPreviewExpense(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-5 flex-1">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display">Vendor / Establishment</span>
                      <h3 className="font-extrabold text-slate-950 text-lg leading-snug mt-0.5">{previewExpense.vendor || 'Unknown Vendor'}</h3>
                    </div>

                    <div className="bg-white border border-slate-200 rounded p-4 space-y-3 shadow-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block">Amount</span>
                        <span className="text-lg font-black text-brand font-display">{formatPHP(previewExpense.amount)}</span>
                      </div>

                      {previewExpense.or_number && (
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block">Official Receipt (OR) No.</span>
                          <span className="inline-block mt-1 text-xs font-mono font-bold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded">
                            {previewExpense.or_number}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block">Date of Expense</span>
                          <span className="text-slate-700 font-semibold">{previewExpense.expense_date}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Tag className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block">Expense Category</span>
                          <span className="text-slate-700 font-semibold">{previewExpense.category}</span>
                        </div>
                      </div>

                      {previewExpense.business_purpose && (
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block">Business Purpose</span>
                            <span className="text-slate-600 font-medium leading-relaxed block mt-0.5">{previewExpense.business_purpose}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 mt-6 flex gap-2">
                    <a
                      href={previewExpense.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-center text-xs font-bold transition-colors font-display"
                    >
                      Open Original
                    </a>
                    <button
                      onClick={() => setPreviewExpense(null)}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-colors font-display"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (fallbackReceiptUrl) {
    const fallbackItem: ExpenseLike = {
      id: 'fallback',
      vendor: 'Official Receipt',
      category: 'General Expense',
      amount: totalAmount,
      expense_date: 'N/A',
      business_purpose: 'Standard Attached Receipt',
      receipt_url: fallbackReceiptUrl,
    };
    return (
      <div className="flex items-center justify-between text-xs p-3 bg-white border border-slate-200 rounded shadow-xs relative">
        <div className="flex items-center gap-3">
          <ReceiptThumbnail
            url={fallbackReceiptUrl}
            onClick={() => {
              setPreviewExpense(fallbackItem);
              if (onPreviewReceipt) {
                onPreviewReceipt(fallbackReceiptUrl);
              }
            }}
            size="sm"
          />
          <div>
            <span className="font-extrabold text-slate-800 block font-display">Official Receipt</span>
            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px] block">{fallbackReceiptUrl.split('/').pop()}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setPreviewExpense(fallbackItem);
            if (onPreviewReceipt) {
              onPreviewReceipt(fallbackReceiptUrl);
            }
          }}
          className="text-brand font-extrabold hover:underline text-xs"
        >
          View Receipt
        </button>

        {/* Fallback Overlay Modal */}
        <AnimatePresence>
          {previewExpense && previewExpense.id === 'fallback' && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" id="receipt_full_preview_fallback">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPreviewExpense(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />

              {/* Modal Box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="bg-white rounded-lg shadow-2xl overflow-hidden max-w-4xl w-full h-[80vh] flex flex-col md:flex-row relative z-10 border border-slate-200"
              >
                {/* Image Section */}
                <div className="flex-1 bg-slate-900 flex items-center justify-center p-0 relative group overflow-hidden border-b md:border-b-0 md:border-r border-slate-200">
                  {previewExpense.receipt_url?.toLowerCase().endsWith('.pdf') ? (
                    <iframe src={previewExpense.receipt_url} className="w-full h-full border-0" title="PDF Document" />
                  ) : (
                    <img
                      src={previewExpense.receipt_url}
                      alt="Receipt"
                      className="max-w-full max-h-full object-contain rounded shadow-lg"
                    />
                  )}
                </div>

                {/* Sidebar Info Section */}
                <div className="w-full md:w-[320px] bg-slate-50 flex flex-col p-6 overflow-y-auto">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Receipt Details</span>
                    <button
                      onClick={() => setPreviewExpense(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-5 flex-1">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display">Vendor / Establishment</span>
                      <h3 className="font-extrabold text-slate-950 text-lg leading-snug mt-0.5">Official Receipt</h3>
                    </div>

                    <div className="bg-white border border-slate-200 rounded p-4 space-y-3 shadow-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-display block">Total Claim Amount</span>
                        <span className="text-lg font-black text-brand font-display">{formatPHP(totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 mt-6 flex gap-2">
                    <a
                      href={previewExpense.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-center text-xs font-bold transition-colors font-display"
                    >
                      Open Original
                    </a>
                    <button
                      onClick={() => setPreviewExpense(null)}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-colors font-display"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return <p className="text-xs text-slate-500 italic p-4 bg-slate-50 border border-slate-200 rounded">No receipt on file.</p>;
};
