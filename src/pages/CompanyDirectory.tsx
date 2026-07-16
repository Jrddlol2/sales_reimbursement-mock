import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Company } from '../types';
import { useToast } from '../components/Toast';
import { Pencil, X, Check, Plus, Buildings } from '@phosphor-icons/react';

interface EditState {
  name: string;
  industry: string;
  notes: string;
}

const emptyForm: EditState = { name: '', industry: '', notes: '' };

export const CompanyDirectory: React.FC = () => {
  const toast = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>(emptyForm);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<EditState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCompanies = () => {
    setLoading(true);
    apiFetch('/api/companies').then(data => {
      setCompanies(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const startEdit = (c: Company) => {
    setEditingId(c.id);
    setEditState({ name: c.name, industry: c.industry || '', notes: c.notes || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(emptyForm);
  };

  const saveEdit = async (c: Company) => {
    if (!editState.name.trim()) return toast.error('Company name is required.');
    setSaving(true);
    try {
      await apiFetch(`/api/companies/${c.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editState.name, industry: editState.industry, notes: editState.notes })
      });
      toast.success(`${editState.name} updated.`);
      cancelEdit();
      fetchCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update company.');
    } finally {
      setSaving(false);
    }
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return toast.error('Company name is required.');
    setSaving(true);
    try {
      await apiFetch('/api/companies', {
        method: 'POST',
        body: JSON.stringify({ name: addForm.name, industry: addForm.industry, notes: addForm.notes })
      });
      toast.success(`${addForm.name} added to the directory.`);
      setAddForm(emptyForm);
      setShowAddForm(false);
      fetchCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add company.');
    } finally {
      setSaving(false);
    }
  };

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">Company Directory</h2>
          <p className="mt-1 text-xs text-slate-500">Canonical master list of client companies. Used to populate the "Client (Company Name)" field on every Minutes of Meeting.</p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="corp-btn-primary shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={submitAdd} className="corp-card p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">New Company</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Name *</label>
              <input
                type="text"
                required
                value={addForm.name}
                onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                className="block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder="e.g. Ayala Land Inc"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Industry</label>
              <input
                type="text"
                value={addForm.industry}
                onChange={e => setAddForm({ ...addForm, industry: e.target.value })}
                className="block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder="e.g. Real Estate"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</label>
              <input
                type="text"
                value={addForm.notes}
                onChange={e => setAddForm({ ...addForm, notes: e.target.value })}
                className="block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setAddForm(emptyForm); }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 bg-white"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="corp-btn-primary">
              {saving ? 'Adding...' : 'Add Company'}
            </button>
          </div>
        </form>
      )}

      <div className="corp-card flex flex-col overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-2">
            <div className="w-1 h-3 bg-brand rounded-full"></div>
            All Companies ({companies.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Name</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Industry</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Notes</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 py-4">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                        <Buildings className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-gray-700">No companies yet</p>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto">Add your first company to make it available in the MOM Client field.</p>
                    </div>
                  </td>
                </tr>
              ) : companies.map(c => {
                const isEditing = editingId === c.id;
                return (
                  <React.Fragment key={c.id}>
                    <tr className="hover:bg-brand/5 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm font-bold text-gray-950">{c.name}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">{c.industry || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 max-w-xs truncate">{c.notes || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium">
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(c)}
                            className="inline-flex items-center gap-1 text-brand hover:text-brand-hover font-semibold text-xs"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                    {isEditing && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={4} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                              <input
                                type="text"
                                value={editState.name}
                                onChange={e => setEditState({ ...editState, name: e.target.value })}
                                className="block w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Industry</label>
                              <input
                                type="text"
                                value={editState.industry}
                                onChange={e => setEditState({ ...editState, industry: e.target.value })}
                                className="block w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                              <input
                                type="text"
                                value={editState.notes}
                                onChange={e => setEditState({ ...editState, notes: e.target.value })}
                                className="block w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-3">
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded border border-slate-300 bg-white"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(c)}
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
      </div>
    </div>
  );
};
