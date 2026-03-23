import React, { useState } from 'react';
import { toast } from 'sonner';
import { authAPI, getAuthToken } from '../api';
import { PasswordInput } from './PasswordInput';
import { User } from './AuthPage';

type PasswordChangePageProps = {
  user: User;
  onPasswordChange: (user: User ) => void;
};

export function PasswordChangePage({ user, onPasswordChange }: PasswordChangePageProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters long');
    }

    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setIsLoading(true);
    try {
      await authAPI.changePassword(user.id, newPassword);
      
      const updatedUser = { ...user, isFirstLogin: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Password updated successfully!');

      // 🔥 instead of reload
      onPasswordChange(updatedUser);

    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-50 rounded-full mb-4">
            <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Update Your Password</h2>
          <p className="text-slate-500 mt-2">This is your first login. For security, please set a new password before continuing.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
            <PasswordInput 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Enter new password" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
            <PasswordInput 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Confirm new password" 
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {isLoading ? 'Updating...' : 'Update Password & Access Website'}
          </button>
        </form>
      </div>
    </div>
  );
}
