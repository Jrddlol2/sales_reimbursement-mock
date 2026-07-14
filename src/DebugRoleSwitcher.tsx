import React, { useState, useEffect } from 'react';
import { useAuth } from './components/AuthContext';
import { User } from './types';
import { apiFetch } from './lib/api';

export const DebugRoleSwitcher: React.FC = () => {
  const { login, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only fetch users if not on login, or we can just fetch them always.
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(() => {});
  }, []);

  // Quick switcher
  const handleSwitch = async (email: string) => {
    try {
      await login(email);
      setIsOpen(false);
      // reload the page to reset state if needed, or just let react handle it
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 w-48 text-xs">
          <div className="flex justify-between items-center mb-2 border-b pb-1">
            <span className="font-semibold text-gray-700">Fast Switcher</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-700">&times;</button>
          </div>
          <div className="space-y-1">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => handleSwitch(u.email)}
                className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${user?.id === u.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600'}`}
              >
                {u.name} ({u.role})
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gray-800 text-white w-8 h-8 rounded-full shadow opacity-30 hover:opacity-100 flex items-center justify-center transition-opacity focus:outline-none"
          title="Debug Role Switcher"
        >
          {user ? user.name.charAt(0) : 'D'}
        </button>
      )}
    </div>
  );
};
