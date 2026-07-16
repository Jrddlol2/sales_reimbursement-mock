const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/MyRequestsCards.tsx', 'utf8');

content = content.replace(
  /        <KPICard \n          title="Rejected" \n          value=\{rejected - returned\} \n          icon=\{ReceiptX\} \n          variant="default"\n          description="Declined requests"\n        \/>/g,
  `        <KPICard 
          title="Rejected" 
          value={rejected - returned} 
          icon={ReceiptX} 
          variant="danger"
          description="Declined requests"
        />`
);

fs.writeFileSync('src/components/dashboard/MyRequestsCards.tsx', content);
