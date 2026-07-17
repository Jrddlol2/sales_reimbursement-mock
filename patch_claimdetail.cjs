const fs = require('fs');
let code = fs.readFileSync('src/pages/ClaimDetail.tsx', 'utf8');

code = code.replace("import {", "import { Printer,");

const printAction = `
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-semibold rounded shadow-sm transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 print:hidden"
                >
                  <Printer className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                  Print Summary
                </button>
                <Link to={\`/support?new=true&entityType=Claim&entityId=\${claim?.id}\`} className="px-3 py-1.5 text-xs font-semibold rounded shadow-sm transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 print:hidden">
`;

code = code.replace(/<Link to=\{`\/support\?new=true&entityType=Claim&entityId=\$\{claim\?\.id\}`\} className="px-3 py-1\.5 text-xs font-semibold rounded shadow-sm transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">/, printAction);

fs.writeFileSync('src/pages/ClaimDetail.tsx', code);
