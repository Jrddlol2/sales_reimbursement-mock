const fs = require('fs');
const file = 'src/pages/ApprovalQueue.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('Duplicate')) {
  if (!content.includes('Copy')) {
    content = content.replace(
      "import { CaretDown, Check, X, ArrowRight, Funnel, Clock, MagnifyingGlass, FileText, Checks, Archive, ChartBar, ChatCircleText, MagnifyingGlassPlus, Tray } from '@phosphor-icons/react';",
      "import { CaretDown, Check, X, ArrowRight, Funnel, Clock, MagnifyingGlass, FileText, Checks, Archive, ChartBar, ChatCircleText, MagnifyingGlassPlus, Tray, Copy } from '@phosphor-icons/react';"
    );
  }
  
  const linkMatches = content.match(/<Link\s+to=\{`\/claims\/\$\{claim\.id\}`\}\s+className="text-brand hover:text-brand-600 font-bold text-\[10px\] uppercase tracking-wider flex items-center gap-1 bg-brand\/5 hover:bg-brand\/10 px-2 py-1 rounded transition-colors"\s*>\s*View Details <ArrowRight className="w-3 h-3" \/>\s*<\/Link>/g);
  
  if (linkMatches) {
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
      /<Link\s+to=\{`\/claims\/\$\{claim\.id\}`\}\s+className="text-brand hover:text-brand-600 font-bold text-\[10px\] uppercase tracking-wider flex items-center gap-1 bg-brand\/5 hover:bg-brand\/10 px-2 py-1 rounded transition-colors"\s*>\s*View Details <ArrowRight className="w-3 h-3" \/>\s*<\/Link>/g,
      button
    );
  }
  
  // also add useNavigate to ApprovalQueue
  if (!content.includes('useNavigate')) {
    content = content.replace(
      "import { Link, useSearchParams } from 'react-router-dom';",
      "import { Link, useSearchParams, useNavigate } from 'react-router-dom';"
    );
    content = content.replace(
      "const ApprovalQueue: React.FC = () => {",
      "const ApprovalQueue: React.FC = () => {\n  const navigate = useNavigate();"
    );
  }
  
  fs.writeFileSync(file, content);
}
