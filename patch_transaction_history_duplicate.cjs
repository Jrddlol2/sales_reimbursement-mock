const fs = require('fs');
const file = 'src/pages/TransactionHistory.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('Duplicate Claim')) {
  // Add Copy icon if not imported
  if (!content.includes('Copy')) {
    content = content.replace(
      "import { ArrowRight, Funnel, Clock, FileText, CheckCircle, XCircle } from '@phosphor-icons/react';",
      "import { ArrowRight, Funnel, Clock, FileText, CheckCircle, XCircle, Copy } from '@phosphor-icons/react';"
    );
  }
  
  // Find where View Details is and add Duplicate button
  const button = `                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              navigate('/requestor/submit', { state: { duplicateData: claim } });
                            }}
                            className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded flex items-center gap-1 transition-colors"
                          >
                            <Copy className="w-3 h-3" /> Duplicate
                          </button>
                          <Link 
                            to={\`/claims/\${claim.id}\`}
                            className="text-brand hover:text-brand-600 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 bg-brand/5 hover:bg-brand/10 px-2 py-1 rounded transition-colors"
                          >
                            View Details <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>`;
                        
  content = content.replace(
    /                        <Link \n                          to=\{\`\/claims\/\$\{claim\.id\}\`\}\n                          className="text-brand hover:text-brand-600 font-bold text-\[10px\] uppercase tracking-wider flex items-center gap-1 bg-brand\/5 hover:bg-brand\/10 px-2 py-1 rounded transition-colors"\n                        >\n                          View Details <ArrowRight className="w-3 h-3" \/>\n                        <\/Link>/,
    button
  );
  
  fs.writeFileSync(file, content);
}
