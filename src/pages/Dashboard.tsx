import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../lib/api';
import { UserRole } from '../types';
import { RequestorDashboard } from '../components/dashboard/RequestorDashboard';
import { ApproverDashboard } from '../components/dashboard/ApproverDashboard';
import { CustodianDashboard } from '../components/dashboard/CustodianDashboard';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { DashboardPeriodProvider } from '../contexts/DashboardPeriodContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(false);

    apiFetch('/api/activity/seen', {
      method: 'POST',
      body: JSON.stringify({ section: 'dashboard' })
    }).catch(console.error);
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500 italic">Synchronizing your dashboard...</div>
      </div>
    );
  }

  return (
    <DashboardPeriodProvider>
      <div className="space-y-6" id={`${user.role.toLowerCase()}_dashboard`}>
        {user.role === UserRole.REQUESTOR && <RequestorDashboard user={user} />}
        {user.role === UserRole.APPROVER && <ApproverDashboard user={user} />}
        {user.role === UserRole.CUSTODIAN && <CustodianDashboard user={user} />}
        {user.role === UserRole.ADMIN && <AdminDashboard user={user} />}
      </div>
    </DashboardPeriodProvider>
  );
};
