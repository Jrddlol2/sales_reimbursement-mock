const fs = require('fs');
const file = 'src/pages/ClaimDetail.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('Duplicate Claim')) {
  // Add Copy icon
  content = content.replace(
    "import { ArrowLeft, FileText, DownloadSimple, User as UserIcon, Lifebuoy } from '@phosphor-icons/react';",
    "import { ArrowLeft, FileText, DownloadSimple, User as UserIcon, Lifebuoy, Copy } from '@phosphor-icons/react';"
  );
  
  // Add button to header
  const button = `
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/requestor/submit', { state: { duplicateData: claim } })}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                <Copy className="w-4 h-4" /> Duplicate Claim
              </button>
            </div>
          </div>
        </div>`;
        
  content = content.replace(
    "            {/* Action Buttons could go here */}\n          </div>\n        </div>",
    button
  );
  
  // Maybe "Action Buttons could go here" is not there, let's use regex
  const regex = /<StatusBadge status=\{claim\.status\} \/>\s*<\/div>\s*<\/div>\s*<\/div>/;
  if (content.match(regex)) {
      content = content.replace(regex, `<StatusBadge status={claim.status} />\n            </div>\n          </div>\n${button.replace('          </div>\n        </div>', '')}\n        </div>`);
  }
  
  fs.writeFileSync(file, content);
}
