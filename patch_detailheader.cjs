const fs = require('fs');
let code = fs.readFileSync('src/components/DetailHeader.tsx', 'utf8');

code = code.replace("import { X } from '@phosphor-icons/react';", "import { X, Copy } from '@phosphor-icons/react';\nimport { useToast } from './Toast';");

const newTitle = `
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-slate-950 font-mono tracking-wider uppercase">{title}</h2>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(title);
              toast.success('ID copied to clipboard');
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
            title="Copy ID"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
`;

code = code.replace(/<h2 className="text-base font-extrabold text-slate-950 font-mono tracking-wider uppercase">\{title\}<\/h2>/, newTitle);

code = code.replace("export const DetailHeader: React.FC<DetailHeaderProps> = ({ eyebrow, title, status, actions, onClose }) => {", "export const DetailHeader: React.FC<DetailHeaderProps> = ({ eyebrow, title, status, actions, onClose }) => {\n  const toast = useToast();");

fs.writeFileSync('src/components/DetailHeader.tsx', code);
