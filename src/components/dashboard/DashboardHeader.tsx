import React from 'react';
import { User } from '../../types';

interface DashboardHeaderProps {
  user: User;
  summaryText: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user, summaryText }) => {
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display mb-1">
          {getGreeting()}, {user.name.split(' ')[0]}
        </h1>
        <div className="flex items-center space-x-3 text-sm text-slate-500 font-medium">
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">{user.role}</span>
          <span>&bull;</span>
          <span>{user.department}</span>
        </div>
        <p className="mt-4 text-slate-600">
          {summaryText}
        </p>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Today</div>
        <div className="text-lg font-bold text-slate-800">{currentDate}</div>
      </div>
    </div>
  );
};
