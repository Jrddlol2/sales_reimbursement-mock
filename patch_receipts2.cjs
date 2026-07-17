const fs = require('fs');
let code = fs.readFileSync('src/pages/ReceiptArchive.tsx', 'utf8');

const exportBtn = `
            {(generalSearch || vendorSearch || orSearch || selectedDepartment !== 'All' || startDate || endDate) && (
              <button
                onClick={handleClearFilters}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 hover:underline"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={filteredReceipts.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <DownloadSimple className="w-4 h-4" />
              Export CSV
            </button>
`;

code = code.replace(/\{\(generalSearch \|\| vendorSearch \|\| orSearch \|\| selectedDepartment !== 'All' \|\| startDate \|\| endDate\) \&\& \([\s\S]*?<X className="w-3\.5 h-3\.5" \/> Clear Filters\n\s*<\/button>\n\s*\)\}/m, exportBtn);

fs.writeFileSync('src/pages/ReceiptArchive.tsx', code);
