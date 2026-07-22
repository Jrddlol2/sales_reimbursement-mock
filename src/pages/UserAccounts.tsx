import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { User, UserRole } from '../types';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { Pencil, X, Check, ArrowsClockwise, MagnifyingGlass } from '@phosphor-icons/react';
import { Pagination, usePagination } from '../components/Pagination';
import { EmptyState } from '../components/EmptyState';

interface EditState {
  role: UserRole;
  department: string;
  job_title: string;
  reports_to: string;
  employment_status: 'Active' | 'Inactive';
  can_approve_reimbursements: boolean;
}

// Walks the (pre-change) reporting chain upward from candidateManagerId; if it
// ever reaches userId, assigning candidateManagerId as userId's manager would
// close a loop. Mirrors the same check server-side (PUT /api/users/:id) so the
// dropdown never even offers an option the backend would reject.
const wouldCreateCycle = (allUsers: User[], userId: string, candidateManagerId: string): boolean => {
  if (candidateManagerId === userId) return true;
  let currentId: string | null = candidateManagerId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === userId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);
    const currentUser = allUsers.find(u => u.id === currentId);
    currentId = currentUser?.reports_to ?? null;
  }
  return false;
};

export const UserAccounts: React.FC = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [runningFallback, setRunningFallback] = useState(false);

  // Filters — role and department are the two explicit asks; search covers
  // "etc." (name/email/job title) without needing a filter per field.
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');

  const fetchUsers = () => {
    setLoading(true);
    apiFetch('/api/users').then(data => {
      setUsers(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getManagerName = (id: string | null) => {
    if (!id) return '—';
    return users.find(u => u.id === id)?.name || id;
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setEditState({
      role: u.role,
      department: u.department,
      job_title: u.job_title || '',
      reports_to: u.reports_to || '',
      employment_status: u.employment_status || 'Active',
      can_approve_reimbursements: u.can_approve_reimbursements ?? false
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(null);
  };

  const submitUpdate = async (u: User, confirmOrphan?: boolean) => {
    if (!editState) return;
    setSaving(true);
    try {
      const payload: any = {
        role: editState.role,
        department: editState.department,
        job_title: editState.job_title,
        reports_to: editState.reports_to || null,
        employment_status: editState.employment_status,
        can_approve_reimbursements: editState.can_approve_reimbursements
      };
      if (confirmOrphan) payload.confirmOrphan = true;

      // Raw fetch (not apiFetch) so a 409 orphan-warning response's full body
      // (message + reportees), not just its `error` field, is available here.
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();

      if (res.status === 409 && body.error === 'orphan_warning') {
        const ok = await confirmAction({
          title: 'Orphaned Direct Reports',
          message: body.message || 'This user still has direct reports who will be left without a valid approver. Proceed anyway?',
          confirmLabel: 'Proceed Anyway',
          cancelLabel: 'Cancel',
          tone: 'danger'
        });
        if (ok) {
          await submitUpdate(u, true);
        }
        return;
      }

      if (!res.ok) {
        toast.error(body.error || 'Failed to update user.');
        return;
      }

      toast.success(`${u.name}'s account was updated.`);
      cancelEdit();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  const runFallbackCheck = async () => {
    setRunningFallback(true);
    try {
      // force:true so the 7-day escalation is demoable now instead of
      // requiring 7 real days to pass — see docs/hierarchy-sync-design.md §5.
      const result = await apiFetch('/api/admin/run-fallback-check', {
        method: 'POST',
        body: JSON.stringify({ force: true })
      });
      if (result.escalatedCount > 0) {
        toast.success(`Escalated ${result.escalatedCount} stuck claim${result.escalatedCount > 1 ? 's' : ''} to Admin.`);
      } else {
        toast.success('No claims currently need escalation.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to run fallback check.');
    } finally {
      setRunningFallback(false);
    }
  };

  const departments = Array.from(new Set(users.map(u => u.department).filter(Boolean))).sort();

  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'All' && u.role !== roleFilter) return false;
    if (departmentFilter !== 'All' && u.department !== departmentFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const haystack = `${u.name} ${u.email} ${u.job_title || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const filtersActive = roleFilter !== 'All' || departmentFilter !== 'All' || searchQuery.trim() !== '';
  const clearFilters = () => { setRoleFilter('All'); setDepartmentFilter('All'); setSearchQuery(''); };

  const { currentPage, setPage, totalPages, paginatedItems: paginatedUsers, totalItems } = usePagination(filteredUsers, 25);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-7 w-48 bg-slate-200 rounded-md mb-2"></div>
          <div className="h-4 w-96 bg-slate-100 rounded-md"></div>
        </div>
        <div className="corp-card flex flex-col overflow-hidden animate-pulse">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
          </div>
          <div className="p-4 space-y-4">
            <div className="h-8 bg-slate-100 rounded-md w-full"></div>
            <div className="h-12 bg-slate-50 rounded-md w-full"></div>
            <div className="h-12 bg-slate-50 rounded-md w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">User Accounts</h2>
          <p className="mt-1 text-xs text-slate-500">Manage every user's role, department, job title, and reporting hierarchy. Editing "Reports To" here simulates an Entra ID org-chart sync — see <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">docs/hierarchy-sync-design.md</code>.</p>
        </div>
        <button
          onClick={runFallbackCheck}
          disabled={runningFallback}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded border border-slate-300 bg-white disabled:opacity-50 shrink-0"
          title="Simulates the daily cron that escalates unresolved org-change approver notices to Admin after 7 days"
        >
          <ArrowsClockwise className={`w-3.5 h-3.5 ${runningFallback ? 'animate-spin' : ''}`} /> Run Fallback Check
        </button>
      </div>

      <div className="corp-card p-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1 min-w-[180px]">
          <MagnifyingGlass className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search name, email, or job title..."
            className="w-full border border-gray-300 rounded pl-8 pr-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as UserRole | 'All')}
          className="border border-gray-300 rounded px-2.5 py-1.5 text-xs bg-white"
        >
          <option value="All">All Roles</option>
          {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={departmentFilter}
          onChange={e => setDepartmentFilter(e.target.value)}
          className="border border-gray-300 rounded px-2.5 py-1.5 text-xs bg-white"
        >
          <option value="All">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {filtersActive && (
          <button
            onClick={clearFilters}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1.5 shrink-0"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="corp-card flex flex-col overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-2">
            <div className="w-1 h-3 bg-brand rounded-full"></div>
            {filtersActive ? `${filteredUsers.length} of ${users.length} Users` : `All Users (${users.length})`}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Name</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Email</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Role</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Department</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Job Title</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Reports To</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Employment</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Can Approve</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-4">
                    <EmptyState icon={MagnifyingGlass} title="No users match the current filters" />
                  </td>
                </tr>
              )}
              {paginatedUsers.map(u => {
                const isEditing = editingId === u.id;
                const isSelf = currentUser?.id === u.id;

                const validManagerOptions = users.filter(candidate =>
                  candidate.id !== u.id && !wouldCreateCycle(users, u.id, candidate.id)
                );

                return (
                  <React.Fragment key={u.id}>
                    <tr className="hover:bg-brand/5 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm font-bold text-gray-950">
                        {u.name} {isSelf && <span className="text-[10px] font-semibold text-slate-400 uppercase ml-1">(You)</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">{u.email}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs font-semibold text-gray-800">{u.role}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">{u.department}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">{u.job_title || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">{getManagerName(u.reports_to)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.employment_status === 'Inactive' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {u.employment_status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.can_approve_reimbursements ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-500'}`}>
                          {u.can_approve_reimbursements ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium">
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(u)}
                            className="inline-flex items-center gap-1 text-brand hover:text-brand-hover font-semibold text-xs"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                    {isEditing && editState && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Role</label>
                              <select
                                value={editState.role}
                                disabled={isSelf}
                                onChange={e => {
                                  const nextRole = e.target.value as UserRole;
                                  setEditState({
                                    ...editState,
                                    role: nextRole,
                                    // Approval authority only ever applies to Approvers — see PUT /api/users/:id.
                                    can_approve_reimbursements: nextRole === UserRole.APPROVER ? editState.can_approve_reimbursements : false
                                  });
                                }}
                                className="block w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                {Object.values(UserRole).map(r => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                              {isSelf && (
                                <p className="text-[10px] text-slate-400 mt-1">You can't change your own role.</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Department</label>
                              <input
                                type="text"
                                value={editState.department}
                                onChange={e => setEditState({ ...editState, department: e.target.value })}
                                className="block w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Job Title</label>
                              <input
                                type="text"
                                value={editState.job_title}
                                onChange={e => setEditState({ ...editState, job_title: e.target.value })}
                                className="block w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Reports To</label>
                              <select
                                value={editState.reports_to}
                                onChange={e => setEditState({ ...editState, reports_to: e.target.value })}
                                className="block w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white"
                              >
                                <option value="">— None (top of chain) —</option>
                                {validManagerOptions.map(m => (
                                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Employment Status</label>
                              <select
                                value={editState.employment_status}
                                onChange={e => setEditState({ ...editState, employment_status: e.target.value as 'Active' | 'Inactive' })}
                                className="block w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white"
                              >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                            </div>
                            <div className="flex items-end pb-1.5">
                              <label className={`flex items-center gap-2 text-xs font-semibold ${editState.role === UserRole.APPROVER ? 'text-gray-700' : 'text-gray-400'}`}>
                                <input
                                  type="checkbox"
                                  checked={editState.can_approve_reimbursements}
                                  disabled={editState.role !== UserRole.APPROVER}
                                  onChange={e => setEditState({ ...editState, can_approve_reimbursements: e.target.checked })}
                                  className="rounded border-gray-300 text-brand focus:ring-brand disabled:opacity-50"
                                />
                                Can Approve Reimbursements
                              </label>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2">
                            {editState.role === UserRole.APPROVER
                              ? 'Approval authority normally follows the reporting hierarchy automatically (has direct reports ⇒ can approve). This checkbox is an Admin override — see docs/hierarchy-sync-design.md §3.'
                              : 'Only Approvers can hold approval authority — change the role above to Approver to enable this.'}
                          </p>
                          <div className="flex justify-end gap-2 mt-3">
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded border border-slate-300 bg-white"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                            <button
                              onClick={() => submitUpdate(u)}
                              disabled={saving}
                              className="corp-btn-primary text-xs"
                            >
                              <Check className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          itemsPerPage={25}
          itemLabel="users"
        />
      </div>
    </div>
  );
};
