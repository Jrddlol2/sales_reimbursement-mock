/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmModal';
import { Layout, navItems } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SubmitClaim } from './pages/SubmitClaim';
import { ApprovalQueue } from './pages/ApprovalQueue';
import { ProcessingQueue } from './pages/ProcessingQueue';
import { AuditLog } from './pages/AuditLog';
import { ClaimDetail } from './pages/ClaimDetail';
import { CashAdvanceDetail } from './pages/CashAdvanceDetail';
import { LiquidationDetail } from './pages/LiquidationDetail';
import { Calendar } from './pages/Calendar';
import { Settings } from './pages/Settings';
import { SystemEmails } from './pages/SystemEmails';
import { Moms } from './pages/Moms';
import { ScenarioGuide } from './pages/ScenarioGuide';
import { DebugRoleSwitcher } from './DebugRoleSwitcher';
import { UserRole } from './types';

const roleHomePages: Record<UserRole, string> = {
  [UserRole.REQUESTOR]: '/',
  [UserRole.APPROVER]: '/approvals',
  [UserRole.CUSTODIAN]: '/processing',
  [UserRole.ADMIN]: '/audit',
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const pathname = location.pathname;
  const path = pathname.replace(/\/$/, '') || '/';

  let allowed = true;

  // 1. Check for notifications - allowed for all roles to view their email inbox/system emails
  if (path === '/notifications') {
    allowed = true;
  }
  // 2. Check for claim details: "/claims/:id" (but not /claims/new), "/cash-advances/:id", "/liquidations/:id"
  else if (
    (path.startsWith('/claims/') && path !== '/claims/new') || 
    path.startsWith('/cash-advances/') || 
    path.startsWith('/liquidations/')
  ) {
    if (path.endsWith('/resubmit')) {
      allowed = (user.role === UserRole.REQUESTOR);
    } else {
      allowed = [UserRole.REQUESTOR, UserRole.APPROVER, UserRole.CUSTODIAN, UserRole.ADMIN].includes(user.role);
    }
  }
  // 3. Match against exported navItems from Layout.tsx
  else {
    const navItem = navItems.find(item => {
      const itemPath = item.path.replace(/\/$/, '') || '/';
      return itemPath === path;
    });

    if (navItem) {
      allowed = navItem.roles.includes(user.role);
    }
  }

  if (!allowed) {
    const homePage = roleHomePages[user.role] || '/';
    return <Navigate to={homePage} replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="claims/new" element={<SubmitClaim />} />
                <Route path="claims/:id/resubmit" element={<SubmitClaim />} />
                <Route path="claims/:id" element={<ClaimDetail />} />
                <Route path="cash-advances/:id" element={<CashAdvanceDetail />} />
                <Route path="liquidations/:id" element={<LiquidationDetail />} />
                <Route path="approvals" element={<ApprovalQueue />} />
                <Route path="processing" element={<ProcessingQueue />} />
                <Route path="audit" element={<AuditLog />} />
                <Route path="notifications" element={<SystemEmails />} />
                <Route path="emails" element={<SystemEmails />} />
                <Route path="moms" element={<Moms />} />
                <Route path="settings" element={<Settings />} />
                <Route path="scenarios" element={<ScenarioGuide />} />
              </Route>
            </Routes>
            <DebugRoleSwitcher />
          </BrowserRouter>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
