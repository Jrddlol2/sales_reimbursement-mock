const fs = require('fs');
const file = 'src/components/Layout.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('c.mom?.client')) {
  content = content.replace(
    "|| (c.custom_claim_code || '').toLowerCase().includes(q);",
    "|| (c.custom_claim_code || '').toLowerCase().includes(q)\n        || (c.mom?.client || '').toLowerCase().includes(q);"
  );
  
  content = content.replace(
    "|| reqDept.includes(q)\n        || (c.purpose || '').toLowerCase().includes(q)",
    "|| reqDept.includes(q)\n        || (c.purpose || '').toLowerCase().includes(q)\n        || (c.client || '').toLowerCase().includes(q)"
  );

  fs.writeFileSync(file, content);
}
