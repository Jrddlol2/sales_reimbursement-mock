import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { UserRole } from '../types';
import { apiFetch } from '../lib/api';
import { Bell, LogOut, FileText, CheckSquare, Activity, Clock, Menu, ChevronRight, Inbox, BookOpen, Search } from 'lucide-react';
import { formatPHP } from '../utils';

export const navItems = [
  { label: 'Dashboard', path: '/', icon: Activity, roles: [UserRole.REQUESTOR] },
  { label: 'Meeting Minutes (MOM)', path: '/moms', icon: FileText, roles: [UserRole.REQUESTOR, UserRole.APPROVER] },
  { label: 'Calendar', path: '/calendar', icon: Clock, roles: [UserRole.REQUESTOR, UserRole.APPROVER] },
  { label: 'My Inbox', path: '/approvals', icon: Inbox, roles: [UserRole.APPROVER] },
  { label: 'Processing Queue', path: '/processing', icon: Clock, roles: [UserRole.CUSTODIAN] },
  { label: 'Audit Log', path: '/audit', icon: FileText, roles: [UserRole.ADMIN] },
  { label: 'System Emails', path: '/emails', icon: FileText, roles: [UserRole.REQUESTOR, UserRole.APPROVER, UserRole.CUSTODIAN, UserRole.ADMIN] },
  { label: 'New Request', path: '/claims/new', icon: FileText, roles: [UserRole.REQUESTOR, UserRole.APPROVER] },
  { label: 'Settings', path: '/settings', icon: FileText, roles: [UserRole.APPROVER, UserRole.ADMIN] },
  { label: 'Scenario Guide', path: '/scenarios', icon: BookOpen, roles: [UserRole.REQUESTOR, UserRole.APPROVER, UserRole.CUSTODIAN, UserRole.ADMIN] },
];

