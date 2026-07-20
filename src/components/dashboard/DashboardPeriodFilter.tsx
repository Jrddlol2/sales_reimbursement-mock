import React, { useState } from 'react';
import { useDashboardPeriod } from '../../contexts/DashboardPeriodContext';
import { DASHBOARD_PERIOD_OPTIONS } from '../../metrics/timeScope';
import { UserRole } from '../../types';
import { CalendarBlank } from '@phosphor-icons/react';

interface Props {
  role: UserRole;
}

/**
 * Global period selector. Only affects metrics with realtime: false — those
 * always stay live regardless of this filter (enforced in DashboardPeriodContext).
 */
export const DashboardPeriodFilter: React.FC<Props> = ({ role }) => {
  const { period, setPeriod, customRange, setCustomRange } = useDashboardPeriod();
  const [showCustom, setShowCustom] = useState(false);
  const isAdmin = role === UserRole.ADMIN;
  const options = isAdmin ? DASHBOARD_PERIOD_OPTIONS : DASHBOARD_PERIOD_OPTIONS.filter(o => o.value !== 'custom');

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
        <CalendarBlank className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Dashboard Period</label>
        <select
          value={period}
          onChange={(e) => {
            const val = e.target.value as typeof period;
            setPeriod(val);
            setShowCustom(val === 'custom');
          }}
          className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer"
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {isAdmin && showCustom && (
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
          <input
            type="date"
            className="text-xs border-none focus:outline-none focus:ring-0"
            value={customRange ? customRange.start.toISOString().slice(0, 10) : ''}
            onChange={(e) => {
              const start = new Date(e.target.value);
              setCustomRange({ start, end: customRange?.end || new Date() });
            }}
          />
          <span className="text-slate-300">-</span>
          <input
            type="date"
            className="text-xs border-none focus:outline-none focus:ring-0"
            value={customRange ? customRange.end.toISOString().slice(0, 10) : ''}
            onChange={(e) => {
              const end = new Date(e.target.value);
              setCustomRange({ start: customRange?.start || new Date(0), end });
            }}
          />
        </div>
      )}
    </div>
  );
};
