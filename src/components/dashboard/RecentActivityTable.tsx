import React from 'react';
import { StatusBadge } from '../StatusBadge';
import { formatPHP } from '../../utils';
import { getAgingInfo } from '../../statusConfig';
import { useNavigate } from 'react-router-dom';
import { CaretRight } from '@phosphor-icons/react';

interface ActivityItem {
  id: string;
  reference: string;
  type: string;
  status: any; // We'll pass the exact enum values
  amount: number;
  date: string;
  path: string;
}

interface RecentActivityTableProps {
  title: string;
  items: ActivityItem[];
  emptyMessage?: string;
  action?: React.ReactNode;
  // Opt-in only — this table is shared across every role's dashboard, and
  // "how long has this been waiting" is only meaningful for a queue of
  // pending items (e.g. the Approver's Action Required list), not for
  // already-decided history rows on other dashboards.
  showAging?: boolean;
}

export const RecentActivityTable: React.FC<RecentActivityTableProps> = ({ title, items, emptyMessage = "Nothing here yet — activity will appear as requests move through the workflow.", action, showAging = false }) => {
  const navigate = useNavigate();

  return (
    <div className="corp-card flex flex-col h-full">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
        {action}
      </div>
      <div className="overflow-x-auto rounded-b-xl flex-1 flex flex-col">
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 text-sm">
            {emptyMessage}
          </div>
        ) : (
          <>
            {/* Desktop Table view */}
            <div className="hidden sm:block">
              <table className="corp-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Date</th>
                    {showAging && <th>Aging</th>}
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => navigate(item.path)}
                    >
                      <td>
                        <span className="font-mono font-medium">{item.reference}</span>
                      </td>
                      <td>
                        <span className="font-medium">{item.type}</span>
                      </td>
                      <td>
                        <span className="font-semibold">{formatPHP(item.amount)}</span>
                      </td>
                      <td>
                        <span className="text-slate-500">{new Date(item.date).toLocaleDateString()}</span>
                      </td>
                      {showAging && (
                        <td>
                          {(() => {
                            const aging = getAgingInfo(item.date);
                            return (
                              <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap ${aging.badgeClass}`}>
                                {aging.label}
                              </span>
                            );
                          })()}
                        </td>
                      )}
                      <td>
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td className="text-right">
                        <CaretRight size={16} weight="bold" className="text-slate-400 inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card view */}
            <div className="sm:hidden flex flex-col divide-y divide-slate-100">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className="p-4 hover:bg-slate-50 cursor-pointer flex flex-col gap-2.5 transition-colors"
                  onClick={() => navigate(item.path)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-brand">{item.reference}</span>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 font-medium mr-1">Type:</span>
                      <span className="font-semibold text-slate-800">{item.type}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 font-medium mr-1">Amount:</span>
                      <span className="font-extrabold text-slate-900">{formatPHP(item.amount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium mr-1">Date:</span>
                      <span className="text-slate-700">{new Date(item.date).toLocaleDateString()}</span>
                    </div>
                    {showAging && (() => {
                      const aging = getAgingInfo(item.date);
                      return (
                        <div>
                          <span className="text-slate-400 font-medium mr-1">Aging:</span>
                          <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-bold ${aging.badgeClass}`}>
                            {aging.label}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="text-right flex items-center justify-end gap-0.5 text-brand font-bold">
                      <span>View details</span>
                      <CaretRight size={12} weight="bold" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
