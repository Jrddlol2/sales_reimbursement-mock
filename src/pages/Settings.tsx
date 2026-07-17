import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../lib/api';
import { IS_DEMO_MODE } from '../utils';
import { User, UserRole } from '../types';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { HistoricalImport } from "../components/HistoricalImport";

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
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [highValueThreshold, setHighValueThreshold] = useState<number>(15000);
  const [newCategory, setNewCategory] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(true);
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

  
  const handleTriggerReminders = async () => {
    try {
      const res = await apiFetch('/api/jobs/reminders', { method: 'POST' });
      toast.success(`${res.message}`);
    } catch (err: any) {
      toast.error('Failed to trigger reminders: ' + err.message);
    }
  };


  useEffect(() => {
    if (user.role === UserRole.ADMIN) {
      apiFetch('/api/admin/settings').then(data => {
        if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
        if (typeof data.highValueThreshold === 'number') setHighValueThreshold(data.highValueThreshold);
        setSettingsLoading(false);
      }).catch(err => {
        console.error(err);
        setSettingsLoading(false);
      });
    } else {
      setSettingsLoading(false);
    }
  }, [user]);


  const handleSaveThreshold = async () => {
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ expenseCategories, highValueThreshold })
      });
      toast.success('High-value threshold updated successfully');
    } catch (err) {
      toast.error('Failed to update threshold');
    }
  };
  
  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (expenseCategories.includes(newCategory.trim())) {
      toast.error('Category already exists');
      return;
    }
    const newCats = [...expenseCategories, newCategory.trim()];
    setExpenseCategories(newCats);
    setNewCategory('');
    saveSettings(newCats);
  };

  const handleRemoveCategory = (cat: string) => {
    const newCats = expenseCategories.filter(c => c !== cat);
    setExpenseCategories(newCats);
    saveSettings(newCats);
  };

  const saveSettings = async (cats: string[]) => {
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ expenseCategories: cats, highValueThreshold })
      });
      toast.success('Categories updated successfully');
    } catch (err) {
      toast.error('Failed to update settings');
    }
  };
  
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

      {user.role === UserRole.ADMIN && IS_DEMO_MODE && (
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
              <button
                onClick={handleTriggerReminders}
                className="px-4 py-2 bg-slate-950 text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-slate-800 transition-colors shadow-sm font-display"
              >
                Trigger Overdue Reminders
              </button>

              {seedSuccess && <span className="text-green-600 text-xs font-bold">Mock data generated successfully! Reloading...</span>}
              {seedYearSuccess && <span className="text-green-600 text-xs font-bold">1 Year of historical data generated! Reloading...</span>}
            <HistoricalImport />
            </div>
          </div>

          {/* Settings Section */}
          <div className="pt-6 border-t border-slate-200 mt-6">
            <h4 className="text-sm font-extrabold text-slate-950 font-display mb-2">Expense Categories</h4>
            <p className="text-xs text-slate-600 mb-4">
              Manage the list of allowed expense categories for reimbursement claims.
            </p>
            {settingsLoading ? (
               <div className="animate-pulse h-10 w-full bg-slate-100 rounded"></div>
            ) : (
               <div className="space-y-4">
                 <div className="flex gap-2">
                   <input
                     type="text"
                     value={newCategory}
                     onChange={e => setNewCategory(e.target.value)}
                     placeholder="New category name"
                     className="flex-1 rounded border-slate-300 border p-2 text-xs focus:border-brand text-slate-900 bg-white"
                     onKeyDown={e => {
                       if (e.key === 'Enter') {
                         e.preventDefault();
                         handleAddCategory();
                       }
                     }}
                   />
                   <button
                     onClick={handleAddCategory}
                     className="px-4 py-2 bg-brand text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-brand-hover transition-colors shadow-sm font-display"
                   >
                     Add
                   </button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {expenseCategories.map(cat => (
                     <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                       {cat}
                       <button onClick={() => handleRemoveCategory(cat)} className="text-slate-400 hover:text-red-500 transition-colors">
                         &times;
                       </button>
                     </span>
                   ))}
                 </div>
               </div>
            )}
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

          {/* Threshold Section */}
          <div className="pt-6 border-t border-slate-200 mt-6">
            <h4 className="text-sm font-extrabold text-slate-950 font-display mb-2">High-Value Claim Threshold</h4>
            <p className="text-xs text-slate-600 mb-4">
              Claims with single line items exceeding this amount will be flagged as high-value for Approvers.
            </p>
            {settingsLoading ? (
               <div className="animate-pulse h-10 w-full bg-slate-100 rounded"></div>
            ) : (
               <div className="flex gap-2 max-w-sm">
                 <div className="relative flex-1">
                   <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                     <span className="text-slate-500 sm:text-xs">₱</span>
                   </div>
                   <input
                     type="number"
                     value={highValueThreshold}
                     onChange={e => setHighValueThreshold(parseInt(e.target.value) || 0)}
                     className="block w-full rounded border-slate-300 border py-2 pl-7 pr-12 text-xs focus:border-brand text-slate-900 bg-white"
                   />
                 </div>
                 <button
                   onClick={handleSaveThreshold}
                   className="px-4 py-2 bg-brand text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-brand-hover transition-colors shadow-sm font-display"
                 >
                   Save
                 </button>
               </div>
            )}
          </div>
  
        </div>
      )}
    </div>
  );
};
