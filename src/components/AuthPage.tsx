import React, { useState, useEffect, useRef } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { authAPI, setAuthToken } from '../api';
import { PasswordInput } from './PasswordInput';
import { PatientRecordClaiming } from './PatientRecordClaiming';
import { convertToDisplayDate, formatDateInput } from '../utils/dateHelpers';

export type UserRole = 'doctor' | 'assistant' | 'patient';
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
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Signup state
  const [signupData, setSignupData] = useState<SignupData>({
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    sex: 'Male',
    username: '',
    password: '',
    role: 'patient',
  });
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Forgot password and claiming flow
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showClaimingFlow, setShowClaimingFlow] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState<SignupData | null>(null);

  const birthdatePickerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        if (parsed?.isFirstLogin && (parsed.role === 'doctor' || parsed.role === 'assistant')) {
          // show password change flow in original app; for simplicity we redirect to reload
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const updateSignupField = (field: keyof SignupData, value: any) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
  };

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!signupData.firstName || !signupData.lastName || !signupData.dateOfBirth || !signupData.address || !signupData.email || !signupData.username || !signupData.password) {
      setError('Please fill required fields');
      return;
    }
    if (signupData.password !== signupConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    // Defer to parent registration handler
    onSignup(signupData);
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!resetEmail) return setError('Please enter your email');
    setResetSent(true);
    toast.success('Password reset link (simulated)');
    setTimeout(() => {
      setShowForgotPassword(false);
      setResetEmail('');
      setResetSent(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{isLoginMode ? 'Sign In' : 'Create Account'}</h2>
          <div className="space-x-2">
            <button onClick={() => setIsLoginMode(true)} className={`px-3 py-1 rounded ${isLoginMode ? 'bg-slate-100' : ''}`}>Sign In</button>
            <button onClick={() => setIsLoginMode(false)} className={`px-3 py-1 rounded ${!isLoginMode ? 'bg-slate-100' : ''}`}>Sign Up</button>
          </div>
        </div>

        {isLoginMode && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm">Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Password</label>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
            </div>
            {error && <div className="text-red-600">{error}</div>}
            <div className="flex gap-2">
              <button type="submit" className="bg-teal-600 text-white px-4 py-2 rounded">{isLoading ? 'Signing in...' : 'Sign In'}</button>
              <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm underline">Forgot password?</button>
            </div>
          </form>
        )}

        {!isLoginMode && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="First name" value={signupData.firstName} onChange={e => updateSignupField('firstName', e.target.value)} className="border rounded p-2" />
              <input placeholder="Last name" value={signupData.lastName} onChange={e => updateSignupField('lastName', e.target.value)} className="border rounded p-2" />
            </div>
            <input placeholder="Email" value={signupData.email} onChange={e => updateSignupField('email', e.target.value)} className="border rounded p-2 w-full" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Username" value={signupData.username} onChange={e => updateSignupField('username', e.target.value)} className="border rounded p-2" />
              <input placeholder="Phone" value={signupData.phone} onChange={e => updateSignupField('phone', e.target.value)} className="border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Date of birth</label>
              <input ref={birthdatePickerRef} type="date" value={signupData.dateOfBirth} onChange={e => updateSignupField('dateOfBirth', convertToDisplayDate(e.target.value))} className="border rounded p-2 w-full" />
            </div>
            <div>
              <PasswordInput value={signupData.password} onChange={e => updateSignupField('password', e.target.value)} placeholder="Password" />
              <PasswordInput value={signupConfirmPassword} onChange={e => setSignupConfirmPassword(e.target.value)} placeholder="Confirm password" />
            </div>
            {error && <div className="text-red-600">{error}</div>}
            <div className="flex gap-2">
              <button type="submit" className="bg-teal-600 text-white px-4 py-2 rounded">Create Account</button>
            </div>
          </form>
        )}

        {/* Forgot Password Modal (simple) */}
        {showForgotPassword && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30">
            <div className="bg-white p-6 rounded shadow w-full max-w-md">
              <h3 className="font-semibold mb-2">Reset Password</h3>
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="Email" className="w-full border rounded p-2" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowForgotPassword(false)} className="px-3 py-1">Cancel</button>
                  <button type="submit" className="bg-teal-600 text-white px-3 py-1 rounded">Send</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Claiming flow placeholder */}
        {showClaimingFlow && pendingSignupData && (
          <PatientRecordClaiming onComplete={() => window.location.reload()} onCancel={() => setShowClaimingFlow(false)} isLoginFlow={false} />
        )}
      </div>
    </div>
  );
}
