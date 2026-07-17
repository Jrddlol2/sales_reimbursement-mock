const fs = require('fs');
let code = fs.readFileSync('src/pages/TransactionHistory.tsx', 'utf8');

const exportLogic = `
  const handleExport = () => {
    if (filteredItems.length === 0) return;
    const csv = Papa.unparse(filteredItems.map(item => ({
      Reference: item.reference,
      Type: item.type,
      Status: item.status,
      Amount: item.amount,
      Date: item.date ? item.date.substring(0, 10) : ''
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'transaction_history.csv';
    link.click();
  };
`;

code = code.replace('const types: Array', exportLogic + '\n  const types: Array');

const exportBtn = `
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className="text-xs font-semibold text-brand hover:underline self-end sm:self-auto"
            >
              Clear Dates
            </button>
          )}
          
          <div className="flex-1"></div>
          <button
            onClick={handleExport}
            disabled={filteredItems.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <DownloadSimple className="w-4 h-4" />
            Export CSV
          </button>
`;

code = code.replace(/\{\(startDate \|\| endDate\) \&\& \([\s\S]*?Clear Dates\n\s*<\/button>\n\s*\)\}/m, exportBtn);

fs.writeFileSync('src/pages/TransactionHistory.tsx', code);
