const fs = require('fs');
const file = 'src/pages/TransactionHistory.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('useSearchParams')) {
  content = content.replace(
    "import { useNavigate } from 'react-router-dom';",
    "import { useNavigate, useSearchParams } from 'react-router-dom';"
  );
}

if (!content.includes('const [searchParams]')) {
  content = content.replace(
    "const [selectedType, setSelectedType] = useState<'All' | 'Reimbursement' | 'Cash Advance' | 'Liquidation'>('All');",
    "const [searchParams] = useSearchParams();\n  const [selectedType, setSelectedType] = useState<'All' | 'Reimbursement' | 'Cash Advance' | 'Liquidation'>((searchParams.get('type') as any) || 'All');"
  );
  content = content.replace(
    "const [selectedStatus, setSelectedStatus] = useState<string>('All');",
    "const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'All');"
  );
}

fs.writeFileSync(file, content);
