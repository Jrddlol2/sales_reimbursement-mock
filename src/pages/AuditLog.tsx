import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStatusColor, getClaimNumber } from '../utils';

export const AuditLog: React.FC = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/history').then(data => {
      setHistory(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Loading audit log...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">Audit Log</h2>
        <p className="mt-1 text-xs text-slate-500">Immutable record of all status changes across Reimbursement claims, Cash Advances, and Liquidations.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display">System Events</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">Timestamp <ChevronDown className="w-3 h-3 text-slate-400"/></div>
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">Reference ID <ChevronDown className="w-3 h-3 text-transparent"/></div>
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">Transition <ChevronDown className="w-3 h-3 text-transparent"/></div>
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">Changed By <ChevronDown className="w-3 h-3 text-transparent"/></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">No activity recorded yet.</td>
                </tr>
              ) : history.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-bold font-mono">
                    {log.claim ? (
                      <Link to={`/claims/${log.claim.id}`} className="text-brand hover:underline">
                        {getClaimNumber(log.claim)}
                      </Link>
                    ) : (
                      <span className="text-slate-900">{log.claim_id.substring(0,8)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded-sm ${getStatusColor(log.old_status)} font-bold`}>{log.old_status}</span>
                        <span className="mx-2 text-slate-400 font-bold">→</span>
                        <span className={`px-1.5 py-0.5 rounded-sm ${getStatusColor(log.new_status)} font-bold`}>{log.new_status}</span>
                      </div>
                      {log.reason && (
                        <div className="text-[10px] text-slate-500 whitespace-normal mt-1 max-w-md italic">
                          {log.reason}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                    <div><span className="font-bold text-slate-900">{log.changedBy?.name}</span> <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">({log.changedBy?.role})</span></div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {log.changedBy?.job_title ? `${log.changedBy.job_title} · ${log.changedBy.department}` : log.changedBy?.department}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination visually represented */}
        <div className="bg-white px-4 py-2.5 border-t border-slate-200 flex items-center justify-between sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] text-slate-500">
                Showing <span className="font-extrabold text-slate-900">1</span> to <span className="font-extrabold text-slate-900">{history.length}</span> of <span className="font-extrabold text-slate-900">{history.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-1.5 rounded-l border border-slate-300 bg-white text-xs font-bold text-slate-500 hover:bg-slate-50">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button className="relative inline-flex items-center px-3 py-1.5 border border-slate-300 bg-white text-xs font-extrabold text-brand font-display">
                  1
                </button>
                <button className="relative inline-flex items-center px-2 py-1.5 rounded-r border border-slate-300 bg-white text-xs font-bold text-slate-500 hover:bg-slate-50">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
