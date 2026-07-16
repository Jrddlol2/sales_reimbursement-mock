import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../lib/api';
import { User } from '../types';

export const Login: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    } else {
      apiFetch('/api/users').then(data => {
        setUsers(data);
        if (data.length > 0) setSelectedEmail(data[0].email);
      });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(selectedEmail);
      navigate('/');
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Microgenesis Logo" className="h-10 object-contain" />
        </div>
        <h1 className="text-xl font-semibold text-center text-gray-900 mb-2">Sales Reimbursement System</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Sign in to your account</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email"
              required
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-brand focus:ring-brand sm:text-sm p-2 border"
              value={selectedEmail}
              onChange={e => setSelectedEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password"
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-brand focus:ring-brand sm:text-sm p-2 border"
              value="password"
              readOnly
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-brand text-white rounded py-2 px-4 text-sm font-medium hover:bg-brand-hover transition-colors shadow-sm"
          >
            Log in
          </button>
        </form>

        <div className="mt-8 bg-gray-50 border border-gray-200 rounded p-4">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Demo Accounts</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li><strong>alice@example.com</strong> (Requestor)</li>
            <li><strong>bob@example.com</strong> (Approver)</li>
            <li><strong>carol@example.com</strong> (Custodian)</li>
            <li><strong>dave@example.com</strong> (Admin)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
