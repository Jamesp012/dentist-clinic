import { useState, useEffect, useRef } from 'react';
import { User, Lock, LogIn, UserPlus, Mail, Phone, Calendar, MapPin, Shield, Stethoscope } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { authAPI, setAuthToken } from '../api';
import { PasswordInput } from './PasswordInput';
import { handlePhoneInput, formatPhoneNumber } from '../utils/phoneValidation';
import { PatientRecordClaiming } from './PatientRecordClaiming';
import { convertToDBDate, convertToDisplayDate, formatDateInput, formatToDD_MM_YYYY } from '../utils/dateHelpers';

export type UserRole = 'doctor' | 'assistant' | 'patient';

export type UserPosition = 'dentist' | 'assistant_dentist' | 'assistant' | null;

export type User = {
  id: string;
  username: string;
  role: UserRole;
  position?: UserPosition;
  fullName: string;
  email?: string;
  phone?: string;
  patientId?: string;
  isFirstLogin?: boolean;
};

type AuthPageProps = {
  onLogin: (username: string, password: string) => void;
  onSignup: (signupData: SignupData) => void;
};

export type SignupData = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  sex: 'Male' | 'Female';
  username: string;
  password: string;
  role: UserRole;
};

export function AuthPage({ onLogin, onSignup }: AuthPageProps) {
  const birthdatePickerRef = useRef<HTMLInputElement | null>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  
  // New state for patient record claiming flow
  const [showClaimingFlow, setShowClaimingFlow] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState<SignupData | null>(null);
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  const [signupData, setSignupData] = useState<SignupData>({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    sex: 'Male',
    username: '',
    password: '',
    role: 'patient'
  });

  // Check if user is logged in and needs password change
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      // Only show password change for employees (doctor/assistant) on first login
      if (userData.isFirstLogin && (userData.role === 'doctor' || userData.role === 'assistant')) {
        setLoggedInUser(userData);
        setShowPasswordChange(true);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.login(username, password);
      if (response.token && response.user) {
        // Cast to include optional patientId that backend provides
        const userWithPatient = response.user as typeof response.user & { patientId?: string | number };

        setAuthToken(response.token);
        localStorage.setItem('user', JSON.stringify(userWithPatient));
        
        // Check if first-time login for employees only (not patients)
        if (userWithPatient.isFirstLogin && (userWithPatient.role === 'doctor' || userWithPatient.role === 'assistant')) {
          setLoggedInUser(userWithPatient);
          setShowPasswordChange(true);
          setIsLoading(false);
          return;
        }
        
        // Patients: if already linked to a patient record, go straight to the patient portal
        if (userWithPatient.role === 'patient') {
          if (userWithPatient.patientId) {
            // Token and user are already saved, trigger page reload to let App.tsx detect logged-in user
            toast.success('Login successful!');
            setTimeout(() => {
              window.location.reload();
            }, 500);
            return;
          }

          // Otherwise, guide them through the claiming flow to link an existing record
          setLoggedInUser(userWithPatient);
          setShowClaimingFlow(true);
          setIsLoading(false);
          return;
        }

        // Non-patient users (doctor/assistant): token and user already saved, reload to detect in App.tsx
        toast.success('Login successful!');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (err) {
      setError('Login failed - Backend error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await authAPI.changePassword(loggedInUser.id, newPassword);
      
      if (response.message || response.success || !response.error) {
        // Update user data
        const updatedUser = { ...loggedInUser, isFirstLogin: false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success('Password changed successfully! Redirecting...');
        
        // Trigger login to continue to dashboard
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError('Failed to change password');
      }
    } catch (err) {
      setError('Failed to change password - Backend error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!signupData.fullName || !signupData.email || !signupData.username || !signupData.password) {
      setError('Please fill in all required fields');
      return;
    }

    // Check if passwords match
    if (signupData.password !== signupConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Store signup data and go directly to claiming flow
    setPendingSignupData(signupData);
    setShowClaimingFlow(true);
  };

  // Handle completion of claiming flow
  const handleClaimingComplete = (_user: any, _token: string) => {
    // User is already logged in with their claimed account
    // Redirect will happen from parent
    window.location.reload();
  };

  // Handle canceling claiming flow (user wants new account or has no records)
  const handleClaimingCancel = async () => {
    setShowClaimingFlow(false);
    
    // If user is already logged in (from login), just proceed to dashboard (no record)
    if (loggedInUser && loggedInUser.patientId) {
      // They came from login claiming flow, just proceed
      setTimeout(() => {
        window.location.reload();
      }, 500);
      return;
    }
    
    // If user is from signup claiming flow and wants to cancel
    if (pendingSignupData) {
      // They came from signup claiming flow, so register without record linking
      setIsLoading(true);
      try {
        const response = await authAPI.register(pendingSignupData);
        if (response.message) {
          toast.success('Account created successfully! Please login with your credentials.');
          // Switch to login mode after successful signup
          setIsLoginMode(true);
          // Clear signup form
          setSignupData({
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
          setPendingSignupData(null);
          setError('');
        } else {
          setError(response.error || 'Signup failed');
        }
      } catch (err) {
        setError('Signup failed - Backend error');
      } finally {
        setIsLoading(false);
      }
      return;
    }
  };

  const updateSignupField = (field: keyof SignupData, value: string) => {
    setSignupData({ ...signupData, [field]: value });
  };

  // Show claiming flow for patient signup or login
  if (showClaimingFlow && pendingSignupData?.role === 'patient') {
    // Signup flow - patient with existing record
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-2xl w-full border border-teal-100/50 relative z-10"
        >
          <PatientRecordClaiming
            onComplete={handleClaimingComplete}
            onCancel={handleClaimingCancel}
            isLoginFlow={false}
          />
        </motion.div>
      </div>
    );
  }

  // Login claiming flow
  if (showClaimingFlow && loggedInUser?.role === 'patient') {
    // Login flow - patient already has account, verify/link records
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-2xl w-full border border-teal-100/50 relative z-10"
        >
          <PatientRecordClaiming
            onComplete={handleClaimingComplete}
            onCancel={handleClaimingCancel}
            isLoginFlow={true}
            loggedInUser={loggedInUser}
          />
        </motion.div>
      </div>
    );
  }

  // Show password change modal if first-time login
  if (showPasswordChange && loggedInUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-md w-full border border-teal-100/50 relative z-10"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-4 shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Change Your Password</h2>
            <p className="text-slate-600">Welcome, {loggedInUser.fullName}! Please set a new password to continue.</p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">New Password *</label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Confirm Password *</label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-red-50 border border-red-200 rounded-xl"
              >
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl font-medium"
            >
              {isLoading ? 'Changing Password...' : 'Change Password & Continue'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-6xl flex items-center justify-center gap-12 relative z-10 max-h-screen overflow-hidden">
        {/* Left side - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex flex-col items-start max-w-md"
        >
          <div className="mb-8 flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-xl">
              <span className="text-4xl">🦷</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                DentaCare
              </h1>
              <p className="text-lg text-teal-600 font-medium">Professional Clinic System</p>
            </div>
          </div>
          
          <div className="space-y-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">Secure & Professional</h3>
                <p className="text-slate-600">HIPAA-compliant patient data management with role-based access control</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">Complete Management</h3>
                <p className="text-slate-600">Appointments, inventory, charting, and financial reporting in one place</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">Patient-Centered Care</h3>
                <p className="text-slate-600">Interactive dental charting, digital records, and patient portal access</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right side - Auth Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md border border-teal-100/50 max-h-[90vh] flex flex-col"
        >
          <div className="text-center mb-8 flex-shrink-0">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl mb-4 shadow-lg"
            >
              {isLoginMode ? (
                <LogIn className="w-8 h-8 text-white" />
              ) : (
                <UserPlus className="w-8 h-8 text-white" />
              )}
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {isLoginMode ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-600">
              {isLoginMode ? 'Sign in to access your portal' : 'Join our dental care platform'}
            </p>
          </div>

          {/* Toggle between Login and Signup */}
          <div className="flex mb-6 bg-slate-100 rounded-xl p-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(true);
                setError('');
                setSignupConfirmPassword('');
              }}
              className={`flex-1 py-2.5 rounded-lg transition-all duration-300 font-medium ${
                isLoginMode
                  ? 'bg-white shadow-md text-teal-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(false);
                setError('');
                setSignupConfirmPassword('');
              }}
              className={`flex-1 py-2.5 rounded-lg transition-all duration-300 font-medium ${
                !isLoginMode
                  ? 'bg-white shadow-md text-teal-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          {isLoginMode ? (
            // Login Form
            <form onSubmit={handleLogin} className="space-y-5 flex-shrink-0">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Username</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Enter username"
                    autoComplete="username"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-red-50 border border-red-200 rounded-xl"
                >
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl font-medium"
              >
                <LogIn className="w-5 h-5" />
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            // Signup Form
            <form onSubmit={handleSignup} className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Full Name *</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={signupData.fullName}
                    onChange={(e) => updateSignupField('fullName', e.target.value)}
                    required
                    placeholder="Enter your full name"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Email *</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={signupData.email}
                    onChange={(e) => updateSignupField('email', e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Phone Number</label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={signupData.phone}
                    onChange={(e) => handlePhoneInput(e.target.value, (formatted) => updateSignupField('phone', formatted))}
                    onBlur={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      if (formatted !== e.target.value) {
                        updateSignupField('phone', formatted);
                      }
                    }}
                    placeholder="+63 912 345 6789"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={signupData.dateOfBirth}
                      onChange={(e) => updateSignupField('dateOfBirth', formatDateInput(e.target.value))}
                      placeholder="DD/MM/YYYY"
                      className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        birthdatePickerRef.current?.focus();
                        if (birthdatePickerRef.current?.showPicker) {
                          birthdatePickerRef.current.showPicker();
                        } else {
                          birthdatePickerRef.current?.click();
                        }
                      }}
                      className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Open calendar"
                    >
                      <Calendar className="w-5 h-5" />
                    </button>
                    <input
                      ref={birthdatePickerRef}
                      type="date"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 cursor-pointer"
                      onChange={(e) => updateSignupField('dateOfBirth', convertToDisplayDate(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700">Sex</label>
                  <select
                    value={signupData.sex}
                    onChange={(e) => updateSignupField('sex', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Address</label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                  <textarea
                    value={signupData.address}
                    onChange={(e) => updateSignupField('address', e.target.value)}
                    placeholder="Enter your address"
                    rows={2}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700">Username *</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={signupData.username}
                      onChange={(e) => updateSignupField('username', e.target.value)}
                      required
                      placeholder="Choose a username"
                      autoComplete="username"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2 text-slate-700">Password *</label>
                  <PasswordInput
                    value={signupData.password}
                    onChange={(e) => updateSignupField('password', e.target.value)}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2 text-slate-700">Confirm Password *</label>
                  <PasswordInput
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    required
                  />
                </div>


              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-red-50 border border-red-200 rounded-xl"
                >
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl font-medium"
              >
                <UserPlus className="w-5 h-5" />
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
