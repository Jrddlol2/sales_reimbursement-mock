import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../lib/api';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';
import { CashAdvanceLiquidationSection } from '../components/CashAdvanceLiquidationSection';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (user.role === UserRole.APPROVER) navigate('/approvals');
    if (user.role === UserRole.CUSTODIAN) navigate('/processing');
    if (user.role === UserRole.ADMIN) navigate('/audit');
    setLoading(false);

    apiFetch('/api/activity/seen', {
      method: 'POST',
      body: JSON.stringify({ section: 'dashboard' })
    }).catch(console.error);
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500 italic">Synchronizing your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="requestor_dashboard">
      <div className="border-b border-slate-100 pb-2">
        <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">
          Unified Requests Workspace
        </h2>
        <p className="text-xs text-slate-500">
          A single pane of glass to initiate, track, and manage all your corporate Reimbursements, Cash Advances, and Liquidations.
        </p>
      </div>

      <CashAdvanceLiquidationSection />
    </div>
  );
};
