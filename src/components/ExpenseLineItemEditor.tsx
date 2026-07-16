import React, { useState, useEffect } from 'react';
import { CloudArrowUp, X, Warning, Trash, Sparkle } from '@phosphor-icons/react';
import Tesseract from 'tesseract.js';
import { ReceiptThumbnail } from './ReceiptThumbnail';

export interface ExpenseItemState {
  id: string;
  category: string;
  amount: string;
  receiptName: string;
  isDragOver?: boolean;
  or_number?: string;
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

const extractORNumberFromText = (text: string): string | null => {
  const lines = text.split('\n');
  
  // Keywords to look for
  const patterns = [
    /(?:o\.?r\.?\s*(?:no\.?|#)?|official\s+receipt\s*(?:no\.?|#)?|sales\s+invoice\s*(?:no\.?|#)?|s\.?i\.?\s*(?:no\.?|#)?|invoice\s*(?:no\.?|#)?|receipt\s*(?:no\.?|#)?|inv\s*(?:no\.?|#)?)\s*[:#\-\s]*([A-Z0-9\-]{3,15})/i,
    /or\s*[:#\-\s]*([A-Z0-9\-]{3,15})/i,
    /inv(?:oice)?\s*[:#\-\s]*([A-Z0-9\-]{3,15})/i
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const clean = match[1].trim();
        // Skip short matches or ones without digits
        if (clean.length >= 3 && /[0-9]/.test(clean)) {
          return clean;
        }
      }
    }
  }

  // Fallbacks
  const generalPatterns = [
    /(?:OR|INV|SI)\s*[-#\s]*([0-9]{3,10})/i,
    /([0-9]{5,10})/
  ];

  for (const line of lines) {
    for (const pattern of generalPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const clean = match[1].trim();
        if (clean.length >= 3) {
          return clean;
        }
      }
    }
  }

  return null;
};

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
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (!localFile) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(localFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [localFile]);

  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrHint, setOcrHint] = useState<string | null>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onChange('isDragOver', false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onChange('receiptName', file.name);
      setLocalFile(file);
      setOcrHint(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onChange('receiptName', file.name);
      setLocalFile(file);
      setOcrHint(null);
    }
  };

  const runOCR = async () => {
    if (!localFile) return;
    setIsOcrRunning(true);
    setOcrProgress(0);
    setOcrHint(null);

    try {
      if (!localFile.type.startsWith('image/')) {
        setOcrHint('OCR only supports image files (PNG, JPG, etc.).');
        setIsOcrRunning(false);
        return;
      }

      const result = await Tesseract.recognize(
        localFile,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      const text = result.data.text;
      console.log('OCR Raw Text:', text);
      const detected = extractORNumberFromText(text);

      if (detected) {
        onChange('or_number', detected);
        setOcrHint('✨ Auto-detected (please verify)');
      } else {
        setOcrHint('Could not find OR Number. Enter manually.');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setOcrHint('Failed to read image. Enter manually.');
    } finally {
      setIsOcrRunning(false);
    }
  };

  const handleClearReceipt = () => {
    onChange('receiptName', '');
    setLocalFile(null);
    setOcrHint(null);
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
          <Trash className="w-3.5 h-3.5" />
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
              <Warning className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
              <span>Amounts over ₱15,000 require supplementary receipts and justification.</span>
            </div>
          )}
          {isDuplicate && (
            <div className="mt-1 flex items-start gap-1 text-[10px] text-amber-700 font-semibold">
              <Warning className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
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

      {/* Attachments, Receipts & OR Number */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
            OR Number (Optional)
          </label>
          <div className="flex gap-1.5 items-center">
            <input
              type="text"
              placeholder="e.g. OR-12345, INV-987"
              value={item.or_number || ''}
              onChange={(e) => onChange('or_number', e.target.value)}
              className="block w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-white flex-1"
            />
            {localFile && localFile.type.startsWith('image/') && (
              <button
                type="button"
                onClick={runOCR}
                disabled={isOcrRunning}
                className="shrink-0 bg-brand hover:bg-brand-hover disabled:bg-slate-300 text-white px-2.5 py-1.5 rounded text-xs flex items-center justify-center gap-1.5 transition-colors font-bold uppercase tracking-wider font-display"
                title="Extract OR Number from uploaded receipt using OCR"
              >
                {isOcrRunning ? (
                  <span className="inline-block animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Sparkle className="w-3.5 h-3.5 text-white" />
                )}
                {isOcrRunning ? `${ocrProgress}%` : 'Scan'}
              </button>
            )}
          </div>
          {ocrHint && (
            <p className={`text-[10px] mt-1 font-semibold ${ocrHint.includes('✨') ? 'text-green-600' : 'text-slate-500'}`}>
              {ocrHint}
            </p>
          )}
        </div>

        {mode === 'liquidation' ? (
          <div>
            <label className="block text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">Attachment Type *</label>
            <select
              required
              value={item.attachment_type || 'Official Receipt'}
              onChange={(e) => {
                onChange('attachment_type', e.target.value);
                if (e.target.value === 'No Official Receipt') {
                  handleClearReceipt();
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
          <div className={`${mode === 'liquidation' ? 'md:col-span-1' : 'md:col-span-2'} space-y-1`}>
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
                <CloudArrowUp className="w-4 h-4 text-gray-400" />
                <span>Drag & Drop or click to upload file</span>
              </label>
            </div>
            {item.receiptName && (
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded p-2 text-slate-800 shadow-xs relative">
                <ReceiptThumbnail
                  url={previewUrl || (item.receiptName.startsWith('http') || item.receiptName.startsWith('/') || item.receiptName.startsWith('data:') ? item.receiptName : `/uploads/${item.receiptName}`)}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{item.receiptName}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Live Upload Preview</p>
                </div>
                <button
                  type="button"
                  onClick={handleClearReceipt}
                  className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-slate-50 transition-colors shrink-0"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
