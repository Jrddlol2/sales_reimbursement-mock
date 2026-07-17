const fs = require('fs');
const file = 'src/pages/ProcessingQueue.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('useSearchParams')) {
  content = content.replace(
    "import { Link } from 'react-router-dom';",
    "import { Link, useSearchParams } from 'react-router-dom';"
  );
}

if (!content.includes('const [searchParams]')) {
  content = content.replace(
    "const [tab, setTab] = useState<'queue' | 'history' | 'cadv'>('queue');",
    "const [searchParams] = useSearchParams();\n  const [tab, setTab] = useState<'queue' | 'history' | 'cadv'>((searchParams.get('tab') as any) || 'queue');"
  );
}

fs.writeFileSync(file, content);
