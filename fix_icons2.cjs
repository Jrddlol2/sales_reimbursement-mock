const fs = require('fs');

function replaceInFile(file, replacements) {
  let content = fs.readFileSync(file, 'utf8');
  for (const {from, to} of replacements) {
    content = content.replace(new RegExp(from, 'g'), to);
  }
  fs.writeFileSync(file, content);
}

replaceInFile('src/pages/ApprovalQueue.tsx', [
  { from: 'AlertTriangle', to: 'Warning' }
]);

replaceInFile('src/pages/Moms.tsx', [
  { from: 'UploadCloud', to: 'CloudArrowUp' }
]);

replaceInFile('src/pages/ProcessingQueue.tsx', [
  { from: 'RefreshCw', to: 'ArrowsClockwise' },
  { from: 'Activity', to: 'Pulse' },
  { from: 'AlertCircle', to: 'WarningCircle' }
]);

replaceInFile('src/pages/ScenarioGuide.tsx', [
  { from: 'Server', to: 'HardDrives' }
]);

console.log('done batch 4');