const sectionMap: Record<string, string> = {
  'Calendar': 'calendar',
  'System Emails': 'emails',
  'My Inbox': 'inbox',
  'Processing Queue': 'processing',
  'Dashboard': 'dashboard'
};

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activityStatus, setActivityStatus] = useState<Record<string, boolean>>({});

  // Global search states
  const [searchQuery, setSearchQuery] = useState('');
  const [allClaims, setAllClaims] = useState<any[]>([]);
  const [allCadvs, setAllCadvs] = useState<any[]>([]);
  const [allLiqs, setAllLiqs] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    claims: any[];
    cadvs: any[];
    liqs: any[];
  }>({ claims: [], cadvs: [], liqs: [] });

  const handleSearchFocus = async () => {
    try {
      const [claimsData, cadvsData, liqsData, usersData] = await Promise.all([
        apiFetch('/api/claims'),
        apiFetch('/api/cash-advances'),
        apiFetch('/api/liquidations'),
        apiFetch('/api/users')
      ]);
      setAllClaims(claimsData);
      setAllCadvs(cadvsData);
      setAllLiqs(liqsData);
      setAllUsers(usersData);
    } catch (err) {
      console.error('Error prefetching search data:', err);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ claims: [], cadvs: [], liqs: [] });
      return;
    }

    const q = searchQuery.toLowerCase();

    // Helper to get requestor name
    const getRequestorName = (record: any) => {
      const reqId = record.requestorId || record.requestor_id;
      if (record.requestor?.name) return record.requestor.name;
      const found = allUsers.find(u => u.id === reqId);
      return found ? found.name : '';
    };

    // Filter Claims
    const filteredClaims = allClaims.filter(c => {
      const claimNo = `REIM-${c.id.substring(0, 6)}`.toLowerCase();
      const reqName = getRequestorName(c).toLowerCase();
      const amount = String(c.total_amount);
      const purpose = (c.expense_category || '').toLowerCase();
      const description = (c.notes || '').toLowerCase();
      return (
        claimNo.includes(q) ||
        reqName.includes(q) ||
        amount.includes(q) ||
        purpose.includes(q) ||
        description.includes(q)
      );
    });

    // Filter CADVs
    const filteredCadvs = allCadvs.filter(ca => {
      const cadvNo = `CADV-${ca.id.substring(0, 6)}`.toLowerCase();
      const reqName = getRequestorName(ca).toLowerCase();
      const amount = String(ca.amount);
      const purpose = (ca.purpose || '').toLowerCase();
      return (
        cadvNo.includes(q) ||
        reqName.includes(q) ||
        amount.includes(q) ||
        purpose.includes(q)
      );
    });

    // Filter LIQs
    const filteredLiqs = allLiqs.filter(l => {
      const liqNo = `LIQ-${l.id.substring(0, 6)}`.toLowerCase();
      const reqName = getRequestorName(l).toLowerCase();
      const totalSpent = String(l.totalSpent);
      const variance = String(Math.abs(l.varianceAmount || 0));
      return (
        liqNo.includes(q) ||
        reqName.includes(q) ||
        totalSpent.includes(q) ||
        variance.includes(q)
      );
    });

    setSearchResults({
      claims: filteredClaims.slice(0, 5),
      cadvs: filteredCadvs.slice(0, 5),
      liqs: filteredLiqs.slice(0, 5)
    });
  }, [searchQuery, allClaims, allCadvs, allLiqs, allUsers]);

  useEffect(() => {
    if (user) {
      apiFetch('/api/outbox').then(data => {
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }).catch(console.error);

      apiFetch('/api/activity/status').then(data => {
        setActivityStatus(data || {});
      }).catch(console.error);
    }
  }, [user, location.pathname]);

  const visibleNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/calendar')) return 'Calendar';
    if (path.startsWith('/approvals')) return 'My Inbox';
    if (path.startsWith('/processing')) return 'Processing Queue';
    if (path.startsWith('/audit')) return 'Audit Log';
    if (path.startsWith('/moms')) return 'Meeting Minutes (MOM)';
    if (path.startsWith('/claims/new')) return 'New Request';
    if (path.startsWith('/scenarios')) return 'Scenario Guide';
    if (path.startsWith('/notifications')) return 'Notifications';
    return 'Home';
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row text-sm">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 shrink-0 z-20`}>
        <div className="h-14 flex items-center px-4 border-b border-gray-200 shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
            <Menu className="w-5 h-5" />
          </button>
          {sidebarOpen && <img src="/logo.png" alt="Microgenesis Logo" className="ml-3 h-6 object-contain" />}
        </div>
        
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">
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
                className={`flex items-center gap-3 px-3 py-2 rounded font-medium transition-colors relative ${
                  isActive 
                    ? 'bg-brand-active text-brand font-bold shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {sidebarOpen ? (
                  <div className="flex-grow flex items-center justify-between min-w-0">
                    <span className="truncate">{item.label}</span>
                    {hasActivity && (
                      <span 
                        className="w-2 h-2 bg-red-500 rounded-full shrink-0 ml-1.5" 
                        id={`nav_activity_dot_${section}`} 
                      />
                    )}
                  </div>
                ) : (
                  hasActivity && (
                    <span 
                      className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" 
                      id={`nav_activity_dot_collapsed_${section}`} 
                    />
                  )
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-brand flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center text-[13px] text-blue-100 font-medium">
             <span>Microgenesis</span>
             <ChevronRight className="w-4 h-4 mx-1 opacity-70" />
             <span className="text-white">{getBreadcrumb()}</span>
          </div>

          {/* Global Search Component */}
          <div className="flex-1 max-w-md mx-4 relative hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search requests (ID, claimant, purpose, amount)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { handleSearchFocus(); setIsSearching(true); }}
                className="w-full bg-[#1e40af] hover:bg-[#1e3a8a] text-white placeholder-blue-200 text-xs px-3 py-1.5 pl-8 rounded border border-transparent focus:bg-white focus:text-slate-900 focus:placeholder-slate-400 focus:outline-none transition-all"
                id="global_search_input"
              />
              <Search className="w-3.5 h-3.5 text-blue-200 absolute left-2.5 top-2" />
            </div>

            {/* Results dropdown */}
            {isSearching && searchQuery.trim() && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSearching(false)} id="search_overlay_dismiss" />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-[350px] overflow-y-auto z-50 text-slate-800" id="global_search_results_container">
                  {searchResults.claims.length === 0 && searchResults.cadvs.length === 0 && searchResults.liqs.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 italic">No matching requests found.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {searchResults.claims.length > 0 && (
                        <div className="p-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-1">Reimbursements</span>
                          {searchResults.claims.map(c => (
                            <button
                              key={c.id}
                              onClick={() => { navigate(`/claims/${c.id}`); setSearchQuery(''); setIsSearching(false); }}
                              className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded flex justify-between items-center"
                              id={`search_result_reim_${c.id}`}
                            >
                              <div>
                                <span className="font-bold text-brand block">REIM-{c.id.substring(0, 6).toUpperCase()}</span>
                                <span className="text-slate-500 font-semibold">{c.notes || c.expense_category}</span>
                              </div>
                              <span className="font-extrabold text-slate-950">{formatPHP(c.total_amount)}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.cadvs.length > 0 && (
                        <div className="p-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-1">Cash Advances</span>
                          {searchResults.cadvs.map(ca => (
                            <button
                              key={ca.id}
                              onClick={() => { navigate(`/cash-advances/${ca.id}`); setSearchQuery(''); setIsSearching(false); }}
                              className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded flex justify-between items-center"
                              id={`search_result_cadv_${ca.id}`}
                            >
                              <div>
                                <span className="font-bold text-indigo-700 block">CADV-{ca.id.substring(0, 6).toUpperCase()}</span>
                                <span className="text-slate-500 font-semibold truncate max-w-[200px] block">{ca.purpose}</span>
                              </div>
                              <span className="font-extrabold text-slate-950">{formatPHP(ca.amount)}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.liqs.length > 0 && (
                        <div className="p-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-1">Liquidations</span>
                          {searchResults.liqs.map(l => (
                            <button
                              key={l.id}
                              onClick={() => { navigate(`/liquidations/${l.id}`); setSearchQuery(''); setIsSearching(false); }}
                              className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded flex justify-between items-center"
                              id={`search_result_liq_${l.id}`}
                            >
                              <div>
                                <span className="font-bold text-emerald-700 block">LIQ-{l.id.substring(0, 6).toUpperCase()}</span>
                                <span className="text-slate-500 font-semibold block">
                                  {l.varianceAmount === 0 ? 'Settled' : l.varianceAmount < 0 ? 'Refund Due' : 'Reimbursement Due'}
                                </span>
                              </div>
                              <span className="font-extrabold text-slate-950">{formatPHP(l.totalSpent)} spent</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/notifications" className="text-blue-100 hover:text-white relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-brand"></span>
              )}
            </Link>
            <div className="flex items-center gap-3 border-l border-brand-hover pl-4">
              <div className="text-right hidden sm:block leading-tight">
                <div className="text-sm font-medium text-white">{user?.name}</div>
                <div className="text-[11px] text-blue-100 uppercase tracking-wider">
                  {user?.job_title ? `${user.job_title} · ${user.role}` : user?.role}
                </div>
              </div>
              <button onClick={handleLogout} className="p-1.5 text-blue-100 hover:text-white transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main scrollable content */}
        <main className="flex-1 overflow-auto bg-[#FDFDFE] p-6">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
