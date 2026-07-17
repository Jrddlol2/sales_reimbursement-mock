const fs = require('fs');
const file = 'src/pages/TransactionHistory.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('setSearchParams(')) {
  content = content.replace(
    "const [searchParams] = useSearchParams();",
    "const [searchParams, setSearchParams] = useSearchParams();"
  );
  
  content = content.replace(
    "setSelectedStatus(e.target.value);",
    "setSelectedStatus(e.target.value);\n                searchParams.set('status', e.target.value);\n                setSearchParams(searchParams);"
  );
  
  fs.writeFileSync(file, content);
}
