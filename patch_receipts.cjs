const fs = require('fs');
let code = fs.readFileSync('src/pages/ReceiptArchive.tsx', 'utf8');

code = code.replace("import { motion", "import Papa from 'papaparse';\nimport { DownloadSimple } from '@phosphor-icons/react';\nimport { motion");

const exportLogic = `
  const handleExport = () => {
    if (filteredReceipts.length === 0) return;
    const csv = Papa.unparse(filteredReceipts.map(r => ({
      'Receipt URL': r.receipt_url,
      'OR Number': r.or_number,
      'Vendor': r.vendor,
      'Amount': r.amount,
      'Date': r.expense_date,
      'Category': r.category,
      'Purpose': r.business_purpose,
      'Requestor': r.requestor_name,
      'Department': r.requestor_department,
      'Parent Type': r.parentType,
      'Parent Number': r.parentNumber
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'receipt_archive.csv';
    link.click();
  };
`;

code = code.replace("const [previewItem, setPreviewItem] = useState<ReceiptRecord | null>(null);", "const [previewItem, setPreviewItem] = useState<ReceiptRecord | null>(null);\n" + exportLogic);

const exportBtn = `
          {/* Main Search */}
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor, purpose, or requestor..."
              value={generalSearch}
              onChange={(e) => {
                setGeneralSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={filteredReceipts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <DownloadSimple className="w-4 h-4" />
            Export CSV
          </button>
        </div>
`;

code = code.replace(/\{\/\* Main Search \*\/\}\n\s*<div className="relative flex-1">\n\s*<MagnifyingGlass[\s\S]*?className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-slate-400"\n\s*\/>\n\s*<\/div>\n\s*<\/div>/, exportBtn);

fs.writeFileSync('src/pages/ReceiptArchive.tsx', code);
