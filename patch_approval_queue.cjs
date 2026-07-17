const fs = require('fs');
const file = 'src/pages/ApprovalQueue.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('useSearchParams')) {
  content = content.replace(
    "import { Link } from 'react-router-dom';",
    "import { Link, useSearchParams } from 'react-router-dom';"
  );
}

if (!content.includes('const [searchParams]')) {
  content = content.replace(
    "const [tab, setTab] = useState<'inbox' | 'meetings' | 'history' | 'cadv'>('inbox');",
    "const [searchParams] = useSearchParams();\n  const [tab, setTab] = useState<'inbox' | 'meetings' | 'history' | 'cadv'>((searchParams.get('tab') as any) || 'inbox');"
  );
}

fs.writeFileSync(file, content);
