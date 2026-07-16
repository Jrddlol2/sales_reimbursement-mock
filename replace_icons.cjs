const fs = require('fs');

const replacements = [
  {
    file: 'src/components/Header.tsx',
    rules: [
      { from: "from 'lucide-react'", to: "from '@phosphor-icons/react'" },
      { from: " Layers, ", to: " Stack, " },
      { from: "<Layers ", to: "<Stack " }
    ]
  },
  {
    file: 'src/components/MomEditForm.tsx',
    rules: [
      { from: "from 'lucide-react'", to: "from '@phosphor-icons/react'" },
      { from: " UploadCloud, ", to: " CloudArrowUp, " },
      { from: "<UploadCloud ", to: "<CloudArrowUp " }
    ]
  },
  {
    file: 'src/components/ClaimLineItems.tsx',
    rules: [
      { from: "from 'lucide-react'", to: "from '@phosphor-icons/react'" }
    ]
  },
  {
    file: 'src/components/ExpenseLineItemEditor.tsx',
    rules: [
      { from: "from 'lucide-react'", to: "from '@phosphor-icons/react'" },
      { from: " UploadCloud, ", to: " CloudArrowUp, " },
      { from: "<UploadCloud ", to: "<CloudArrowUp " },
      { from: " AlertTriangle, ", to: " Warning, " },
      { from: "<AlertTriangle ", to: "<Warning " },
      { from: " Trash2 ", to: " Trash " },
      { from: "<Trash2 ", to: "<Trash " }
    ]
  },
  {
    file: 'src/components/KPITile.tsx',
    rules: [
      { from: "from 'lucide-react'", to: "from '@phosphor-icons/react'" },
      { from: "LucideIcon", to: "Icon" },
      { from: "LucideIcon", to: "Icon" } // replace multiple? We will use split.join or global regex
    ]
  },
  {
    file: 'src/components/CashAdvanceLiquidationSection.tsx',
    rules: [
      { from: "} from 'lucide-react'", to: "} from '@phosphor-icons/react'" },
      { from: " Trash2,", to: " Trash," },
      { from: "<Trash2 ", to: "<Trash " },
      { from: " UploadCloud,", to: " CloudArrowUp," },
      { from: "<UploadCloud ", to: "<CloudArrowUp " },
      { from: " AlertCircle,", to: " WarningCircle," },
      { from: "<AlertCircle ", to: "<WarningCircle " },
      { from: " Send,", to: " PaperPlaneRight," },
      { from: "<Send ", to: "<PaperPlaneRight " },
      { from: " Sparkles,", to: " Sparkle," },
      { from: "<Sparkles ", to: "<Sparkle " },
      { from: " Search", to: " MagnifyingGlass" },
      { from: "<Search ", to: "<MagnifyingGlass " }
    ]
  },
  {
    file: 'src/pages/SubmitClaim.tsx',
    rules: [
      { from: "} from 'lucide-react'", to: "} from '@phosphor-icons/react'" },
      { from: " Sparkles,", to: " Sparkle," },
      { from: "<Sparkles ", to: "<Sparkle " },
      { from: " UploadCloud,", to: " CloudArrowUp," },
      { from: "<UploadCloud ", to: "<CloudArrowUp " },
      { from: " Send,", to: " PaperPlaneRight," },
      { from: "<Send ", to: "<PaperPlaneRight " },
      { from: " AlertCircle,", to: " WarningCircle," },
      { from: "<AlertCircle ", to: "<WarningCircle " },
      { from: " HelpCircle,", to: " Question," },
      { from: "<HelpCircle ", to: "<Question " },
      { from: " Landmark,", to: " Bank," },
      { from: "<Landmark ", to: "<Bank " },
      { from: " Trash2", to: " Trash" },
      { from: "<Trash2 ", to: "<Trash " }
    ]
  },
  {
    file: 'src/pages/SystemEmails.tsx',
    rules: [
      { from: "from 'lucide-react'", to: "from '@phosphor-icons/react'" },
      { from: " Mail, ", to: " Envelope, " },
      { from: "<Mail ", to: "<Envelope " }
    ]
  }
];

for (const rep of replacements) {
  let content = fs.readFileSync(rep.file, 'utf8');
  for (const rule of rep.rules) {
    content = content.split(rule.from).join(rule.to);
  }
  fs.writeFileSync(rep.file, content);
}
console.log('done batch 1');
