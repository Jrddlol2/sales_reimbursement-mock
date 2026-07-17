const fs = require('fs');

// 1. Layout.tsx
const layoutFile = 'src/components/Layout.tsx';
let layoutContent = fs.readFileSync(layoutFile, 'utf8');
if (!layoutContent.includes('/admin/reports')) {
  layoutContent = layoutContent.replace(
    "{ label: 'Dashboard', path: '/admin/dashboard', icon: ChartBar, group: 'SYSTEM', roles: [UserRole.ADMIN] },",
    "{ label: 'Dashboard', path: '/admin/dashboard', icon: ChartBar, group: 'SYSTEM', roles: [UserRole.ADMIN] },\n    { label: 'Reporting', path: '/admin/reports', icon: ChartBar, group: 'SYSTEM', roles: [UserRole.ADMIN] },"
  );
  layoutContent = layoutContent.replace(
    "if (path.startsWith('/admin/dashboard')) return 'System Administration';",
    "if (path.startsWith('/admin/dashboard')) return 'System Administration';\n    if (path.startsWith('/admin/reports')) return 'System Reporting';"
  );
  fs.writeFileSync(layoutFile, layoutContent);
}

// 2. App.tsx
const appFile = 'src/App.tsx';
let appContent = fs.readFileSync(appFile, 'utf8');
if (!appContent.includes('AdminReporting')) {
  appContent = appContent.replace(
    "import { Settings } from './pages/Settings';",
    "import { Settings } from './pages/Settings';\nimport { AdminReporting } from './pages/AdminReporting';"
  );
  appContent = appContent.replace(
    '<Route path="admin/dashboard" element={<AdminDashboard />} />',
    '<Route path="admin/dashboard" element={<AdminDashboard />} />\n                  <Route path="admin/reports" element={<AdminReporting />} />'
  );
  fs.writeFileSync(appFile, appContent);
}
