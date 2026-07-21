import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X, CalendarBlank } from '@phosphor-icons/react';
import { Mom, MomStatus, UserRole, ReviewMeetingStatus } from '../types';
import { getStatusConfig, getStatusBadgeClass } from '../statusConfig';
import { formatPHP } from '../utils';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Minimal shape the Calendar needs from a ReviewMeeting - kept local rather than
// importing the full server-enriched type, since only these fields are rendered.
interface ReviewMeetingLike {
  id: string;
  claim_id?: string;
  meeting_date: string;
  meeting_time?: string;
  approver_name?: string;
  requestor_name?: string;
  status?: ReviewMeetingStatus;
  claim_number?: string;
  total_amount?: number;
}

interface CalendarGridProps {
  moms: Mom[];
  reviewMeetings?: ReviewMeetingLike[];
  onDateSelect?: (dateStr: string) => void;
  selectedDate?: string; // yyyy-MM-dd format
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({ moms, reviewMeetings = [], onDateSelect, selectedDate }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeDay, setActiveDay] = useState<Date | null>(null);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate))
  });

  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1));
  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1));
  const jumpToToday = () => { setCurrentDate(new Date()); setActiveDay(new Date()); };

  const getMomsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return moms.filter(m => m.meeting_date && m.meeting_date.startsWith(dateStr));
  };

  const getReviewMeetingsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return reviewMeetings.filter(rm => rm.meeting_date && rm.meeting_date.startsWith(dateStr));
  };

  const activeDayMoms = activeDay ? getMomsForDay(activeDay) : [];
  const activeDayReviewMeetings = activeDay ? getReviewMeetingsForDay(activeDay) : [];

  const handleDayClick = (day: Date, dateStr: string) => {
    onDateSelect?.(dateStr);
    setActiveDay(day);
  };

  const getMomLabel = (mom: Mom) => `${mom.meeting_time || 'Review'} - ${mom.client || 'Client'}`;

  const getReviewMeetingLabel = (rm: ReviewMeetingLike) => {
    // Claimant (requestor) identifies *whose* meeting this is — showing the
    // Approver's own name here is useless to an Approver scanning several
    // direct reports' meetings.
    const claimantName = rm.requestor_name || 'Requestor';
    const rmConfig = getStatusConfig(rm.status);
    const statusSuffix = rmConfig.colorKey === 'pending' ? ' (Pending)'
      : rmConfig.colorKey === 'rejected' ? ' (Declined)'
      : '';
    const amountSuffix = typeof rm.total_amount === 'number' ? ` · ${formatPHP(rm.total_amount)}` : '';
    return `${rm.meeting_time || 'Review'} - ${claimantName}${amountSuffix}${statusSuffix}`;
  };

  const getReviewMeetingTitle = (rm: ReviewMeetingLike) => {
    const claimantName = rm.requestor_name || 'Requestor';
    const rmConfig = getStatusConfig(rm.status);
    return `Review Meeting with ${claimantName}${rm.claim_number ? ` (${rm.claim_number})` : ''} at ${rm.meeting_time || 'unspecified time'}${typeof rm.total_amount === 'number' ? ` — ${formatPHP(rm.total_amount)}` : ''} - ${rmConfig.description} Your internal claim review call, not the client meeting.`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex justify-between items-center bg-white border border-gray-200 rounded p-1 shadow-sm w-fit">
          <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-medium w-32 text-center text-gray-900">{format(currentDate, 'MMMM yyyy')}</span>
          <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <button
          type="button"
          onClick={jumpToToday}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded shadow-sm text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-brand transition-colors"
        >
          <CalendarBlank className="w-4 h-4" /> Today
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayMoms = getMomsForDay(day);
            const dayReviewMeetings = getReviewMeetingsForDay(day);
            const isSelected = selectedDate === dateStr || (activeDay && format(activeDay, 'yyyy-MM-dd') === dateStr);

            return (
              <div
                key={day.toString()}
                onClick={() => handleDayClick(day, dateStr)}
                className={cn(
                  "min-h-[80px] p-2 border-r border-b border-gray-100 relative group transition-colors cursor-pointer hover:bg-gray-50",
                  !isSameMonth(day, currentDate) && "bg-gray-50 text-gray-400",
                  isSelected && "bg-brand-active/50"
                )}
              >
                <div className={cn(
                  "text-sm mb-1",
                  isToday(day) ? "font-bold text-brand" : "text-gray-700",
                  isSelected && "text-brand"
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayMoms.map(mom => (
                    <div
                      key={mom.id}
                      onClick={e => { e.stopPropagation(); navigate(`/moms/${mom.id}`); }}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded truncate font-medium block shadow-xs hover:brightness-95 hover:underline",
                        mom.status === MomStatus.COMPLETED ? "corp-badge-success" : "corp-badge-warning"
                      )}
                      title={`${mom.client} at ${mom.meeting_time || 'unspecified time'} (${mom.purpose || 'No purpose'})`}
                    >
                      {getMomLabel(mom)}
                    </div>
                  ))}
                  {dayReviewMeetings.map(rm => (
                    <div
                      key={rm.id}
                      onClick={e => { e.stopPropagation(); if (rm.claim_id) navigate(`/claims/${rm.claim_id}`); }}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded truncate font-medium block shadow-xs",
                        rm.claim_id && "hover:brightness-95 hover:underline",
                        getStatusBadgeClass(rm.status)
                      )}
                      title={getReviewMeetingTitle(rm)}
                    >
                      {getReviewMeetingLabel(rm)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeDay && (
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-bold text-gray-900">
              {format(activeDay, 'EEEE, MMMM d, yyyy')}
            </h3>
            <button
              type="button"
              onClick={() => setActiveDay(null)}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
              aria-label="Close day details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {activeDayMoms.length === 0 && activeDayReviewMeetings.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">Nothing scheduled on this day.</div>
            ) : (
              <>
                {activeDayMoms.map(mom => (
                  <button
                    key={mom.id}
                    type="button"
                    onClick={() => navigate(`/moms/${mom.id}`)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <span className={cn(
                        "inline-block text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mb-1",
                        mom.status === MomStatus.COMPLETED ? "corp-badge-success" : "corp-badge-warning"
                      )}>
                        Minutes of Meeting
                      </span>
                      <div className="text-sm font-semibold text-gray-900 truncate">{mom.client || 'Client'}</div>
                      <div className="text-xs text-gray-500 truncate">{mom.purpose || 'No purpose specified'} · {mom.meeting_time || 'Unspecified time'}</div>
                    </div>
                    <span className="text-xs font-bold text-brand shrink-0">View →</span>
                  </button>
                ))}
                {activeDayReviewMeetings.map(rm => (
                  <button
                    key={rm.id}
                    type="button"
                    disabled={!rm.claim_id}
                    onClick={() => rm.claim_id && navigate(`/claims/${rm.claim_id}`)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-3 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <div className="min-w-0">
                      <span className={cn("inline-block text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mb-1", getStatusBadgeClass(rm.status))}>
                        Review Meeting
                      </span>
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {rm.requestor_name || 'Requestor'}{rm.claim_number ? ` · ${rm.claim_number}` : ''}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {rm.meeting_time || 'Unspecified time'}{typeof rm.total_amount === 'number' ? ` · ${formatPHP(rm.total_amount)}` : ''}
                      </div>
                    </div>
                    {rm.claim_id && <span className="text-xs font-bold text-brand shrink-0">View →</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
