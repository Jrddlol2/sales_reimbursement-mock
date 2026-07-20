import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../lib/api';
import { IS_DEMO_MODE } from '../utils';
import { User, UserRole, ApproverDelegation, DelegationStatus } from '../types';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { HistoricalImport } from "../components/HistoricalImport";
import { WarningOctagon, Check, X as XIcon } from '@phosphor-icons/react';
import { StatusBadge } from '../components/StatusBadge';

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

  const [delegations, setDelegations] = useState<ApproverDelegation[]>([]);
  const [delegationsLoading, setDelegationsLoading] = useState(true);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [respondingId, setRespondingId] = useState<string | null>(null);

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

  const fetchDelegations = () => {
    setDelegationsLoading(true);
    apiFetch('/api/delegations')
      .then(setDelegations)
      .catch(() => toast.error('Failed to load delegations.'))
      .finally(() => setDelegationsLoading(false));
  };

  useEffect(() => {
    apiFetch('/api/users').then(setUsers);
    if (user?.role === UserRole.APPROVER) {
      fetchDelegations();
    }
  }, [user]);

  if (user?.role !== UserRole.APPROVER && user?.role !== UserRole.ADMIN) {
    return <div className="p-8 text-center text-gray-500">Only Approvers and Admins have settings to configure.</div>;
  }

  
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
  
  const handleRequestDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateId) {
      toast.error('Choose who you want to delegate to.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates for delegation.');
      return;
    }
    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      toast.error('The delegation Start Date cannot be after the End Date.');
      return;
    }
    setLoading(true);
    setSuccess(false);
    try {
      await apiFetch('/api/delegations', {
        method: 'POST',
        body: JSON.stringify({ delegate_id: delegateId, start_date: startDate, end_date: endDate })
      });
      setSuccess(true);
      setDelegateId('');
      setStartDate('');
      setEndDate('');
      fetchDelegations();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send delegation request');
    }
    setLoading(false);
  };

  const handleAcceptDelegation = async (id: string) => {
    setRespondingId(id);
    try {
      await apiFetch(`/api/delegations/${id}/accept`, { method: 'POST' });
      toast.success('Delegation accepted. Claims will now route to you for that period.');
      fetchDelegations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept delegation');
    } finally {
      setRespondingId(null);
    }
  };

  const handleDeclineDelegation = async (id: string) => {
    setRespondingId(id);
    try {
      await apiFetch(`/api/delegations/${id}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason: declineReason || undefined })
      });
      toast.success('Delegation declined.');
      setDecliningId(null);
      setDeclineReason('');
      fetchDelegations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline delegation');
    } finally {
      setRespondingId(null);
    }
  };

  const handleCancelDelegation = async (delegation: ApproverDelegation) => {
    const ok = await confirmAction({
      title: 'Cancel this delegation?',
      message: delegation.status === DelegationStatus.ACTIVE
        ? `${delegation.delegate?.name || 'Your delegate'} is currently covering your approvals. Cancelling immediately reverts new claims back to you.`
        : `This will withdraw the pending request to ${delegation.delegate?.name || 'your delegate'}.`,
      confirmLabel: 'Yes, Cancel',
      cancelLabel: 'Never mind',
      tone: 'danger'
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/delegations/${delegation.id}/cancel`, { method: 'POST' });
      toast.success('Delegation cancelled.');
      fetchDelegations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel delegation');
    }
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

  // Requests where I'm the delegate being asked to cover someone else.
  const incomingPending = delegations.filter(d => d.delegate_id === user?.id && d.status === DelegationStatus.PENDING);
  // Delegations I've requested myself, as the approver - full history, newest first.
  const myDelegations = delegations.filter(d => d.approver_id === user?.id);

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
        <>
          {/* Incoming requests where I'm the one being asked to cover for
              someone else - shown first since responding to these is more
              time-sensitive than setting up my own delegation. */}
          {incomingPending.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-200">
                <h3 className="text-sm font-extrabold text-amber-900 font-display">Pending Delegation Requests ({incomingPending.length})</h3>
                <p className="text-xs text-amber-700 mt-0.5">Someone has asked you to cover their approvals. Nothing routes to you until you accept.</p>
              </div>
              <div className="divide-y divide-amber-200">
                {incomingPending.map(d => (
                  <div key={d.id} className="p-4 space-y-3">
                    <div className="text-xs text-amber-950">
                      <span className="font-bold">{d.approver?.name || 'An approver'}</span> wants you to cover their approvals from{' '}
                      <span className="font-bold">{d.start_date}</span> to <span className="font-bold">{d.end_date}</span>.
                    </div>
                    {decliningId === d.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={declineReason}
                          onChange={e => setDeclineReason(e.target.value)}
                          placeholder="Optional reason (e.g. I'm out that week too)..."
                          rows={2}
                          className="block w-full rounded border-amber-300 border p-2 text-xs focus:border-brand text-slate-900 bg-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeclineDelegation(d.id)}
                            disabled={respondingId === d.id}
                            className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded hover:bg-red-700 disabled:opacity-50 font-display"
                          >
                            Confirm Decline
                          </button>
                          <button
                            onClick={() => { setDecliningId(null); setDeclineReason(''); }}
                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded hover:bg-slate-50 font-display"
                          >
                            Back
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptDelegation(d.id)}
                          disabled={respondingId === d.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded hover:bg-emerald-700 disabled:opacity-50 font-display"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button
                          onClick={() => setDecliningId(d.id)}
                          disabled={respondingId === d.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded hover:bg-slate-50 disabled:opacity-50 font-display"
                        >
                          <XIcon className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-950 mb-1 font-display">Request a Delegation</h3>
            <p className="text-xs text-slate-600 mb-5">
              If you are on leave or unavailable, ask another Approver to cover your approval duties for a date range. They must accept before anything routes to them — your claims stay with you until they do.
            </p>

            <form onSubmit={handleRequestDelegation} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-display">Delegate To</label>
                <select
                  className="block w-full rounded border-slate-300 border p-2 text-xs focus:border-brand text-slate-900 bg-white"
                  value={delegateId}
                  onChange={e => setDelegateId(e.target.value)}
                >
                  <option value="">-- Choose an Approver --</option>
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
                  disabled={loading || !delegateId}
                  className="px-4 py-2 bg-brand text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-brand-hover transition-colors disabled:opacity-50 font-display shadow-sm"
                >
                  {loading ? 'Sending Request...' : 'Send Delegation Request'}
                </button>
                {success && <span className="text-green-600 text-xs font-bold">Request sent — waiting on their response.</span>}
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-950 mb-4 font-display">Your Delegations</h3>
            {delegationsLoading ? (
              <div className="animate-pulse h-10 w-full bg-slate-100 rounded"></div>
            ) : myDelegations.length === 0 ? (
              <p className="text-xs text-slate-400 italic">You haven't requested any delegations yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {myDelegations.map(d => (
                  <div key={d.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{d.delegate?.name || 'Unknown'}</span>
                        <StatusBadge status={d.status} size="sm" />
                      </div>
                      <div className="text-slate-500 mt-0.5">{d.start_date} to {d.end_date}</div>
                      {d.status === DelegationStatus.DECLINED && d.decline_reason && (
                        <div className="text-slate-400 italic mt-0.5">"{d.decline_reason}"</div>
                      )}
                    </div>
                    {(d.status === DelegationStatus.PENDING || d.status === DelegationStatus.ACTIVE) && (
                      <button
                        onClick={() => handleCancelDelegation(d)}
                        className="shrink-0 px-3 py-1.5 bg-white border border-red-200 text-red-700 text-[10px] font-bold uppercase tracking-wider rounded hover:bg-red-50 font-display"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {user.role === UserRole.ADMIN && IS_DEMO_MODE && (
        <>
        <div className="bg-white p-6 rounded border border-slate-200 shadow-sm space-y-6">
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

        {/* Danger Zone — kept on this page per design decision, but given its
            own card with heavy visual separation (spacing + full red border)
            so an irreversible, data-wiping action never reads at the same
            weight as the harmless demo/config controls above it. */}
        <div className="mt-10 pt-6 border-t-2 border-dashed border-red-200">
          <div className="bg-red-50 p-6 rounded border-2 border-red-300 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <WarningOctagon className="w-5 h-5 text-red-600" weight="fill" />
              <h3 className="text-base font-extrabold text-red-800 font-display uppercase tracking-wide">Danger Zone</h3>
            </div>
            <p className="text-xs text-red-700 mb-4">
              Reset the simulation to a clean slate — every Reimbursement claim, Cash Advance, Liquidation, MOM, approval, notification, and email is wiped, and delegations are cleared. The standard user roster stays in place so you can demo the workflow from scratch. <strong>This action is irreversible.</strong>
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={handleResetSimulation}
                disabled={resetting}
                className="px-4 py-2 bg-red-600 border border-red-600 text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm font-display"
              >
                {resetting ? 'Resetting...' : 'Reset Simulation'}
              </button>
              {resetSuccess && <span className="text-green-700 text-xs font-bold">Simulation reset successfully! Reloading...</span>}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
};
