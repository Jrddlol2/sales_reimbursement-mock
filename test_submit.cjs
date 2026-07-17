const fs = require('fs');
const file = 'src/pages/SubmitClaim.tsx';
let content = fs.readFileSync(file, 'utf8');
console.log(content.includes('useSearchParams'));
