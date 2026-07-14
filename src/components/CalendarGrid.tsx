import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Mom, MomStatus, UserRole } from '../types';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface CalendarGridProps {
  moms: Mom[];
  onDateSelect?: (dateStr: string) => void;
  selectedDate?: string; // yyyy-MM-dd format
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({ moms, onDateSelect, selectedDate }) => {
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
                  isToday(day) ? "font-bold text-[#0095D5]" : "text-gray-700",
                  isSelected && "text-[#0095D5]"
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayMoms.map(mom => {
                    const timeMatch = mom.meeting_date.match(/\d{4}-\d{2}-\d{2}\s+(.*)/);
                    const timeLabel = timeMatch ? timeMatch[1] : 'Review';
                    return (
                      <div
                        key={mom.id}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded truncate font-medium",
                          mom.status === MomStatus.UPLOADED ? "bg-green-100 text-green-800 border border-green-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                        )}
                        title={timeLabel}
                      >
                        {timeLabel}
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
