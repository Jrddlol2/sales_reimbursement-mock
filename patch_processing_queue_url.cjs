const fs = require('fs');
const file = 'src/pages/ProcessingQueue.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('setSearchParams(')) {
  content = content.replace(
    "const [searchParams] = useSearchParams();",
    "const [searchParams, setSearchParams] = useSearchParams();"
  );
  
  content = content.replace(
    "onClick={() => setTab('queue')}",
    "onClick={() => { setTab('queue'); searchParams.set('tab', 'queue'); setSearchParams(searchParams); }}"
  );
  content = content.replace(
    "onClick={() => setTab('history')}",
    "onClick={() => { setTab('history'); searchParams.set('tab', 'history'); setSearchParams(searchParams); }}"
  );
  content = content.replace(
    "onClick={() => setTab('cadv')}",
    "onClick={() => { setTab('cadv'); searchParams.set('tab', 'cadv'); setSearchParams(searchParams); }}"
  );
  
  fs.writeFileSync(file, content);
}
