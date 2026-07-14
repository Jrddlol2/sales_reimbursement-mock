import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../lib/api';
import { User, UserRole } from '../types';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [delegateId, setDelegateId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

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
      if (delegateId && (!startDate || !endDate)) {
        alert('Please select both start and end dates for delegation.');
        setLoading(false);
        return;
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
      alert('Failed to save settings');
    }
    setLoading(false);
  };

  const handleSeedData = async () => {
    if (!window.confirm('WARNING: This will wipe all existing data and replace it with a fresh set of mock data. Are you sure you want to proceed?')) {
      return;
    }
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
      alert('Failed to generate mock data');
    }
    setSeeding(false);
  };

  const approverOptions = users.filter(u => u.role === UserRole.APPROVER && u.id !== user.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-medium text-gray-900 tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">Configure your preferences and system settings.</p>
      </div>

      {user.role === UserRole.APPROVER && (
        <div className="bg-white p-6 rounded border border-gray-200 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Delegation</h3>
          <p className="text-sm text-gray-600 mb-6">
            If you are on leave or unavailable, you can delegate your approval duties to another Approver for a specified date range.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delegate To</label>
              <select
                className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#0095D5] text-white text-sm font-medium rounded hover:bg-[#007AB0] focus:ring-2 focus:ring-offset-2 focus:ring-[#0095D5] transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
              {success && <span className="text-green-600 text-sm font-medium">Settings saved successfully.</span>}
            </div>
          </form>
        </div>
      )}

      {user.role === UserRole.ADMIN && (
        <div className="bg-white p-6 rounded border border-gray-200 shadow-sm border-l-4 border-l-red-500">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Data Management</h3>
          <p className="text-sm text-gray-600 mb-6">
            Generate a full realistic dataset covering the entire claim lifecycle. This is useful for demos and presentations.
          </p>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleSeedData}
              disabled={seeding}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors disabled:opacity-50 shadow-sm"
            >
              {seeding ? 'Generating Data...' : 'Generate Mock Data'}
            </button>
            {seedSuccess && <span className="text-green-600 text-sm font-medium">Mock data generated successfully! Reloading...</span>}
          </div>
        </div>
      )}
    </div>
  );
};
