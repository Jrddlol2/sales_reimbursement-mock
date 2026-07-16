const fs = require('fs');

const replacements = [
  {
    file: 'src/components/Header.tsx',
    rules: [
      { from: " Activity, ", to: " Pulse, " },
      { from: "<Activity ", to: "<Pulse " }
    ]
  },
  {
    file: 'src/pages/ApprovalQueue.tsx',
    rules: [
      { from: " Inbox, ", to: " Tray, " },
      { from: "<Inbox ", to: "<Tray " },
      { from: " Activity, ", to: " Pulse, " },
      { from: "<Activity ", to: "<Pulse " },
      { from: "<AlertTriangle ", to: "<Warning " }
    ]
  },
  {
    file: 'src/pages/Moms.tsx',
    rules: [
      { from: " Send, ", to: " PaperPlaneRight, " },
      { from: " CheckCircle2, ", to: " CheckCircle, " },
      { from: " Mail, ", to: " Envelope, " },
      { from: " Edit, ", to: " Pencil, " },
      { from: " UploadCloud ", to: " CloudArrowUp " },
      { from: "<Send ", to: "<PaperPlaneRight " },
      { from: "<CheckCircle2 ", to: "<CheckCircle " },
      { from: "<Mail ", to: "<Envelope " },
      { from: "<Edit ", to: "<Pencil " },
      { from: "<UploadCloud ", to: "<CloudArrowUp " }
    ]
  },
  {
    file: 'src/pages/ProcessingQueue.tsx',
    rules: [
      { from: " ChevronRight, ", to: " CaretRight, " },
      { from: "<ChevronRight ", to: "<CaretRight " },
      { from: " RefreshCw, ", to: " ArrowsClockwise, " },
      { from: "<RefreshCw ", to: "<ArrowsClockwise " },
      { from: " DollarSign, ", to: " CurrencyDollar, " },
      { from: "<DollarSign ", to: "<CurrencyDollar " },
      { from: " ExternalLink, ", to: " ArrowSquareOut, " },
      { from: "<ExternalLink ", to: "<ArrowSquareOut " },
      { from: " Landmark, ", to: " Bank, " },
      { from: "<Landmark ", to: "<Bank " },
      { from: " HelpCircle, ", to: " Question, " },
      { from: "<HelpCircle ", to: "<Question " },
      { from: " Inbox, ", to: " Tray, " },
      { from: "<Inbox ", to: "<Tray " },
      { from: " AlertCircle, ", to: " WarningCircle, " },
      { from: "<AlertCircle ", to: "<WarningCircle " },
      { from: " Activity ", to: " Pulse " },
      { from: "<Activity ", to: "<Pulse " }
    ]
  },
  {
    file: 'src/pages/ScenarioGuide.tsx',
    rules: [
      { from: " ShieldAlert, ", to: " ShieldWarning, " },
      { from: "<ShieldAlert ", to: "<ShieldWarning " },
      { from: " RefreshCw, ", to: " ArrowsClockwise, " },
      { from: "<RefreshCw ", to: "<ArrowsClockwise " },
      { from: " Ban, ", to: " Prohibit, " },
      { from: "<Ban ", to: "<Prohibit " },
      { from: " HelpCircle, ", to: " Question, " },
      { from: "<HelpCircle ", to: "<Question " },
      { from: " Award, ", to: " Medal, " },
      { from: "<Award ", to: "<Medal " },
      { from: " Zap, ", to: " Lightning, " },
      { from: "<Zap ", to: "<Lightning " },
      { from: " Layers, ", to: " Stack, " },
      { from: "<Layers ", to: "<Stack " },
      { from: " ChevronRight, ", to: " CaretRight, " },
      { from: "<ChevronRight ", to: "<CaretRight " },
      { from: " Activity, ", to: " Pulse, " },
      { from: "<Activity ", to: "<Pulse " },
      { from: " Server ", to: " HardDrives " },
      { from: "<Server ", to: "<HardDrives " }
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
console.log('done batch 3');
