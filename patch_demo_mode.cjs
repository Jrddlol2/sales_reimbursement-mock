const fs = require('fs');

const utilsFile = 'src/utils.ts';
let utilsContent = fs.readFileSync(utilsFile, 'utf8');
if (!utilsContent.includes('IS_DEMO_MODE')) {
  utilsContent += "\nexport const IS_DEMO_MODE = import.meta.env.VITE_IS_DEMO_MODE !== 'false';\n";
  fs.writeFileSync(utilsFile, utilsContent);
}

const layoutFile = 'src/components/Layout.tsx';
let layoutContent = fs.readFileSync(layoutFile, 'utf8');
if (!layoutContent.includes('IS_DEMO_MODE')) {
  layoutContent = layoutContent.replace(
    "import { getClaimNumber } from '../utils';",
    "import { getClaimNumber, IS_DEMO_MODE } from '../utils';"
  );
  layoutContent = layoutContent.replace(
    "{ label: 'Scenario Guide', path: '/scenarios', icon: BookOpen, group: 'RESOURCES', roles: [UserRole.REQUESTOR, UserRole.APPROVER, UserRole.CUSTODIAN, UserRole.ADMIN] },",
    "IS_DEMO_MODE ? { label: 'Scenario Guide', path: '/scenarios', icon: BookOpen, group: 'RESOURCES', roles: [UserRole.REQUESTOR, UserRole.APPROVER, UserRole.CUSTODIAN, UserRole.ADMIN] } : null,"
  );
  layoutContent = layoutContent.replace(
    /const navItems = \[\s*([\s\S]*?)\s*\];/,
    "const navItems = [\n    $1\n  ].filter(Boolean) as any[];"
  );
  fs.writeFileSync(layoutFile, layoutContent);
}

const settingsFile = 'src/pages/Settings.tsx';
let settingsContent = fs.readFileSync(settingsFile, 'utf8');
if (!settingsContent.includes('IS_DEMO_MODE')) {
  settingsContent = settingsContent.replace(
    "import { formatPHP } from '../utils';",
    "import { formatPHP, IS_DEMO_MODE } from '../utils';"
  );
  if (!settingsContent.includes("import { formatPHP, IS_DEMO_MODE } from '../utils';")) {
     // try another way
     settingsContent = settingsContent.replace(
        "import { apiFetch } from '../lib/api';",
        "import { apiFetch } from '../lib/api';\nimport { IS_DEMO_MODE } from '../utils';"
     );
  }
  
  // Gate the data management section
  settingsContent = settingsContent.replace(
    "{user.role === UserRole.ADMIN && (",
    "{user.role === UserRole.ADMIN && IS_DEMO_MODE && ("
  );
  
  fs.writeFileSync(settingsFile, settingsContent);
}
