const fs = require('fs');

const replacements = [
  {
    file: 'src/pages/LiquidationDetail.tsx',
    rules: [
      { from: "from 'lucide-react'", to: "from '@phosphor-icons/react'" },
      { from: " DollarSign, ", to: " CurrencyDollar, " },
      { from: "<DollarSign ", to: "<CurrencyDollar " },
      { from: " HelpCircle ", to: " Question " },
      { from: "<HelpCircle ", to: "<Question " }
    ]
  },
  {
    file: 'src/pages/ScenarioGuide.tsx',
    rules: [
      { from: "} from 'lucide-react'", to: "} from '@phosphor-icons/react'" },
      { from: " AlertTriangle,", to: " Warning," },
      { from: "<AlertTriangle ", to: "<Warning " },
      { from: " AlertCircle,", to: " WarningCircle," },
      { from: "<AlertCircle ", to: "<WarningCircle " }
    ]
  },
  {
    file: 'src/pages/ApprovalQueue.tsx',
    rules: [
      { from: "from 'lucide-react'", to: "from '@phosphor-icons/react'" },
      { from: " ChevronDown, ", to: " CaretDown, " },
      { from: "<ChevronDown ", to: "<CaretDown " },
      { from: " AlertTriangle ", to: " Warning " },
      { from: "<AlertTriangle ", to: "<Warning " },
      { from: "<CheckSquare ", to: "<CheckSquare " }
    ]
  },
  {
    file: 'src/pages/Moms.tsx',
    rules: [
      { from: "} from 'lucide-react'", to: "} from '@phosphor-icons/react'" },
      { from: " Plus,", to: " Plus," },
      { from: " ChevronDown,", to: " CaretDown," },
      { from: "<ChevronDown ", to: "<CaretDown " },
      { from: " FileText,", to: " FileText," },
      { from: " Calendar,", to: " Calendar," },
      { from: " LinkIcon,", to: " Link," },
      { from: "<LinkIcon ", to: "<Link " },
      { from: " Trash2", to: " Trash" },
      { from: "<Trash2 ", to: "<Trash " }
    ]
  },
  {
    file: 'src/pages/ProcessingQueue.tsx',
    rules: [
      { from: "} from 'lucide-react'", to: "} from '@phosphor-icons/react'" },
      { from: " ChevronDown,", to: " CaretDown," },
      { from: "<ChevronDown ", to: "<CaretDown " },
      { from: " AlertTriangle,", to: " Warning," },
      { from: "<AlertTriangle ", to: "<Warning " }
    ]
  },
  {
    file: 'src/pages/CashAdvanceDetail.tsx',
    rules: [
      { from: "from 'lucide-react'", to: "from '@phosphor-icons/react'" },
      { from: " Link as LinkIcon ", to: " Link as LinkIcon " },
      { from: "<LinkIcon ", to: "<LinkIcon " }
    ]
  },
  {
    file: 'src/pages/AuditLog.tsx',
    rules: [
      { from: "from 'lucide-react'", to: "from '@phosphor-icons/react'" },
      { from: " ChevronDown, ", to: " CaretDown, " },
      { from: "<ChevronDown ", to: "<CaretDown " },
      { from: " ChevronLeft, ", to: " CaretLeft, " },
      { from: "<ChevronLeft ", to: "<CaretLeft " },
      { from: " ChevronRight ", to: " CaretRight " },
      { from: "<ChevronRight ", to: "<CaretRight " }
    ]
  },
  {
    file: 'src/pages/MomDetail.tsx',
    rules: [
      { from: "from 'lucide-react'", to: "from '@phosphor-icons/react'" }
    ]
  },
  {
    file: 'src/DebugRoleSwitcher.tsx',
    rules: [
      { from: "from 'lucide-react'", to: "from '@phosphor-icons/react'" }
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
console.log('done batch 2');
