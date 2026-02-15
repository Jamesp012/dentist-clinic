import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { authAPI, setAuthToken } from '../api';
import { PasswordInput } from './PasswordInput';

export type UserRole = 'doctor' | 'assistant' | 'patient' | 'admin';
export type UserPosition = 'dentist' | 'assistant_dentist' | 'assistant' | null;

export type User = {
  id: string;
  username: string;
  role: UserRole;
  position?: UserPosition;
  accessLevel?: 'Admin' | 'Super Admin' | 'Default Accounts';
  fullName: string;
  email?: string;
  phone?: string;
  patientId?: string;
  isFirstLogin?: boolean;
};

export type SignupData = {
  firstName?: string;
  lastName?: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  sex: 'Male' | 'Female';
  username: string;
  password: string;
  role: UserRole;
  patientType?: 'direct' | 'referred';
  hasExistingRecord?: boolean;
};

type AuthPageProps = {
  onLogin: (username: string, password: string) => void;
  onSignup: (signupData: SignupData) => void;
};

export function AuthPage({ onLogin, onSignup }: AuthPageProps) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Signup form state
  const [signupData, setSignupData] = useState<SignupData>({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    sex: 'Male',
    username: '',
    password: '',
    role: 'patient',
    patientType: 'direct'
  });

  // Forgot password flow
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        if (parsed?.isFirstLogin && (parsed.role === 'doctor' || parsed.role === 'assistant')) {
          // logic for password change redirect
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const resp = await authAPI.login(username, password);
      if (resp.token && resp.user) {
        setAuthToken(resp.token);
        localStorage.setItem('token', resp.token);
        localStorage.setItem('user', JSON.stringify(resp.user));
        toast.success('Login successful');
        setTimeout(() => window.location.reload(), 400);
        return;
      }
      setError(resp.error || 'Login failed');
    } catch (err) {
      setError('Login failed - Backend error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await onSignup(signupData);
      // Wait a bit then switch to login view
      setTimeout(() => setIsLoginView(true), 1500);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupChange = (field: keyof SignupData, value: string) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!resetEmail) return setError('Please enter your email');
    toast.success('Password reset link sent (simulated)');
    setTimeout(() => {
      setShowForgotPassword(false);
      setResetEmail('');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {isLoginView ? 'Sign In' : 'Create Account'}
          </h2>
          <button 
            onClick={() => setIsLoginView(!isLoginView)}
            className="text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
          >
            {isLoginView ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </button>
        </div>

        {isLoginView ? (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-slate-800">Sign In</h3>
              <p className="text-sm text-slate-500 mt-1">Access your account to manage your appointments</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <PasswordInput 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Enter your password" 
              />
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}
            
            <div className="flex flex-col gap-3 pt-2">
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
              <div className="flex justify-between items-center px-1">
                <button 
                  type="button" 
                  onClick={() => setShowForgotPassword(true)} 
                  className="text-sm text-teal-600 hover:text-teal-700 underline"
                >
                  Forgot password?
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsLoginView(false)} 
                  className="text-sm text-teal-600 hover:text-teal-700 font-semibold"
                >
                  Don't have an account? Sign Up
                </button>
              </div>
            </div>
          </form>
          </div>
        ) : (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input 
                  value={signupData.fullName} 
                  onChange={e => handleSignupChange('fullName', e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="email"
                  value={signupData.email} 
                  onChange={e => handleSignupChange('email', e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input 
                  value={signupData.phone} 
                  onChange={e => handleSignupChange('phone', e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="09123456789"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                <input 
                  type="date"
                  value={signupData.dateOfBirth} 
                  onChange={e => handleSignupChange('dateOfBirth', e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input 
                value={signupData.address} 
                onChange={e => handleSignupChange('address', e.target.value)} 
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none"
                placeholder="Enter your address"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input 
                  value={signupData.username} 
                  onChange={e => handleSignupChange('username', e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Choose a username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <PasswordInput 
                  value={signupData.password} 
                  onChange={e => handleSignupChange('password', e.target.value)} 
                  placeholder="Choose a password" 
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 mt-2"
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        )}

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md border border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 mb-4">Reset Password</h3>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input 
                    type="email"
                    value={resetEmail} 
                    onChange={e => setResetEmail(e.target.value)} 
                    placeholder="Enter your registered email" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowForgotPassword(false)} 
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors shadow-md"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
