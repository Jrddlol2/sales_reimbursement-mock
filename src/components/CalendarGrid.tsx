import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Mom, MomStatus, UserRole, ReviewMeetingStatus } from '../types';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Minimal shape the Calendar needs from a ReviewMeeting - kept local rather than
// importing the full server-enriched type, since only these fields are rendered.
interface ReviewMeetingLike {
  id: string;
  meeting_date: string;
  meeting_time?: string;
  approver_name?: string;
  requestor_name?: string;
  status?: ReviewMeetingStatus;
}

interface CalendarGridProps {
  moms: Mom[];
  reviewMeetings?: ReviewMeetingLike[];
  onDateSelect?: (dateStr: string) => void;
  selectedDate?: string; // yyyy-MM-dd format
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({ moms, reviewMeetings = [], onDateSelect, selectedDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate))
  });

  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1));
  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1));

  const getMomsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return moms.filter(m => m.meeting_date && m.meeting_date.startsWith(dateStr));
  };

  const getReviewMeetingsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return reviewMeetings.filter(rm => rm.meeting_date && rm.meeting_date.startsWith(dateStr));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white border border-gray-200 rounded p-1 shadow-sm w-fit">
        <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-medium w-32 text-center text-gray-900">{format(currentDate, 'MMMM yyyy')}</span>
        <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
            const isSelected = selectedDate === dateStr;

            return (
              <div
                key={day.toString()}
                onClick={() => onDateSelect && onDateSelect(dateStr)}
                className={cn(
                  "min-h-[80px] p-2 border-r border-b border-gray-100 relative group transition-colors",
                  !isSameMonth(day, currentDate) && "bg-gray-50 text-gray-400",
                  onDateSelect && "cursor-pointer hover:bg-gray-50",
                  isSelected && "bg-blue-50/50"
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
                  {dayMoms.map(mom => {
                    const displayLabel = `${mom.meeting_time || 'Review'} - ${mom.client || 'Client'}`;
                    return (
                      <div
                        key={mom.id}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded truncate font-medium block shadow-xs",
                          mom.status === MomStatus.COMPLETED ? "corp-badge-success" : "corp-badge-warning"
                        )}
                        title={`${mom.client} at ${mom.meeting_time || 'unspecified time'} (${mom.purpose || 'No purpose'})`}
                      >
                        {displayLabel}
                      </div>
                    );
                  })}
                  {dayReviewMeetings.map(rm => {
                    const withName = rm.approver_name || rm.requestor_name || 'Approver';
                    const statusSuffix = rm.status === ReviewMeetingStatus.PENDING_CONFIRMATION ? ' (Pending)'
                      : rm.status === ReviewMeetingStatus.DECLINE_REQUESTED ? ' (Declined)'
                      : '';
                    const displayLabel = `${rm.meeting_time || 'Review'} - ${withName}${statusSuffix}`;
                    const statusLabel = rm.status === ReviewMeetingStatus.PENDING_CONFIRMATION ? 'awaiting Approver confirmation'
                      : rm.status === ReviewMeetingStatus.DECLINE_REQUESTED ? 'declined by the Approver - needs a new time'
                      : rm.status === ReviewMeetingStatus.CONFIRMED ? 'confirmed by the Approver'
                      : 'completed';
                    return (
                      <div
                        key={rm.id}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded truncate font-medium block",
                          rm.status === ReviewMeetingStatus.DECLINE_REQUESTED
                            ? "border border-dashed border-red-300 bg-red-50/60 text-red-700"
                            : rm.status === ReviewMeetingStatus.PENDING_CONFIRMATION
                              ? "border border-dashed border-slate-300 bg-slate-50 text-slate-500"
                              : "shadow-xs corp-badge-info"
                        )}
                        title={`Review Meeting with ${withName} at ${rm.meeting_time || 'unspecified time'} - ${statusLabel}. Your internal claim review call, not the client meeting.`}
                      >
                        {displayLabel}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
