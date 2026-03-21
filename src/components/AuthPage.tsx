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
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'username' | 'otp' | 'reset'>('username');
  const [resetUsername, setResetUsername] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isResetLoading, setIsResetLoading] = useState(false);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(pass)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(pass)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(pass)) return "Password must contain at least one number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return "Password must contain at least one special character";
    return null;
  };

  const handleSendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!resetUsername) return toast.error('Please enter your username');
    
    setIsResetLoading(true);
    try {
      const resp = await authAPI.sendPasswordOTP(resetUsername);
      if (resp.success) {
        setMaskedPhone(resp.phone);
        setForgotPasswordStep('otp');
        setCooldown(60); // 60 seconds cooldown
        toast.success('OTP sent to your registered phone');
      } else {
        toast.error(resp.error || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error('Error sending OTP');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp) return toast.error('Please enter the OTP');

    setIsResetLoading(true);
    try {
      const resp = await authAPI.verifyPasswordOTP(resetUsername, resetOtp);
      if (resp.success) {
        setForgotPasswordStep('reset');
        toast.success('OTP verified. Please set your new password.');
      } else {
        toast.error(resp.error || 'Invalid OTP');
      }
    } catch (err) {
      toast.error('Error verifying OTP');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const passError = validatePassword(newPassword);
    if (passError) return toast.error(passError);
    if (newPassword !== confirmNewPassword) return toast.error('Passwords do not match');

    setIsResetLoading(true);
    try {
      const resp = await authAPI.resetPasswordForgot(resetUsername, resetOtp, newPassword);
      if (resp.success) {
        toast.success('Password reset successfully! Please sign in.');
        setShowForgotPassword(false);
        resetForgotFlow();
      } else {
        toast.error(resp.error || 'Failed to reset password');
      }
    } catch (err) {
      toast.error('Error resetting password');
    } finally {
      setIsResetLoading(false);
    }
  };

  const resetForgotFlow = () => {
    setForgotPasswordStep('username');
    setResetUsername('');
    setResetOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setCooldown(0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {isLoginView ? 'Welcome Back! Sign In' : 'Create Account / Sign Up'}
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
              <div className="flex justify-start mt-1 px-1">
                <button 
                  type="button" 
                  onClick={() => setShowForgotPassword(true)} 
                  className="text-xs text-teal-600 hover:text-teal-700 underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
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
              <div className="flex justify-center items-center px-1">
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl text-slate-800">Reset Password</h3>
                <button 
                  onClick={() => { setShowForgotPassword(false); resetForgotFlow(); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {forgotPasswordStep === 'username' && (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <p className="text-sm text-slate-500">Enter your username to receive a verification code via SMS.</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                    <input 
                      value={resetUsername} 
                      onChange={e => setResetUsername(e.target.value)} 
                      placeholder="Enter your username" 
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
                      disabled={isResetLoading}
                      className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors shadow-md disabled:opacity-70"
                    >
                      {isResetLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                </form>
              )}

              {forgotPasswordStep === 'otp' && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <p className="text-sm text-slate-500">
                    We've sent a 6-digit code to your phone <span className="font-semibold text-slate-700">{maskedPhone}</span>.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Enter OTP</label>
                    <input 
                      value={resetOtp} 
                      onChange={e => setResetOtp(e.target.value)} 
                      placeholder="6-digit code" 
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none text-center text-2xl tracking-widest font-bold"
                      maxLength={6}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-3 pt-2">
                    <button 
                      type="submit" 
                      disabled={isResetLoading}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg font-semibold transition-colors shadow-md disabled:opacity-70"
                    >
                      {isResetLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSendOTP}
                      disabled={cooldown > 0 || isResetLoading}
                      className="text-sm text-teal-600 hover:text-teal-700 disabled:text-slate-400 font-medium"
                    >
                      {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </form>
              )}

              {forgotPasswordStep === 'reset' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <p className="text-sm text-slate-500">Success! Now set a new secure password for your account.</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                    <PasswordInput 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      placeholder="Min. 8 characters with symbols" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                    <PasswordInput 
                      value={confirmNewPassword} 
                      onChange={e => setConfirmNewPassword(e.target.value)} 
                      placeholder="Repeat new password" 
                    />
                  </div>
                  
                  <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                    <p className="font-semibold text-slate-700">Password requirements:</p>
                    <ul className="list-disc list-inside grid grid-cols-1 gap-1">
                      <li>At least 8 characters</li>
                      <li>One uppercase & one lowercase letter</li>
                      <li>One number & one special character</li>
                    </ul>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isResetLoading}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg font-semibold transition-colors shadow-md disabled:opacity-70"
                  >
                    {isResetLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
