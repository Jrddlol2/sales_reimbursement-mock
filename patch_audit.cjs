const fs = require('fs');
let code = fs.readFileSync('src/pages/AuditLog.tsx', 'utf8');

code = code.replace("import { CaretDown", "import Papa from 'papaparse';\nimport { DownloadSimple, CaretDown");

const exportLogic = `
  const handleExport = () => {
    if (history.length === 0) return;
    const csv = Papa.unparse(history.map((log) => ({
      Timestamp: new Date(log.timestamp).toLocaleString(),
      'Reference ID': log.claim ? (log.claim.claim_number || log.claim.id.substring(0,8)) : log.targetUser ? log.targetUser.name : log.claim_id.substring(0,8),
      'Old Status': log.old_status,
      'New Status': log.new_status,
      'Changed By': log.user ? log.user.name : log.changed_by,
      'Reason': log.reason || ''
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'audit_log.csv';
    link.click();
  };
`;

code = code.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n' + exportLogic);

const exportBtn = `
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">Audit Log</h2>
          <p className="mt-1 text-xs text-slate-500">Immutable record of all status changes across Reimbursement claims, Cash Advances, and Liquidations.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={history.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <DownloadSimple className="w-4 h-4" />
          Export CSV
        </button>
      </div>
`;

code = code.replace(/<div>\n\s*<h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">Audit Log<\/h2>\n\s*<p className="mt-1 text-xs text-slate-500">Immutable record of all status changes across Reimbursement claims, Cash Advances, and Liquidations.<\/p>\n\s*<\/div>/, exportBtn);

fs.writeFileSync('src/pages/AuditLog.tsx', code);
