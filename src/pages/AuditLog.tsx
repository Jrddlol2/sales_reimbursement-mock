import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { CaretDown, CaretLeft, CaretRight } from '@phosphor-icons/react';
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

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Header */}
        <div className="animate-pulse">
          <div className="h-7 w-48 bg-slate-200 rounded-md mb-2"></div>
          <div className="h-4 w-96 bg-slate-100 rounded-md"></div>
        </div>

        {/* Skeleton Card */}
        <div className="corp-card flex flex-col overflow-hidden animate-pulse">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
          </div>
          <div className="p-4 space-y-4">
            <div className="h-8 bg-slate-100 rounded-md w-full"></div>
            <div className="h-12 bg-slate-50 rounded-md w-full"></div>
            <div className="h-12 bg-slate-50 rounded-md w-full"></div>
            <div className="h-12 bg-slate-50 rounded-md w-full"></div>
            <div className="h-12 bg-slate-50 rounded-md w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">Audit Log</h2>
        <p className="mt-1 text-xs text-slate-500">Immutable record of all status changes across Reimbursement claims, Cash Advances, and Liquidations.</p>
      </div>

      <div className="corp-card flex flex-col overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-2"><div className="w-1 h-3 bg-brand rounded-full"></div>System Events</h3>
        </div>
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">Timestamp <CaretDown className="w-3 h-3 text-slate-400"/></div>
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">Reference ID <CaretDown className="w-3 h-3 text-transparent"/></div>
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">Transition <CaretDown className="w-3 h-3 text-transparent"/></div>
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-display cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">Changed By <CaretDown className="w-3 h-3 text-transparent"/></div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">No activity recorded yet.</td>
                  </tr>
                ) : history.map((log: any) => (
                  <tr key={log.id} className="hover:bg-brand/5 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-[10px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-bold font-mono">
                      {log.claim ? (
                        <Link to={`/claims/${log.claim.id}`} className="text-brand hover:text-brand-hover hover:underline">
                          {getClaimNumber(log.claim)}
                        </Link>
                      ) : log.targetUser ? (
                        <span className="text-slate-900 font-sans font-bold">{log.targetUser.name}</span>
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

          {/* Mobile Card View */}
          <div className="sm:hidden flex flex-col divide-y divide-slate-100">
            {history.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-500">No activity recorded yet.</div>
            ) : history.map((log: any) => (
              <div key={log.id} className="p-4 hover:bg-brand/5 flex flex-col gap-2.5 transition-colors">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                  <span className="font-bold font-mono">
                    {log.claim ? (
                      <Link to={`/claims/${log.claim.id}`} className="text-brand hover:text-brand-hover hover:underline">
                        {getClaimNumber(log.claim)}
                      </Link>
                    ) : log.targetUser ? (
                      <span className="text-slate-900 font-sans font-bold">{log.targetUser.name}</span>
                    ) : (
                      <span className="text-slate-900">{log.claim_id.substring(0,8)}</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded-sm ${getStatusColor(log.old_status)} font-bold`}>{log.old_status}</span>
                  <span className="mx-2 text-slate-400 font-bold">→</span>
                  <span className={`px-1.5 py-0.5 rounded-sm ${getStatusColor(log.new_status)} font-bold`}>{log.new_status}</span>
                </div>

                {log.reason && (
                  <div className="text-[10px] text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                    {log.reason}
                  </div>
                )}

                <div className="text-xs text-slate-600 border-t border-slate-50 pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <span className="font-bold text-slate-900">{log.changedBy?.name}</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide ml-1">({log.changedBy?.role})</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {log.changedBy?.job_title ? `${log.changedBy.job_title} · ${log.changedBy.department}` : log.changedBy?.department}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Pagination visually represented */}
        <div className="bg-white px-4 py-2.5 border-t border-slate-200 flex items-center justify-between sm:px-6">
          <div className="flex-1 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500">
                Showing <span className="font-extrabold text-slate-900">1</span> to <span className="font-extrabold text-slate-900">{history.length}</span> of <span className="font-extrabold text-slate-900">{history.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-1.5 rounded-l border border-slate-300 bg-white text-xs font-bold text-slate-500 hover:bg-slate-50">
                  <CaretLeft className="h-3.5 w-3.5" />
                </button>
                <button className="relative inline-flex items-center px-3 py-1.5 border border-slate-300 bg-white text-xs font-extrabold text-blue-600 font-display">
                  1
                </button>
                <button className="relative inline-flex items-center px-2 py-1.5 rounded-r border border-slate-300 bg-white text-xs font-bold text-slate-500 hover:bg-slate-50">
                  <CaretRight className="h-3.5 w-3.5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
