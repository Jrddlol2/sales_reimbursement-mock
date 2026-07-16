const fs = require('fs');
let content = fs.readFileSync('src/components/Layout.tsx', 'utf8');

// 1. Update imports
content = content.replace(
  "import { Bell, SignOut, FileText, CheckSquare, Pulse, Clock, List, CaretRight, Tray, BookOpen, MagnifyingGlass, ShieldCheck, EnvelopeSimple, PlusCircle, Gear } from '@phosphor-icons/react';",
  "import { Bell, SignOut, CaretRight, MagnifyingGlass, SquaresFour, PlusCircle, Tray, ListChecks, ClipboardText, CalendarBlank, EnvelopeSimple, ShieldCheck, Gear, BookOpen } from '@phosphor-icons/react';"
);

// 2. Update navItems
content = content.replace(
  /export const navItems = \[[\s\S]*?\];/,
  `export const navItems = [
  { label: 'Dashboard', path: '/', icon: SquaresFour, group: 'PRIMARY', roles: [UserRole.REQUESTOR, UserRole.APPROVER, UserRole.CUSTODIAN, UserRole.ADMIN] },
  { label: 'New Request', path: '/claims/new', icon: PlusCircle, group: 'PRIMARY', roles: [UserRole.REQUESTOR, UserRole.APPROVER] },
  { label: 'My Inbox', path: '/approvals', icon: Tray, group: 'PRIMARY', roles: [UserRole.APPROVER] },
  { label: 'Processing Queue', path: '/processing', icon: ListChecks, group: 'PRIMARY', roles: [UserRole.CUSTODIAN] },
  { label: 'System Emails', path: '/emails', icon: EnvelopeSimple, group: 'COMMUNICATION', roles: [UserRole.REQUESTOR, UserRole.APPROVER, UserRole.CUSTODIAN, UserRole.ADMIN] },
  { label: 'Calendar', path: '/calendar', icon: CalendarBlank, group: 'PLANNING', roles: [UserRole.REQUESTOR, UserRole.APPROVER] },
  { label: 'Meeting Minutes (MOM)', path: '/moms', icon: ClipboardText, group: 'PLANNING', roles: [UserRole.REQUESTOR, UserRole.APPROVER] },
  { label: 'Audit Log', path: '/audit', icon: ShieldCheck, group: 'SYSTEM', roles: [UserRole.ADMIN] },
  { label: 'Settings', path: '/settings', icon: Gear, group: 'SYSTEM', roles: [UserRole.APPROVER, UserRole.ADMIN] },
  { label: 'Scenario Guide', path: '/scenarios', icon: BookOpen, group: 'RESOURCES', roles: [UserRole.REQUESTOR, UserRole.APPROVER, UserRole.CUSTODIAN, UserRole.ADMIN] },
];`
);

// 3. Update the rendering logic
const renderingOld = `        <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-3 custom-scrollbar">
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const section = sectionMap[item.label];
            const hasActivity = section ? !!activityStatus[section] : false;

            return (
              <Link
                key={item.path}
                to={item.path}
                title={!sidebarOpen ? item.label : undefined}
                className={\`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 relative group overflow-hidden \${
                  isActive 
                    ? 'bg-brand/10 text-brand shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }\`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand" />}
                <Icon className={\`w-5 h-5 shrink-0 transition-colors \${isActive ? 'text-brand' : 'text-slate-400 group-hover:text-slate-600'}\`} weight={isActive ? "fill" : "regular"} />
                {sidebarOpen ? (
                  <div className="flex-grow flex items-center justify-between min-w-0">
                    <span className="truncate text-sm">{item.label}</span>
                    {hasActivity && (
                      <span 
                        className="w-2 h-2 bg-red-500 rounded-full shrink-0 ml-1.5" 
                        id={\`nav_activity_dot_\${section}\`} 
                      />
                    )}
                  </div>
                ) : (
                  hasActivity && (
                    <span 
                      className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" 
                      id={\`nav_activity_dot_collapsed_\${section}\`} 
                    />
                  )
                )}
              </Link>
            );
          })}
        </nav>`;

const renderingNew = `        <nav className="flex-1 py-4 space-y-4 overflow-y-auto px-3 custom-scrollbar">
          {(() => {
            const groupedItems = visibleNavItems.reduce((acc, item) => {
              const group = (item as any).group || 'OTHER';
              if (!acc[group]) acc[group] = [];
              acc[group].push(item);
              return acc;
            }, {} as Record<string, typeof navItems[0][]>);

            const groupOrder = ['PRIMARY', 'COMMUNICATION', 'PLANNING', 'SYSTEM', 'RESOURCES', 'OTHER'];
            const activeGroups = groupOrder.filter(g => groupedItems[g] && groupedItems[g].length > 0);
            const showLabels = activeGroups.length > 1;

            return activeGroups.map(groupName => (
              <div key={groupName} className="space-y-1">
                {showLabels && sidebarOpen && (
                  <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {groupName}
                  </div>
                )}
                {groupedItems[groupName].map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const section = sectionMap[item.label];
                  const hasActivity = section ? !!activityStatus[section] : false;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={!sidebarOpen ? item.label : undefined}
                      className={\`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative group overflow-hidden \${
                        isActive 
                          ? 'bg-brand/10 text-brand shadow-sm font-semibold' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }\`}
                    >
                      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand" />}
                      <Icon className={\`w-5 h-5 shrink-0 transition-colors \${isActive ? 'text-brand' : 'text-slate-400 group-hover:text-slate-600'}\`} weight={isActive ? "fill" : "regular"} />
                      {sidebarOpen ? (
                        <div className="flex-grow flex items-center justify-between min-w-0">
                          <span className="truncate text-sm">{item.label}</span>
                          {hasActivity && (
                            <span 
                              className="w-2 h-2 bg-red-500 rounded-full shrink-0 ml-1.5" 
                              id={\`nav_activity_dot_\${section}\`} 
                            />
                          )}
                        </div>
                      ) : (
                        hasActivity && (
                          <span 
                            className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" 
                            id={\`nav_activity_dot_collapsed_\${section}\`} 
                          />
                        )
                      )}
                    </Link>
                  );
                })}
              </div>
            ));
          })()}
        </nav>`;

content = content.replace(renderingOld, renderingNew);

fs.writeFileSync('src/components/Layout.tsx', content);
