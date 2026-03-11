import React, { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { authAPI, getAuthToken } from '../api';
import { PasswordInput } from './PasswordInput';
import { User } from './AuthPage';

type PasswordChangePageProps = {
  user: User;
};

export function PasswordChangePage({ user }: PasswordChangePageProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);

  const validatePassword = (pass: string) => {
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass);
    const isLongEnough = pass.length >= 8;
    
    if (!isLongEnough) return "Password must be at least 8 characters long";
    if (!hasUpper) return "Password must contain at least one uppercase letter";
    if (!hasLower) return "Password must contain at least one lowercase letter";
    if (!hasNumber) return "Password must contain at least one number";
    if (!hasSymbol) return "Password must contain at least one symbol";
    return null;
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setError('');

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return setError(passwordError);
    }

    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setIsLoading(true);
    try {
      await authAPI.changePassword(user.id, newPassword);
      
      // Update local storage user object
      const updatedUser = { ...user, isFirstLogin: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success('Password updated successfully!');
      setTimeout(() => window.location.reload(), 400);
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
              className={(formSubmitted && (!newPassword || validatePassword(newPassword))) ? 'border-red-500' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
            <PasswordInput 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Confirm new password" 
              className={(formSubmitted && (confirmPassword !== newPassword)) ? 'border-red-500' : ''}
            />
          </div>

          <div className={`border rounded-xl p-4 space-y-2 transition-all duration-300 shadow-sm ${ 
            (formSubmitted && (!newPassword || validatePassword(newPassword))) 
              ? 'bg-red-50 border-red-200 ring-1 ring-red-200' 
              : (newPassword && !validatePassword(newPassword)) 
                ? 'bg-green-50 border-green-200 ring-1 ring-green-200' 
                : 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
          }`}>
            <p className={`text-sm font-bold flex items-center gap-2 ${ 
              (formSubmitted && (!newPassword || validatePassword(newPassword))) 
                ? 'text-red-800' 
                : (newPassword && !validatePassword(newPassword)) 
                  ? 'text-green-800' 
                  : 'text-blue-800'
            }`}>
              <AlertCircle className="w-4 h-4" /> Password Requirements:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <div className={`flex items-center gap-2 text-xs ${newPassword.length >= 8 ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-green-600' : 'bg-slate-300'}`} />
                At least 8 characters
              </div>
              <div className={`flex items-center gap-2 text-xs ${/[A-Z]/.test(newPassword) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-green-600' : 'bg-slate-300'}`} />
                One uppercase (A-Z)
              </div>
              <div className={`flex items-center gap-2 text-xs ${/[a-z]/.test(newPassword) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(newPassword) ? 'bg-green-600' : 'bg-slate-300'}`} />
                One lowercase (a-z)
              </div>
              <div className={`flex items-center gap-2 text-xs ${/[0-9]/.test(newPassword) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-green-600' : 'bg-slate-300'}`} />
                One number (0-9)
              </div>
              <div className={`flex items-center gap-2 text-xs ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? 'bg-green-600' : 'bg-slate-300'}`} />
                One symbol (@#$%)
              </div>
            </div>
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
