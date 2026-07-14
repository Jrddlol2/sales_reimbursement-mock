/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SubmitClaim } from './pages/SubmitClaim';
import { ApprovalQueue } from './pages/ApprovalQueue';
import { ProcessingQueue } from './pages/ProcessingQueue';
import { AuditLog } from './pages/AuditLog';
import { ClaimDetail } from './pages/ClaimDetail';
import { Calendar } from './pages/Calendar';
import { Settings } from './pages/Settings';
import { SystemEmails } from './pages/SystemEmails';
import { DebugRoleSwitcher } from './DebugRoleSwitcher';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="claims/new" element={<SubmitClaim />} />
            <Route path="claims/:id" element={<ClaimDetail />} />
            <Route path="approvals" element={<ApprovalQueue />} />
            <Route path="processing" element={<ProcessingQueue />} />
            <Route path="audit" element={<AuditLog />} />
            <Route path="notifications" element={<SystemEmails />} />
            <Route path="emails" element={<SystemEmails />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        <DebugRoleSwitcher />
      </BrowserRouter>
    </AuthProvider>
  );
}
