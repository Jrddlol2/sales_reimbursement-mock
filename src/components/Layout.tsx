import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { UserRole } from '../types';
import { apiFetch } from '../lib/api';
import { Bell, LogOut, FileText, CheckSquare, Activity, Clock, Menu, ChevronRight } from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (user) {
      apiFetch('/api/outbox').then(data => {
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }).catch(console.error);
    }
  }, [user, location.pathname]);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: Activity, roles: [UserRole.REQUESTOR] },
    { label: 'Calendar', path: '/calendar', icon: Clock, roles: [UserRole.REQUESTOR, UserRole.APPROVER] },
    { label: 'Approval Queue', path: '/approvals', icon: CheckSquare, roles: [UserRole.APPROVER] },
    { label: 'Processing Queue', path: '/processing', icon: Clock, roles: [UserRole.CUSTODIAN] },
    { label: 'Audit Log', path: '/audit', icon: FileText, roles: [UserRole.ADMIN] },
    { label: 'System Emails', path: '/emails', icon: FileText, roles: [UserRole.ADMIN] },
    { label: 'Submit Claim', path: '/claims/new', icon: FileText, roles: [UserRole.REQUESTOR] },
    { label: 'Settings', path: '/settings', icon: FileText, roles: [UserRole.APPROVER, UserRole.ADMIN] },
  ];

  const visibleNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/calendar')) return 'Calendar';
    if (path.startsWith('/approvals')) return 'Approval Queue';
    if (path.startsWith('/processing')) return 'Processing Queue';
    if (path.startsWith('/audit')) return 'Audit Log';
    if (path.startsWith('/claims/new')) return 'Submit Claim';
    if (path.startsWith('/notifications')) return 'Notifications';
    return 'Home';
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row text-sm">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-[#F4F6F8] border-r border-gray-200 flex flex-col transition-all duration-200 shrink-0 z-20`}>
        <div className="h-14 flex items-center px-4 border-b border-gray-200 shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
            <Menu className="w-5 h-5" />
          </button>
          {sidebarOpen && <span className="ml-3 font-semibold text-gray-900 tracking-tight text-base">SalesReimb</span>}
        </div>
        
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!sidebarOpen ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded font-medium transition-colors ${
                  isActive 
                    ? 'bg-[#0095D5] text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center text-[13px] text-gray-500 font-medium">
             <span>SalesReimb</span>
             <ChevronRight className="w-4 h-4 mx-1" />
             <span className="text-gray-900">{getBreadcrumb()}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/notifications" className="text-gray-400 hover:text-[#0095D5] relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              )}
            </Link>
            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              <div className="text-right hidden sm:block leading-tight">
                <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                <div className="text-[11px] text-gray-500 uppercase tracking-wider">{user?.role}</div>
              </div>
              <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main scrollable content */}
        <main className="flex-1 overflow-auto bg-white p-6">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
