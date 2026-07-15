import React from 'react';
import { UploadCloud, X, AlertTriangle, Trash2 } from 'lucide-react';

export interface ExpenseItemState {
  id: string;
  category: string;
  amount: string;
  receiptName: string;
  isDragOver?: boolean;
  // liquidation-specific fields
  expense_date?: string;
  vendor?: string;
  payment_method?: string;
  business_purpose?: string;
  attachment_type?: string;
}

interface ExpenseLineItemEditorProps {
  item: ExpenseItemState;
  index: number;
  mode: 'standard' | 'liquidation';
  categories: { value: string; label: string }[];
  showRemove: boolean;
  isDuplicate?: boolean;
  onRemove: () => void;
  onChange: (field: keyof ExpenseItemState, value: any) => void;
}

export const ExpenseLineItemEditor: React.FC<ExpenseLineItemEditorProps> = ({
  item,
  index,
  mode,
  categories,
  showRemove,
  isDuplicate = false,
  onRemove,
  onChange
}) => {
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onChange('isDragOver', false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onChange('receiptName', e.dataTransfer.files[0].name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onChange('receiptName', e.target.files[0].name);
    }
  };

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md relative group space-y-4" id={`expense-editor-item-${item.id}`}>
      {showRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 rounded bg-white shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove expense"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Mode Specific: Liquidation Row 1 (Vendor & Date) */}
      {mode === 'liquidation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">Expense Date *</label>
            <input
              type="date"
              required
              value={item.expense_date || ''}
              onChange={(e) => onChange('expense_date', e.target.value)}
              className="block w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">Vendor *</label>
            <input
              type="text"
              required
              placeholder="e.g. Starbucks, Petron, Grab"
              value={item.vendor || ''}
              onChange={(e) => onChange('vendor', e.target.value)}
              className="block w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-white"
            />
          </div>
        </div>
      )}

      {/* Row 2: Category and Amount */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">Category *</label>
          <select
            required
            value={item.category}
            onChange={(e) => onChange('category', e.target.value)}
            className="block w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-white"
          >
            <option value="">-- Select Category --</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">Amount (₱) *</label>
          <div className="relative rounded shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
              <span className="text-gray-400 text-xs">₱</span>
            </div>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={item.amount}
              onChange={(e) => onChange('amount', e.target.value)}
              className="block w-full border border-gray-300 rounded pl-7 pr-3 py-1.5 text-xs focus:border-brand focus:outline-none bg-white font-mono"
            />
          </div>
          {item.amount && !isNaN(parseFloat(item.amount)) && parseFloat(item.amount) > 15000 && (
            <div className="mt-1 flex items-start gap-1 text-[10px] text-amber-700 font-semibold">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
              <span>Amounts over ₱15,000 require supplementary receipts and justification.</span>
            </div>
          )}
          {isDuplicate && (
            <div className="mt-1 flex items-start gap-1 text-[10px] text-amber-700 font-semibold">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
              <span>A previous claim shares the exact category and amount. Verify this isn't a duplicate.</span>
            </div>
          )}
        </div>
      </div>

      {/* Mode Specific: Liquidation Row 3 (Payment Method & Business Purpose) */}
      {mode === 'liquidation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">Payment Method *</label>
            <select
              required
              value={item.payment_method || 'Cash'}
              onChange={(e) => onChange('payment_method', e.target.value)}
              className="block w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-white"
            >
              <option value="Cash">Cash</option>
              <option value="Corporate Credit Card">Corporate Credit Card</option>
              <option value="Personal Credit Card">Personal Credit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">Business Purpose *</label>
            <input
              type="text"
              required
              placeholder="e.g. Sales dinner, transportation to client site"
              value={item.business_purpose || ''}
              onChange={(e) => onChange('business_purpose', e.target.value)}
              className="block w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-white"
            />
          </div>
        </div>
      )}

      {/* Attachments & Receipts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {mode === 'liquidation' ? (
          <div>
            <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">Attachment Type *</label>
            <select
              required
              value={item.attachment_type || 'Official Receipt'}
              onChange={(e) => {
                onChange('attachment_type', e.target.value);
                if (e.target.value === 'No Official Receipt') {
                  onChange('receiptName', '');
                }
              }}
              className="block w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-white"
            >
              <option value="Official Receipt">Official Receipt</option>
              <option value="Deposit Slip">Deposit Slip</option>
              <option value="Acknowledgement Receipt">Acknowledgement Receipt</option>
              <option value="Other Supporting Documents">Other Supporting Documents</option>
              <option value="No Official Receipt">No Official Receipt (Policy Exception)</option>
            </select>
          </div>
        ) : (
          <div className="hidden md:block"></div>
        )}

        {/* File Drag-and-Drop & Browse */}
        {!(mode === 'liquidation' && item.attachment_type === 'No Official Receipt') && (
          <div className="md:col-span-2 space-y-1">
            <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
              Upload {mode === 'liquidation' ? (item.attachment_type || 'Official Receipt') : 'Official Receipt'} *
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                onChange('isDragOver', true);
              }}
              onDragLeave={() => onChange('isDragOver', false)}
              onDrop={handleFileDrop}
              className={`border border-dashed rounded px-3 py-2 text-center cursor-pointer transition-colors text-xs ${
                item.isDragOver ? 'border-brand bg-blue-50/50' : 'border-gray-300 hover:border-brand'
              }`}
            >
              <input
                type="file"
                id={`receipt_file_field_${item.id}`}
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor={`receipt_file_field_${item.id}`} className="cursor-pointer flex items-center justify-center gap-1.5 text-gray-500 font-semibold">
                <UploadCloud className="w-4 h-4 text-gray-400" />
                <span>Drag & Drop or click to upload file</span>
              </label>
            </div>
            {item.receiptName && (
              <div className="flex items-center justify-between text-[11px] bg-white border border-gray-200 rounded px-2 py-1 font-semibold text-slate-800">
                <span className="truncate max-w-[250px]">{item.receiptName}</span>
                <button
                  type="button"
                  onClick={() => onChange('receiptName', '')}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
