import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStatusColor } from '../utils';

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
        <h2 className="text-xl font-medium text-gray-900 tracking-tight">Audit Log</h2>
        <p className="mt-1 text-sm text-gray-500">Immutable record of all claim status changes.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm">
        <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium text-gray-800 text-sm">System Events</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#F4F6F8]">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">Timestamp <ChevronDown className="w-3 h-3 text-gray-400"/></div>
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">Claim ID <ChevronDown className="w-3 h-3 text-transparent"/></div>
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">Transition <ChevronDown className="w-3 h-3 text-transparent"/></div>
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">Changed By <ChevronDown className="w-3 h-3 text-transparent"/></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">No activity recorded yet.</td>
                </tr>
              ) : history.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap text-[11px] text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.claim_id.substring(0,8)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-[11px]">
                        <span className={`px-1.5 py-0.5 rounded-sm border ${getStatusColor(log.old_status)}`}>{log.old_status}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className={`px-1.5 py-0.5 rounded-sm border ${getStatusColor(log.new_status)}`}>{log.new_status}</span>
                      </div>
                      {log.reason && (
                        <div className="text-[11px] text-gray-500 whitespace-normal mt-1 max-w-md">
                          {log.reason}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                    {log.changedBy?.name} <span className="text-[11px] text-gray-400 ml-1">({log.changedBy?.role})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination visually represented */}
        <div className="bg-white px-4 py-2 border-t border-gray-200 flex items-center justify-between sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] text-gray-500">
                Showing <span className="font-medium text-gray-900">1</span> to <span className="font-medium text-gray-900">{history.length}</span> of <span className="font-medium text-gray-900">{history.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-1.5 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="relative inline-flex items-center px-3 py-1.5 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  1
                </button>
                <button className="relative inline-flex items-center px-2 py-1.5 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
