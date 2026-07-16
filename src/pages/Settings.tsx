import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../lib/api';
import { User, UserRole } from '../types';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [delegateId, setDelegateId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [seedingYear, setSeedingYear] = useState(false);
  const [seedYearSuccess, setSeedYearSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    apiFetch('/api/users').then(setUsers);
    if (user?.delegation) {
      setDelegateId(user.delegation.delegate_id);
      setStartDate(user.delegation.start_date.split('T')[0]);
      setEndDate(user.delegation.end_date.split('T')[0]);
    }
  }, [user]);

  if (user?.role !== UserRole.APPROVER && user?.role !== UserRole.ADMIN) {
    return <div className="p-8 text-center text-gray-500">Only Approvers and Admins have settings to configure.</div>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      if (delegateId) {
        if (!startDate || !endDate) {
          toast.error('Please select both start and end dates for delegation.');
          setLoading(false);
          return;
        }
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        if (start > end) {
          toast.error('The delegation Start Date cannot be after the End Date.');
          setLoading(false);
          return;
        }
      }
      await apiFetch('/api/settings/delegation', {
        method: 'PUT',
        body: JSON.stringify({
          delegate_id: delegateId || undefined,
          start_date: delegateId ? startDate : undefined,
          end_date: delegateId ? endDate : undefined
        })
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      toast.error('Failed to save settings');
    }
    setLoading(false);
  };

  const handleSeedData = async () => {
    const ok = await confirmAction({
      title: 'Generate mock data?',
      message: 'This will wipe all existing data and replace it with a fresh set of mock data.',
      confirmLabel: 'Generate Mock Data',
      tone: 'danger'
    });
    if (!ok) return;
    setSeeding(true);
    setSeedSuccess(false);
    try {
      await apiFetch('/api/admin/seed', { method: 'POST' });
      setSeedSuccess(true);
      setTimeout(() => {
        setSeedSuccess(false);
        window.location.reload();
      }, 2000);
    } catch (err) {
      toast.error('Failed to generate mock data');
    }
    setSeeding(false);
  };

  const handleSeedYearData = async () => {
    const ok = await confirmAction({
      title: 'Generate 1 Year of History?',
      message: 'This will wipe all existing data and backfill the database with a full 12 months of historical Claims, Cash Advances, and Liquidations across multiple departments.',
      confirmLabel: 'Generate 1 Year of History',
      tone: 'danger'
    });
    if (!ok) return;
    setSeedingYear(true);
    setSeedYearSuccess(false);
    try {
      await apiFetch('/api/admin/seed-year', { method: 'POST' });
      setSeedYearSuccess(true);
      setTimeout(() => {
        setSeedYearSuccess(false);
        window.location.reload();
      }, 2000);
    } catch (err) {
      toast.error('Failed to generate 1 year of historical data');
    }
    setSeedingYear(false);
  };

  const handleResetSimulation = async () => {
    const ok = await confirmAction({
      title: 'Reset the simulation?',
      message: 'This will permanently wipe every Reimbursement claim, Cash Advance, Liquidation, MOM, approval, notification, and email in the current session, and clear any delegations or reassignments. The standard user roster stays in place, but everything else starts from zero.',
      confirmLabel: 'Reset Simulation',
      tone: 'danger'
    });
    if (!ok) return;
    setResetting(true);
    setResetSuccess(false);
    try {
      await apiFetch('/api/admin/reset', { method: 'POST' });
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        window.location.reload();
      }, 2000);
    } catch (err) {
      toast.error('Failed to reset simulation');
    }
    setResetting(false);
  };

  const approverOptions = users.filter(u => u.role === UserRole.APPROVER && u.id !== user.id);

  const isApprover = user?.role === UserRole.APPROVER;
  const pageTitle = isApprover ? 'Approval Delegation' : 'Data Management';
  const pageDescription = isApprover
    ? 'Configure delegation of approval duties when you are on leave or unavailable.'
    : 'Manage mock simulation data, seed lifecycle records, or reset the system state.';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">{pageTitle}</h2>
        <p className="mt-1 text-xs text-slate-500">{pageDescription}</p>
      </div>

      {user.role === UserRole.APPROVER && (
        <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-950 mb-1 font-display">Approval Delegation</h3>
          <p className="text-xs text-slate-600 mb-5">
            If you are on leave or unavailable, you can delegate your approval duties to another Approver for a specified date range.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-display">Delegate To</label>
              <select
                className="block w-full rounded border-slate-300 border p-2 text-xs focus:border-brand text-slate-900 bg-white"
                value={delegateId}
                onChange={e => setDelegateId(e.target.value)}
              >
                <option value="">No Delegation (Clear)</option>
                {approverOptions.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {delegateId && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-display">Start Date</label>
                  <input
                    type="date"
                    required
                    className="block w-full rounded border-slate-300 border p-2 text-xs focus:border-brand text-slate-900 bg-white"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-display">End Date</label>
                  <input
                    type="date"
                    required
                    className="block w-full rounded border-slate-300 border p-2 text-xs focus:border-brand text-slate-900 bg-white"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-brand text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-brand-hover transition-colors disabled:opacity-50 font-display shadow-sm"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
              {success && <span className="text-green-600 text-xs font-bold">Settings saved successfully.</span>}
            </div>
          </form>
        </div>
      )}

      {user.role === UserRole.ADMIN && (
        <div className="bg-white p-6 rounded border border-slate-200 shadow-sm border-l-4 border-l-red-500 space-y-6">
          <h3 className="text-base font-extrabold text-slate-950 font-display">Data Management</h3>

          <div>
            <p className="text-xs text-slate-600 mb-3">
              Generate a full realistic dataset covering the entire Reimbursement, Cash Advance, and Liquidation lifecycle. Useful for demos and presentations.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSeedData}
                disabled={seeding || seedingYear}
                className="px-4 py-2 bg-slate-950 text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm font-display"
              >
                {seeding ? 'Generating Data...' : 'Generate Mock Data'}
              </button>
              <button
                onClick={handleSeedYearData}
                disabled={seeding || seedingYear}
                className="px-4 py-2 bg-slate-950 text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm font-display"
              >
                {seedingYear ? 'Generating History...' : 'Generate 1 Year of History'}
              </button>
              {seedSuccess && <span className="text-green-600 text-xs font-bold">Mock data generated successfully! Reloading...</span>}
              {seedYearSuccess && <span className="text-green-600 text-xs font-bold">1 Year of historical data generated! Reloading...</span>}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-600 mb-3">
              Reset the simulation to a clean slate — every Reimbursement claim, Cash Advance, Liquidation, MOM, approval, notification, and email is wiped, and delegations are cleared. The standard user roster stays in place so you can demo the workflow from scratch.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={handleResetSimulation}
                disabled={resetting}
                className="px-4 py-2 bg-white border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider rounded hover:bg-red-50 transition-colors disabled:opacity-50 shadow-sm font-display"
              >
                {resetting ? 'Resetting...' : 'Reset Simulation'}
              </button>
              {resetSuccess && <span className="text-green-600 text-xs font-bold">Simulation reset successfully! Reloading...</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
