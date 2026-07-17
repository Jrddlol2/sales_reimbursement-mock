const fs = require('fs');
const file = 'src/pages/TransactionHistory.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('Saved Filters:')) {
  // We will insert preset pills before the "Filters" div
  content = content.replace(
    '<div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-end">',
    `<div className="bg-white p-4 border-b border-slate-200 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Saved Filters:</span>
            <button onClick={() => { setSelectedType('All'); setSelectedStatus('All'); setSearchParams({ type: 'All', status: 'All' }); }} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-full transition-colors">Clear Filters</button>
            <button onClick={() => { setSelectedType('Reimbursement'); setSelectedStatus('Pending Approval'); setSearchParams({ type: 'Reimbursement', status: 'Pending Approval' }); }} className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-full transition-colors">Pending Reimbursements</button>
            <button onClick={() => { setSelectedType('Cash Advance'); setSelectedStatus('Submitted'); setSearchParams({ type: 'Cash Advance', status: 'Submitted' }); }} className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full transition-colors">Pending CADVs</button>
            <button onClick={() => { setSelectedType('All'); setSelectedStatus('Completed'); setSearchParams({ type: 'All', status: 'Completed' }); }} className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-full transition-colors">All Completed</button>
          </div>
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-end">`
  );
  
  // also make Type filter update URL
  content = content.replace(
    "onChange={e => {\n                setSelectedType(e.target.value as any);\n                setCurrentPage(1);\n              }}",
    "onChange={e => {\n                setSelectedType(e.target.value as any);\n                searchParams.set('type', e.target.value);\n                setSearchParams(searchParams);\n                setCurrentPage(1);\n              }}"
  );

  fs.writeFileSync(file, content);
}
