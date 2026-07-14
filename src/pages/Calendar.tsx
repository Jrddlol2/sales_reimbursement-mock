import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { Mom, UserRole } from '../types';
import { useAuth } from '../components/AuthContext';
import { CalendarGrid } from '../components/CalendarGrid';

export const Calendar: React.FC = () => {
  const [moms, setMoms] = useState<Mom[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMoms();
  }, []);

  const fetchMoms = async () => {
    try {
      const data = await apiFetch('/api/moms');
      setMoms(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-medium text-gray-900 tracking-tight">Review Meetings</h2>
        <p className="mt-1 text-sm text-gray-500">
          {user?.role === UserRole.APPROVER ? "Read-only rollup of your team's scheduled review meetings." : "Schedule and track claim review meetings with your Approver."}
        </p>
      </div>

      <CalendarGrid moms={moms} />
    </div>
  );
};

