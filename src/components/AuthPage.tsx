import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { AlertCircle, Check } from 'lucide-react';
import { authAPI, setAuthToken } from '../api';
import { PasswordInput } from './PasswordInput';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "./ui/input-otp";

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
  otp?: string;
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

  // Forgot password flow
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [forgotPasswordUsername, setForgotPasswordUsername] = useState('');
  const [resetOTP, setResetOTP] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [hasTriedVerify, setHasTriedVerify] = useState(false);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleRequestOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!forgotPasswordUsername) return setResetError('Please enter your username');
    
    setIsResetLoading(true);
    setResetError('');
    try {
      const resp = await authAPI.forgotPassword(forgotPasswordUsername);
      if (resp.error) {
        setResetError(resp.error);
      } else {
        setMaskedPhone(resp.phone);
        setForgotPasswordStep('verify');
        toast.success('OTP sent to your registered phone number');
        setResendCooldown(60);
        setHasTriedVerify(false);
      }
    } catch (err: any) {
      setResetError(err.message || 'Failed to send OTP');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Action depends on button state: if it's currently showing 'Resend OTP' or we have a failed try and cooldown is over
    const isResendState = (hasTriedVerify && resendCooldown === 0) || (resetOTP.length < 6 && resendCooldown === 0);
    
    if (isResendState) {
      return handleRequestOTP();
    }

    if (resetOTP.length < 6) return;

    setIsResetLoading(true);
    setResetError('');
    try {
      const resp = await authAPI.verifyOTP(forgotPasswordUsername, resetOTP);
      if (resp.error) {
        setResetError(resp.error);
        setHasTriedVerify(true);
      } else {
        setForgotPasswordStep('reset');
        toast.success('OTP verified successfully');
      }
    } catch (err: any) {
      setResetError(err.message || 'Failed to verify OTP');
      setHasTriedVerify(true);
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newResetPassword) return setResetError('Please enter a new password');
    if (newResetPassword !== confirmResetPassword) return setResetError('Passwords do not match');
    
    setIsResetLoading(true);
    setResetError('');
    try {
      const resp = await authAPI.resetPassword(forgotPasswordUsername, resetOTP, newResetPassword);
      if (resp.error) {
        setResetError(resp.error);
      } else {
        toast.success('Password reset successful. You can now log in with your new password.');
        setShowForgotPassword(false);
        setForgotPasswordStep('request');
        setIsLoginView(true);
        setUsername(forgotPasswordUsername);
        setForgotPasswordUsername('');
        setResetOTP('');
        setNewResetPassword('');
        setConfirmResetPassword('');
      }
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setIsResetLoading(false);
    }
  };

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
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    setFormSubmitted(false);
    setError('');
  }, [isLoginView]);

  useEffect(() => {
    if (signupData.email && signupData.email.includes('@')) {
      const timer = setTimeout(async () => {
        setCheckingEmail(true);
        try {
          const resp = await authAPI.checkEmail(signupData.email);
          setEmailAvailable(resp.available);
        } catch (err) {
          console.error('Email check failed:', err);
        } finally {
          setCheckingEmail(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setEmailAvailable(null);
    }
  }, [signupData.email]);

  useEffect(() => {
    if (signupData.username && signupData.username.length >= 3) {
      const timer = setTimeout(async () => {
        setCheckingUsername(true);
        try {
          const resp = await authAPI.checkUsername(signupData.username);
          setUsernameAvailable(resp.available);
        } catch (err) {
          console.error('Username check failed:', err);
        } finally {
          setCheckingUsername(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setUsernameAvailable(null);
    }
  }, [signupData.username]);

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

  const [emailOTP, setEmailOTP] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [isSendingEmailOTP, setIsSendingEmailOTP] = useState(false);
  const [emailOTPCooldown, setEmailOTPCooldown] = useState(0);
  const [showEmailOTPInput, setShowEmailOTPInput] = useState(false);

  useEffect(() => {
    let timer: any;
    if (emailOTPCooldown > 0) {
      timer = setInterval(() => {
        setEmailOTPCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [emailOTPCooldown]);

  const handleRequestEmailOTP = async () => {
    if (!signupData.email || emailAvailable === false) return;
    
    setIsSendingEmailOTP(true);
    setError('');
    try {
      const resp = await authAPI.requestSignupOTP(signupData.email);
      if (resp.error) {
        setError(resp.error);
      } else {
        toast.success("Verification code sent to your email");
        setShowEmailOTPInput(true);
        setEmailOTPCooldown(60);
      }
    } catch (err) {
      setError("Failed to send verification code");
    } finally {
      setIsSendingEmailOTP(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    if (emailOTP.length !== 6) return;
    
    setError('');
    try {
      const resp = await authAPI.verifySignupOTP(signupData.email, emailOTP);
      if (resp.error) {
        setError(resp.error);
      } else {
        setEmailVerified(true);
        setShowEmailOTPInput(false);
        toast.success("Email verified successfully");
      }
    } catch (err) {
      setError("Failed to verify code");
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setError('');

    if (!emailVerified) {
      setError("Please verify your email address first");
      return;
    }

    const passwordError = validatePassword(signupData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);
    try {
      await onSignup({ ...signupData, otp: emailOTP });
      // Wait a bit then switch to login view
      setTimeout(() => {
        setIsLoginView(true);
        setUsername(signupData.username);
        setFormSubmitted(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupChange = (field: keyof SignupData, value: string) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
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
              <div className="flex justify-end mt-1">
                <button 
                  type="button" 
                  onClick={() => setShowForgotPassword(true)} 
                  className="text-xs text-teal-600 hover:text-teal-700 underline"
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
                  className={`w-full border rounded-lg p-2.5 focus:ring-2 outline-none transition-all ${
                    (formSubmitted || signupData.fullName) && !signupData.fullName ? 'border-red-500 ring-red-500/20' : 'border-slate-300 focus:ring-teal-500'
                  }`}
                  placeholder="John Doe"
                  required
                />
                {formSubmitted && !signupData.fullName && <p className="text-[10px] text-red-500 mt-1 font-medium">Please enter your full name.</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="email"
                      value={signupData.email} 
                      onChange={e => {
                        handleSignupChange('email', e.target.value);
                        setEmailVerified(false);
                      }} 
                      disabled={emailVerified}
                      className={`w-full border rounded-lg p-2.5 focus:ring-2 outline-none transition-all ${
                        (formSubmitted && !signupData.email) || emailAvailable === false ? 'border-red-500 ring-red-500/20' : 
                        (signupData.email && emailAvailable === true && emailVerified) ? 'border-green-500 bg-green-50' : 'border-slate-300 focus:ring-teal-500'
                      }`}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  {!emailVerified && (
                    <button
                      type="button"
                      onClick={handleRequestEmailOTP}
                      disabled={!signupData.email || emailAvailable === false || isSendingEmailOTP || emailOTPCooldown > 0}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:grayscale whitespace-nowrap min-w-[80px]"
                    >
                      {isSendingEmailOTP ? 'Sending...' : emailOTPCooldown > 0 ? `Resend OTP (${emailOTPCooldown}s)` : 'Verify'}
                    </button>
                  )}
                </div>
                {emailAvailable === false && signupData.email && <p className="text-[10px] text-red-500 mt-1 font-bold bg-red-50 p-1.5 rounded-md border border-red-100 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> This email is already taken.</p>}
                {emailVerified && <p className="text-[10px] text-green-600 mt-1 font-bold flex items-center gap-1 bg-green-50 p-1.5 rounded-md border border-green-100"><Check className="w-3 h-3" /> Email verified successfully</p>}
                {formSubmitted && !signupData.email && <p className="text-[10px] text-red-500 mt-1 font-medium">Email address is required.</p>}
                
                {showEmailOTPInput && !emailVerified && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-teal-50 border border-teal-100 rounded-lg space-y-2 mt-2"
                  >
                    <p className="text-[10px] sm:text-xs font-medium text-teal-800 uppercase tracking-wider font-bold">Enter 6-digit Code:</p>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        maxLength={6}
                        value={emailOTP}
                        onChange={(e) => setEmailOTP(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="flex-1 px-3 py-2 bg-white border border-teal-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 tracking-[0.5em] font-mono text-center"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyEmailOTP}
                        disabled={emailOTP.length !== 6}
                        className="px-4 py-2 bg-teal-600 text-white rounded-md text-xs font-bold hover:bg-teal-700 disabled:opacity-50"
                      >
                        Verify
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input 
                  value={signupData.phone} 
                  onChange={e => handleSignupChange('phone', e.target.value)} 
                  className={`w-full border rounded-lg p-2.5 focus:ring-2 outline-none transition-all ${
                    (formSubmitted || signupData.phone) && !signupData.phone ? 'border-red-500 ring-red-500/20' : 'border-slate-300 focus:ring-teal-500'
                  }`}
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
                  className={`w-full border rounded-lg p-2.5 focus:ring-2 outline-none transition-all ${
                    (formSubmitted || signupData.dateOfBirth) && !signupData.dateOfBirth ? 'border-red-500 ring-red-500/20' : 'border-slate-300 focus:ring-teal-500'
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input 
                value={signupData.address} 
                onChange={e => handleSignupChange('address', e.target.value)} 
                className={`w-full border rounded-lg p-2.5 focus:ring-2 outline-none transition-all ${
                  (formSubmitted || signupData.address) && !signupData.address ? 'border-red-500 ring-red-500/20' : 'border-slate-300 focus:ring-teal-500'
                }`}
                placeholder="Enter your full home address"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input 
                  value={signupData.username} 
                  onChange={e => handleSignupChange('username', e.target.value)} 
                  className={`w-full border rounded-lg p-2.5 focus:ring-2 outline-none transition-all ${
                    (formSubmitted && !signupData.username) || usernameAvailable === false ? 'border-red-500 ring-red-500/20' : 
                    (signupData.username && usernameAvailable === true) ? 'border-green-500 bg-green-50' : 'border-slate-300 focus:ring-teal-500'
                  }`}
                  placeholder="Choose a username"
                  required
                />
                {usernameAvailable === false && signupData.username && <p className="text-[10px] text-red-500 mt-1 font-bold bg-red-50 p-1.5 rounded-md border border-red-100 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> This username is already taken.</p>}
                {usernameAvailable === true && signupData.username && <p className="text-[10px] text-green-600 mt-1 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Username is available</p>}
                {formSubmitted && !signupData.username && <p className="text-[10px] text-red-500 mt-1 font-medium">Username is required.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <PasswordInput 
                  value={signupData.password} 
                  onChange={e => handleSignupChange('password', e.target.value)} 
                  placeholder="Choose a complex password" 
                  className={(formSubmitted && !signupData.password) || (signupData.password && validatePassword(signupData.password)) ? 'border-red-500' : (signupData.password && !validatePassword(signupData.password)) ? 'border-green-500' : ''}
                />
              </div>
            </div>

            {/* Password Complexity Requirements - Moved up for visibility */}
            <div className={`border rounded-xl p-4 space-y-2 transition-all duration-300 shadow-sm ${ 
              (formSubmitted && (!signupData.password || validatePassword(signupData.password))) 
                ? 'bg-red-50 border-red-200 ring-1 ring-red-200' 
                : (signupData.password && !validatePassword(signupData.password)) 
                  ? 'bg-green-50 border-green-200 ring-1 ring-green-200' 
                  : 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
            }`}>
              <p className={`text-sm font-bold flex items-center gap-2 ${ 
                (formSubmitted && (!signupData.password || validatePassword(signupData.password))) 
                  ? 'text-red-800' 
                  : (signupData.password && !validatePassword(signupData.password)) 
                    ? 'text-green-800' 
                    : 'text-blue-800'
              }`}>
                <AlertCircle className="w-4 h-4" /> Password Requirements:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <div className={`flex items-center gap-2 text-xs ${signupData.password.length >= 8 ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${signupData.password.length >= 8 ? 'bg-green-600' : 'bg-slate-300'}`} />
                  At least 8 characters
                </div>
                <div className={`flex items-center gap-2 text-xs ${/[A-Z]/.test(signupData.password) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(signupData.password) ? 'bg-green-600' : 'bg-slate-300'}`} />
                  One uppercase (A-Z)
                </div>
                <div className={`flex items-center gap-2 text-xs ${/[a-z]/.test(signupData.password) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(signupData.password) ? 'bg-green-600' : 'bg-slate-300'}`} />
                  One lowercase (a-z)
                </div>
                <div className={`flex items-center gap-2 text-xs ${/[0-9]/.test(signupData.password) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(signupData.password) ? 'bg-green-600' : 'bg-slate-300'}`} />
                  One number (0-9)
                </div>
                <div className={`flex items-center gap-2 text-xs ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signupData.password) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signupData.password) ? 'bg-green-600' : 'bg-slate-300'}`} />
                  One symbol (@#$%)
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={
                isLoading ||
                !signupData.fullName ||
                !signupData.email || emailAvailable !== true || !emailVerified ||
                !signupData.phone ||
                !signupData.dateOfBirth ||
                !signupData.username || usernameAvailable !== true ||
                !signupData.password || validatePassword(signupData.password) !== null
              }
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:grayscale mt-2"
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        )}
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm z-[100] p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md border border-slate-100">
            <h3 className="font-bold text-lg text-slate-800 mb-4">Reset Password</h3>
            
            {forgotPasswordStep === 'request' && (
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input 
                    type="text"
                    value={forgotPasswordUsername} 
                    onChange={e => {
                      setForgotPasswordUsername(e.target.value);
                      setResetError('');
                    }} 
                    placeholder="Enter your username" 
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 outline-none transition-all ${
                      resetError && resetError.toLowerCase().includes('not found') ? 'border-red-500 ring-red-500/20' : 'border-slate-300 focus:ring-teal-500'
                    }`}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-2">We will send a 6-digit verification code to your registered phone number.</p>
                </div>
                {resetError && (
                  <div className={`p-3 rounded-lg text-sm border ${
                    resetError.toLowerCase().includes('not found') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {resetError}
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetError('');
                    }} 
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    disabled={isResetLoading}
                  >
                    Back
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

            {forgotPasswordStep === 'verify' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-4 text-center">
                    Verification code sent to <span className="font-bold text-slate-800">{maskedPhone}</span>
                  </p>
                  <label className="block text-sm font-medium text-slate-700 mb-3 text-center uppercase tracking-wider text-[11px]">Verification Code</label>
                  <div className="flex justify-center mb-6">
                    <InputOTP
                      maxLength={6}
                      value={resetOTP}
                      onChange={(value) => {
                        setResetOTP(value);
                        setHasTriedVerify(false);
                        setResetError("");
                      }}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="w-10 h-12 text-lg sm:w-12 sm:h-14 sm:text-xl border-slate-200" />
                        <InputOTPSlot index={1} className="w-10 h-12 text-lg sm:w-12 sm:h-14 sm:text-xl border-slate-200" />
                        <InputOTPSlot index={2} className="w-10 h-12 text-lg sm:w-12 sm:h-14 sm:text-xl border-slate-200" />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} className="w-10 h-12 text-lg sm:w-12 sm:h-14 sm:text-xl border-slate-200" />
                        <InputOTPSlot index={4} className="w-10 h-12 text-lg sm:w-12 sm:h-14 sm:text-xl border-slate-200" />
                        <InputOTPSlot index={5} className="w-10 h-12 text-lg sm:w-12 sm:h-14 sm:text-xl border-slate-200" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                {resetError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {resetError}
                  </div>
                )}
                <div className="flex flex-col gap-3 pt-2">
                  <button 
                    type="submit" 
                    disabled={isResetLoading || (resendCooldown > 0 && (resetOTP.length < 6 || hasTriedVerify))}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-teal-100 disabled:opacity-70 disabled:grayscale active:scale-95"
                  >
                    {isResetLoading ? 'Processing...' : (
                      (hasTriedVerify && resendCooldown > 0)
                        ? `Resend OTP in ${resendCooldown}s`
                        : (hasTriedVerify && resendCooldown === 0)
                          ? 'Resend OTP'
                          : (resetOTP.length === 6)
                            ? 'Verify OTP'
                            : (resendCooldown > 0 
                                ? `Resend OTP in ${resendCooldown}s` 
                                : 'Resend OTP')
                    )}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordStep('request');
                      setResetOTP('');
                      setResetError('');
                    }} 
                    className="w-full py-2.5 text-slate-500 hover:text-slate-800 font-semibold transition-colors text-sm"
                  >
                    Back
                  </button>
                </div>
              </form>
            )}

            {forgotPasswordStep === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                    <PasswordInput 
                      value={newResetPassword} 
                      onChange={e => setNewResetPassword(e.target.value)} 
                      placeholder="Enter new password" 
                      className={newResetPassword && validatePassword(newResetPassword) ? 'border-red-500' : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                    <PasswordInput 
                      value={confirmResetPassword} 
                      onChange={e => setConfirmResetPassword(e.target.value)} 
                      placeholder="Confirm new password" 
                      className={confirmResetPassword && confirmResetPassword !== newResetPassword ? 'border-red-500' : ''}
                    />
                  </div>
                </div>

                {/* Password Complexity Requirements */}
                <div className={`border rounded-xl p-3 space-y-1.5 transition-all duration-300 shadow-sm ${ 
                  (newResetPassword && validatePassword(newResetPassword)) 
                    ? 'bg-red-50 border-red-200 ring-1 ring-red-200' 
                    : (newResetPassword && !validatePassword(newResetPassword)) 
                      ? 'bg-green-50 border-green-200 ring-1 ring-green-200' 
                      : 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                }`}>
                  <p className={`text-[12px] font-bold flex items-center gap-2 ${ 
                    (newResetPassword && validatePassword(newResetPassword)) 
                      ? 'text-red-800' 
                      : (newResetPassword && !validatePassword(newResetPassword)) 
                        ? 'text-green-800' 
                        : 'text-blue-800'
                  }`}>
                    <AlertCircle className="w-3.5 h-3.5" /> Password Requirements:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mt-1">
                    <div className={`flex items-center gap-2 text-[10px] sm:text-xs ${newResetPassword.length >= 8 ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${newResetPassword.length >= 8 ? 'bg-green-600' : 'bg-slate-300'}`} />
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] sm:text-xs ${/[A-Z]/.test(newResetPassword) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(newResetPassword) ? 'bg-green-600' : 'bg-slate-300'}`} />
                      One uppercase (A-Z)
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] sm:text-xs ${/[a-z]/.test(newResetPassword) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(newResetPassword) ? 'bg-green-600' : 'bg-slate-300'}`} />
                      One lowercase (a-z)
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] sm:text-xs ${/[0-9]/.test(newResetPassword) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(newResetPassword) ? 'bg-green-600' : 'bg-slate-300'}`} />
                      One number (0-9)
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] sm:text-xs ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newResetPassword) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newResetPassword) ? 'bg-green-600' : 'bg-slate-300'}`} />
                      One symbol (@#$%)
                    </div>
                  </div>
                </div>

                {resetError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                    {resetError}
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetError('');
                    }} 
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    disabled={isResetLoading}
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    disabled={isResetLoading || !newResetPassword || validatePassword(newResetPassword) !== null || newResetPassword !== confirmResetPassword}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors shadow-md disabled:opacity-70"
                  >
                    {isResetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
