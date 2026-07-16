const fs = require('fs');
let content = fs.readFileSync('src/components/Layout.tsx', 'utf-8');

// Update imports
content = content.replace(/import \{ (.*?) \} from '@phosphor-icons\/react';/, "import { $1, ShieldCheck, EnvelopeSimple, PlusCircle, Gear } from '@phosphor-icons/react';");

// Update icons
content = content.replace(
  /{ label: 'Audit Log', path: '\/audit', icon: FileText, roles: \[UserRole.ADMIN\] },/,
  "{ label: 'Audit Log', path: '/audit', icon: ShieldCheck, roles: [UserRole.ADMIN] },"
);
content = content.replace(
  /{ label: 'System Emails', path: '\/emails', icon: FileText, roles: \[UserRole.REQUESTOR, UserRole.APPROVER, UserRole.CUSTODIAN, UserRole.ADMIN\] },/,
  "{ label: 'System Emails', path: '/emails', icon: EnvelopeSimple, roles: [UserRole.REQUESTOR, UserRole.APPROVER, UserRole.CUSTODIAN, UserRole.ADMIN] },"
);
content = content.replace(
  /{ label: 'New Request', path: '\/claims\/new', icon: FileText, roles: \[UserRole.REQUESTOR, UserRole.APPROVER\] },/,
  "{ label: 'New Request', path: '/claims/new', icon: PlusCircle, roles: [UserRole.REQUESTOR, UserRole.APPROVER] },"
);
content = content.replace(
  /{ label: 'Settings', path: '\/settings', icon: FileText, roles: \[UserRole.APPROVER, UserRole.ADMIN\] },/,
  "{ label: 'Settings', path: '/settings', icon: Gear, roles: [UserRole.APPROVER, UserRole.ADMIN] },"
);

// Update logo
content = content.replace(/className="ml-3 h-6 object-contain"/, 'className="ml-3 h-9 object-contain"');

fs.writeFileSync('src/components/Layout.tsx', content);
