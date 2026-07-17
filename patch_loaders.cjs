const fs = require('fs');

function patchFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('PageSkeleton')) return;
  
  content = content.replace(
    "import { DetailHeader } from '../components/DetailHeader';",
    "import { DetailHeader } from '../components/DetailHeader';\nimport { PageSkeleton } from '../components/PageSkeleton';"
  );
  
  const loadingCheck = "if (loading) {";
  const loadingReplacement = `if (loading) return <PageSkeleton onBack={handleClose} />;`;
  
  if (content.includes(loadingCheck)) {
     // replace the block.
     const r = new RegExp("if \\(loading\\) \\{[^}]+\\}", "s");
     content = content.replace(r, loadingReplacement);
  } else {
     // or just find where loading is checked
     // in MomDetail, it might be: `if (loading) return <div...`
     const r = new RegExp("if \\(loading\\) return <div[^>]+>.*?</div\\s*>;", "s");
     if (content.match(r)) {
         content = content.replace(r, loadingReplacement);
     }
  }
  
  fs.writeFileSync(file, content);
}

['src/pages/CashAdvanceDetail.tsx', 'src/pages/LiquidationDetail.tsx', 'src/pages/MomDetail.tsx'].forEach(patchFile);
