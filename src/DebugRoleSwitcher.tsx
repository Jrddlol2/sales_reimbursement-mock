import React, { useState, useEffect } from 'react';
import { useAuth } from './components/AuthContext';
import { User } from './types';
import { Users, X } from '@phosphor-icons/react';

export const DebugRoleSwitcher: React.FC = () => {
  const { login, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(() => {});
  }, []);

  const handleSwitch = async (email: string) => {
    try {
      await login(email);
      setIsOpen(false);
      // Reload so every page refetches with the new identity.
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 w-56 text-xs animate-dropdown-in">
          <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-brand" /> Preview As…
            </span>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-0.5 max-h-80 overflow-y-auto custom-scrollbar">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => handleSwitch(u.email)}
                className={`w-full text-left px-2 py-1.5 rounded transition-all active:scale-[0.98] duration-100 ${
                  user?.id === u.id
                    ? 'bg-brand text-white font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div>{u.name}</div>
                <div className={`text-[10px] ${user?.id === u.id ? 'text-white/80' : 'text-gray-400'}`}>
                  {u.job_title ? `${u.job_title} · ${u.role}` : u.role}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-brand text-white pl-3 pr-4 h-9 rounded-full shadow-md hover:bg-brand-hover flex items-center gap-2 transition-all active:scale-[0.98] duration-100 focus:outline-none text-xs font-semibold"
          title="Preview As…"
        >
          <Users className="w-4 h-4" />
          {user ? user.name.split(' ')[0] : 'Preview As…'}
        </button>
      )}
    </div>
  );
};
