import { motion } from 'motion/react';
import { Stethoscope, Users, Award, Heart, MapPin, Phone, Mail, ChevronLeft, ChevronRight, User, Lock, LogIn, UserPlus, Calendar, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { convertToDBDate, convertToDisplayDate, formatDateInput } from '../../utils/dateHelpers';
import { authAPI } from '../../api';
import { toast } from 'sonner';
import { PasswordInput } from '../PasswordInput';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "./input-otp";

export type LandingPageProps = {
  onGetStarted?: () => void;
  onLogin?: (username: string, password: string) => void;
  onSignup?: (signupData: any) => void;
  onForgotPassword?: () => void;
};

export function LandingPage({ onGetStarted, onLogin, onSignup, onForgotPassword }: LandingPageProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    if (hasTriedVerify && resendCooldown === 0) {
      return handleRequestOTP();
    }
    
    if (!resetOTP) return setResetError('Please enter the OTP');
    
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
        setIsLoginMode(true);
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
    try {
      const resp = await authAPI.requestSignupOTP(signupData.email);
      if (resp.error) {
        toast.error(resp.error);
      } else {
        toast.success("Verification code sent to your email");
        setShowEmailOTPInput(true);
        setEmailOTPCooldown(60);
      }
    } catch (err) {
      toast.error("Failed to send verification code");
    } finally {
      setIsSendingEmailOTP(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    if (emailOTP.length !== 6) return;
    
    try {
      const resp = await authAPI.verifySignupOTP(signupData.email, emailOTP);
      if (resp.error) {
        toast.error(resp.error);
      } else {
        setEmailVerified(true);
        setShowEmailOTPInput(false);
        toast.success("Email verified successfully");
      }
    } catch (err) {
      toast.error("Failed to verify code");
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);

    if (!emailVerified) {
      toast.error("Please verify your email first");
      return;
    }

    if (signupData.password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    const passwordError = validatePassword(signupData.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    
    try {
      await onSignup?.({ ...signupData, otp: emailOTP });
      // Successfully registered - switch to login mode
      setTimeout(() => {
        setIsLoginMode(true);
        setUsername(signupData.username);
        setFormSubmitted(false);
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    }
  };

  const birthdatePickerRef = useRef<HTMLInputElement | null>(null);  const [activeNav, setActiveNav] = useState('home');
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);  
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    sex: 'Male' as 'Male' | 'Female',
    username: '',
    password: '',
    role: 'patient' as const
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Reset validation state when switching modes
  useEffect(() => {
    setFormSubmitted(false);
  }, [isLoginMode]);

  // Real-time validation for Username
  useEffect(() => {
    if (!signupData.username || signupData.username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const resp = await authAPI.checkUsername(signupData.username);
        setUsernameAvailable(resp.available);
      } catch (err) {
        console.error('Failed to check username', err);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [signupData.username]);

  // Real-time validation for Email
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!signupData.email || !emailRegex.test(signupData.email)) {
      setEmailAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingEmail(true);
      try {
        const resp = await authAPI.checkEmail(signupData.email);
        setEmailAvailable(resp.available);
      } catch (err) {
        console.error('Failed to check email', err);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [signupData.email]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // If starts with 09, convert to +639
    if (digits.startsWith('09')) {
      return '+63' + digits.slice(1);
    }
    // If starts with 63, add +
    if (digits.startsWith('63')) {
      return '+' + digits;
    }
    // If already formatted or other format, return as is
    return value;
  };

  const updateNameFields = (field: 'firstName' | 'lastName', value: string) => {
    const updated = { ...signupData, [field]: value };
    const first = (updated.firstName || '').trim();
    const last = (updated.lastName || '').trim();
    updated.fullName = [first, last].filter(Boolean).join(' ');
    setSignupData(updated);
  };

  const slides = [
    {
      icon: Stethoscope,
      title: 'Expert Dental Care',
      description: 'Comprehensive dental services for the whole family'
    },
    {
      icon: Users,
      title: 'Patient Care Excellence',
      description: 'Personalized treatment with your comfort in mind'
    },
    {
      icon: Award,
      title: 'Professional Excellence',
      description: 'State-of-the-art technology and proven expertise'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onResize = () => setIsLargeScreen(window.innerWidth >= 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Render auth panel directly to avoid input focus issues with useMemo
  const renderAuthPanel = () => (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300" style={{ height: 'min(640px, calc(100vh - 120px))' }}>
      {/* Fixed Header with Tabs */}
      <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-slate-200 flex-shrink-0 bg-gradient-to-b from-white to-slate-50">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-14 sm:w-16 h-14 sm:h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl mb-3 sm:mb-4 shadow-lg"
          >
            {isLoginMode ? (
              <LogIn className="w-7 sm:w-8 h-7 sm:h-8 text-white" />
            ) : (
              <UserPlus className="w-7 sm:w-8 h-7 sm:h-8 text-white" />
            )}
          </motion.div>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              {isLoginMode ? 'Access your account to manage your appointments' : 'Join us to start your dental care journey'}
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl mt-6">
            <button
              onClick={() => {
                setIsLoginMode(true);
                setFormSubmitted(false);
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                isLoginMode 
                  ? 'bg-white text-teal-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLoginMode(false);
                setFormSubmitted(false);
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                !isLoginMode 
                  ? 'bg-white text-teal-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

      {/* Form Content - Centered for Sign In, Scrollable for Sign Up */}
      <div className={`px-6 sm:px-8 py-5 sm:py-6 flex-grow overflow-hidden flex flex-col ${isLoginMode ? 'justify-center' : ''}`}>
        {isLoginMode ? (
          /* Login Form - No scrolling needed */
          <form onSubmit={(e) => { e.preventDefault(); onLogin?.(username, password); }} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="login-username" className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700">Username</label>
              <div className="relative">
                <User className="w-4 sm:w-5 h-4 sm:h-5 absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input id="login-username" name="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Enter username" className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm sm:text-base" />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700">Password</label>
              <div className="relative">
                <Lock className="w-4 sm:w-5 h-4 sm:h-5 absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter password" className="w-full pl-10 sm:pl-11 pr-11 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm sm:text-base" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 sm:right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">{showPassword ? <EyeOff className="w-4 sm:w-5 h-4 sm:h-5" /> : <Eye className="w-4 sm:w-5 h-4 sm:h-5" />}</button>
              </div>
              <div className="flex justify-end mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs sm:text-sm text-teal-600 hover:text-teal-700 underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 sm:py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl font-semibold mt-6 sm:mt-8 text-sm sm:text-base"><LogIn className="w-4 sm:w-5 h-4 sm:h-5" />Sign In</button>
          </form>
        ) : (
          <div className="overflow-y-auto pr-2 -mr-2 scrollbar-light" style={{ maxHeight: '100%' }}>
            <form onSubmit={handleSignupSubmit} className="space-y-4 sm:space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-slate-700">First Name</label>
                  <input 
                    type="text" 
                    value={signupData.firstName} 
                    onChange={(e) => updateNameFields('firstName', e.target.value)} 
                    required 
                    placeholder="John" 
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-all ${
                      formSubmitted && !signupData.firstName ? 'border-red-500 ring-red-500/20' : 'border-slate-200 focus:ring-teal-500'
                    }`} 
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-slate-700">Last Name</label>
                  <input 
                    type="text" 
                    value={signupData.lastName} 
                    onChange={(e) => updateNameFields('lastName', e.target.value)} 
                    required 
                    placeholder="Doe" 
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-all ${
                      formSubmitted && !signupData.lastName ? 'border-red-500 ring-red-500/20' : 'border-slate-200 focus:ring-teal-500'
                    }`} 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-slate-700">Email Address</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className={`w-3.5 sm:w-4 h-3.5 sm:h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${ (formSubmitted && !signupData.email) || emailAvailable === false ? 'text-red-500' : 'text-slate-400'}`} />
                    <input 
                      type="email" 
                      value={signupData.email} 
                      onChange={(e) => {
                        setSignupData({ ...signupData, email: e.target.value });
                        setEmailVerified(false);
                      }} 
                      required 
                      disabled={emailVerified}
                      placeholder="john@example.com" 
                      className={`w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-all ${
                        (formSubmitted && !signupData.email) || emailAvailable === false ? 'border-red-500 ring-red-500/20' : 'border-slate-200 focus:ring-teal-500'
                      } ${emailVerified ? 'bg-green-50 border-green-200 text-green-700' : ''}`} 
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
                {emailAvailable === false && signupData.email && <p className="text-[10px] text-red-500 mt-1 font-medium">This email is already taken or invalid.</p>}
                {emailVerified && <p className="text-[10px] text-green-600 mt-1 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Email verified successfully</p>}
                
                {showEmailOTPInput && !emailVerified && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-teal-50 border border-teal-100 rounded-lg space-y-2 mt-2"
                  >
                    <p className="text-[10px] sm:text-xs font-medium text-teal-800">Enter the 6-digit code sent to your email:</p>
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

              <div>
                <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-slate-700">Phone Number</label>
                <div className="relative">
                  <Phone className={`w-3.5 sm:w-4 h-3.5 sm:h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${formSubmitted && !signupData.phone ? 'text-red-500' : 'text-slate-400'}`} />
                  <input 
                    type="tel" 
                    value={signupData.phone} 
                    onChange={(e) => setSignupData({ ...signupData, phone: formatPhoneNumber(e.target.value) })} 
                    required 
                    placeholder="+63 912 345 6789" 
                    className={`w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-all ${
                      formSubmitted && !signupData.phone ? 'border-red-500 ring-red-500/20' : 'border-slate-200 focus:ring-teal-500'
                    }`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-slate-700">Date of Birth</label>
                  <div className="relative group">
                    <Calendar className={`w-3.5 sm:w-4 h-3.5 sm:h-4 absolute left-3 top-1/2 transform -translate-y-1/2 group-focus-within:text-teal-500 transition-colors pointer-events-none z-10 ${formSubmitted && !signupData.dateOfBirth ? 'text-red-500' : 'text-slate-400'}`} />
                    <input 
                      ref={birthdatePickerRef} 
                      type="date" 
                      value={convertToDBDate(signupData.dateOfBirth)} 
                      onChange={(e) => setSignupData({ ...signupData, dateOfBirth: convertToDisplayDate(e.target.value) })} 
                      required 
                      className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-all appearance-none cursor-pointer ${
                        formSubmitted && !signupData.dateOfBirth ? 'border-red-500 ring-red-500/20' : 'border-slate-200 focus:ring-teal-500'
                      }`} 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-slate-700">Sex</label>
                  <select value={signupData.sex} onChange={(e) => setSignupData({ ...signupData, sex: e.target.value as 'Male' | 'Female' })} className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer transition-all">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-slate-700">Username</label>
                <div className="relative">
                  <User className={`w-3.5 sm:w-4 h-3.5 sm:h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${ (formSubmitted && !signupData.username) || usernameAvailable === false ? 'text-red-500' : 'text-slate-400'}`} />
                  <input 
                    type="text" 
                    value={signupData.username} 
                    onChange={(e) => setSignupData({ ...signupData, username: e.target.value })} 
                    required 
                    placeholder="Choose a username" 
                    className={`w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-all ${
                      (formSubmitted && !signupData.username) || usernameAvailable === false ? 'border-red-500 ring-red-500/20' : 'border-slate-200 focus:ring-teal-500'
                    }`} 
                  />
                </div>
                {usernameAvailable === false && signupData.username && <p className="text-[10px] text-red-500 mt-1 font-medium">This username is already taken.</p>}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-slate-700">Password</label>
                  <div className="relative">
                    <Lock className={`w-3.5 sm:w-4 h-3.5 sm:h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${ (formSubmitted && !signupData.password) || (signupData.password && validatePassword(signupData.password)) ? 'text-red-500' : 'text-slate-400'}`} />
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={signupData.password} 
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })} 
                      required 
                      placeholder="Create password"
                      className={`w-full pl-9 sm:pl-10 pr-9 py-2 sm:py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-all ${
                        (formSubmitted && !signupData.password) || (signupData.password && validatePassword(signupData.password)) ? 'border-red-500 ring-red-500/20' : 'border-slate-200 focus:ring-teal-500'
                      }`} 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Eye className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-slate-700">Confirm</label>
                  <div className="relative">
                    <Lock className={`w-3.5 sm:w-4 h-3.5 sm:h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${ (formSubmitted && !confirmPassword) || (confirmPassword && confirmPassword !== signupData.password) ? 'text-red-500' : 'text-slate-400'}`} />
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      required 
                      placeholder="Confirm password"
                      className={`w-full pl-9 sm:pl-10 pr-9 py-2 sm:py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-all ${
                        (formSubmitted && !confirmPassword) || (confirmPassword && confirmPassword !== signupData.password) ? 'border-red-500 ring-red-500/20' : 'border-slate-200 focus:ring-teal-500'
                      }`} 
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">{showConfirmPassword ? <EyeOff className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Eye className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}</button>
                  </div>
                </div>
              </div>

              {/* Password Complexity Requirements - Moved up for visibility */}
              <div className={`border rounded-xl p-3 sm:p-4 space-y-2 transition-all duration-300 shadow-sm ${ 
                (formSubmitted && (!signupData.password || validatePassword(signupData.password))) 
                  ? 'bg-red-50 border-red-200 ring-1 ring-red-200' 
                  : (signupData.password && !validatePassword(signupData.password)) 
                    ? 'bg-green-50 border-green-200 ring-1 ring-green-200' 
                    : 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
              }`}>
                <p className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${ 
                  (formSubmitted && (!signupData.password || validatePassword(signupData.password))) 
                    ? 'text-red-800' 
                    : (signupData.password && !validatePassword(signupData.password)) 
                      ? 'text-green-800' 
                      : 'text-blue-800'
                }`}>
                  <AlertCircle className="w-4 h-4" /> Password Requirements:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <div className={`flex items-center gap-2 text-[10px] sm:text-xs ${signupData.password.length >= 8 ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${signupData.password.length >= 8 ? 'bg-green-600' : 'bg-slate-300'}`} />
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] sm:text-xs ${/[A-Z]/.test(signupData.password) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(signupData.password) ? 'bg-green-600' : 'bg-slate-300'}`} />
                    One uppercase (A-Z)
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] sm:text-xs ${/[a-z]/.test(signupData.password) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(signupData.password) ? 'bg-green-600' : 'bg-slate-300'}`} />
                    One lowercase (a-z)
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] sm:text-xs ${/[0-9]/.test(signupData.password) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(signupData.password) ? 'bg-green-600' : 'bg-slate-300'}`} />
                    One number (0-9)
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] sm:text-xs ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signupData.password) ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signupData.password) ? 'bg-green-600' : 'bg-slate-300'}`} />
                    One symbol (@#$%)
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={
                  !signupData.firstName || 
                  !signupData.lastName || 
                  !signupData.email || emailAvailable !== true || emailVerified !== true ||
                  !signupData.phone ||
                  !signupData.dateOfBirth ||
                  !signupData.username || usernameAvailable !== true ||
                  !signupData.password || validatePassword(signupData.password) !== null ||
                  signupData.password !== confirmPassword
                }
                className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl font-semibold mt-4 sm:mt-6 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
              >
                <UserPlus className="w-4 sm:w-5 h-4 sm:h-5" />Create Account
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  // Handle scroll detection for active nav
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'services', 'contact', 'about'];
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Active if section is in viewport or passed
          if (rect.top <= 100) {
            setActiveNav(section);
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  
  const handleGetStarted = () => {
    setShowAuthForm(true);
  };


  return (
    <div className="w-full bg-white overflow-x-hidden">

      {/* Header */}
      <header className="w-full bg-white shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center h-12">
            <img 
              src="/maano-logo.png" 
              alt="MAANO Dental Care" 
              className="h-full object-contain"
              style={{ maxHeight: '48px' }}
            />
          </div>
          {/* Navigation */}
          <nav className="hidden md:flex gap-8">
            {/* Home */}
            <button 
              onMouseEnter={() => setHoveredNav('home')}
              onMouseLeave={() => setHoveredNav(null)}
              onClick={() => {
                setActiveNav('home');
                const element = document.getElementById('home');
                if (element) {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }} 
              className={`relative pb-2 font-medium transition-all duration-300 ${
                activeNav === 'home' 
                  ? 'text-teal-600' 
                  : 'text-slate-600 hover:text-teal-600'
              }`}>
              Home
              <span className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300 ease-out origin-left ${
                activeNav === 'home' || hoveredNav === 'home' ? 'w-full' : 'w-0'
              }`}></span>
            </button>
            
            {/* Services */}
            <button 
              onMouseEnter={() => setHoveredNav('services')}
              onMouseLeave={() => setHoveredNav(null)}
              onClick={() => {
                setActiveNav('services');
                const element = document.getElementById('services');
                if (element) {
                  const offset = 80;
                  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                  window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
                }
              }} 
              className={`relative pb-2 font-medium transition-all duration-300 ${
                activeNav === 'services' 
                  ? 'text-teal-600' 
                  : 'text-slate-600 hover:text-teal-600'
              }`}>
              Services
              <span className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300 ease-out origin-left ${
                activeNav === 'services' || hoveredNav === 'services' ? 'w-full' : 'w-0'
              }`}></span>
            </button>
            
            {/* Contact */}
            <button 
              onMouseEnter={() => setHoveredNav('contact')}
              onMouseLeave={() => setHoveredNav(null)}
              onClick={() => {
                setActiveNav('contact');
                const element = document.getElementById('contact');
                if (element) {
                  const offset = 80;
                  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                  window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
                }
              }} 
              className={`relative pb-2 font-medium transition-all duration-300 ${
                activeNav === 'contact' 
                  ? 'text-teal-600' 
                  : 'text-slate-600 hover:text-teal-600'
              }`}>
              Contact
              <span className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300 ease-out origin-left ${
                activeNav === 'contact' || hoveredNav === 'contact' ? 'w-full' : 'w-0'
              }`}></span>
            </button>
            
            {/* About */}
            <button 
              onMouseEnter={() => setHoveredNav('about')}
              onMouseLeave={() => setHoveredNav(null)}
              onClick={() => {
                setActiveNav('about');
                const element = document.getElementById('about');
                if (element) {
                  const offset = 80;
                  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                  window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
                }
              }} 
              className={`relative pb-2 font-medium transition-all duration-300 ${
                activeNav === 'about' 
                  ? 'text-teal-600' 
                  : 'text-slate-600 hover:text-teal-600'
              }`}>
              About
              <span className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300 ease-out origin-left ${
                activeNav === 'about' || hoveredNav === 'about' ? 'w-full' : 'w-0'
              }`}></span>
            </button>
          </nav>
        </div>
      </header>
      {/* Hero Section */}
      <section id="home" className="min-h-screen relative overflow-hidden pt-24 pb-16 flex items-center">
        {/* Dental Office Photo Background */}
        <div className="absolute inset-0">
          {/* Background image with blur */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1920&q=80)',
              filter: 'blur(4px)',
            }}
          ></div>
          
          {/* Overlay for text readability and color harmony */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/40 via-cyan-500/30 to-blue-400/40"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/40 to-transparent"></div>
          
          {/* Additional subtle overlays for depth */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8 hidden lg:block"
            >
              <div>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-block mb-6"
                >
                  <span className="px-4 py-2 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-900 rounded-full text-sm font-bold uppercase tracking-wider">💎 Transform Your Smile Today</span>
                </motion.div>
                <h1 className="text-6xl lg:text-7xl font-black mb-6 leading-tight text-slate-900">
                  Quality Dental Care for Every Smile
                </h1>
                <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                  Because Every Smile Deserves Care
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-2xl text-lg transform hover:scale-105"
                >
                  Get Started Today
                </button>
                {/* Learn More button removed per design */}
              </div>

            </motion.div>

            {/* Right side - Slideshow or Auth Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full flex justify-center lg:block"
            >
                {/* Always show on mobile, only show after Get Started on desktop */}
                {(showAuthForm || !isLargeScreen) && renderAuthPanel()}
            </motion.div>
          </div>
        </div>
      </section>

      

      {/* Features Section */}
      <section id="services" className="min-h-screen py-20 bg-white flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Our Services</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Comprehensive dental care services for your entire family's oral health
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'Consultation',
                description: 'Personalized assessment and treatment planning for your dental needs.'
              },
              {
                icon: Heart,
                title: 'Cleaning',
                description: 'Professional dental cleaning and polishing to maintain oral health.'
              },
              {
                icon: Award,
                title: 'Restorative',
                description: 'Fillings, crowns, and bridges to restore function and appearance.'
              },
              {
                icon: Stethoscope,
                title: 'Extraction',
                description: 'Safe tooth removal and post-extraction care to relieve pain or infection.'
              },
              {
                icon: UserPlus,
                title: 'Orthodontic',
                description: 'Braces and aligners to correct alignment and bite issues.'
              },
              {
                icon: MapPin,
                title: 'Prosthetics',
                description: 'Dentures and dental prostheses to replace missing teeth and restore function.'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-xl hover:shadow-lg transition-all duration-300"
              >
                <feature.icon className="w-12 h-12 text-teal-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Get In Touch</h2>
            <p className="text-xl text-slate-600">Have questions? We'd love to hear from you</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[
              {
                icon: Phone,
                title: 'Phone',
                value: 'Telephone: (042) 7171156\nMobile: 09773651397',
                desc: ''
              },
              {
                icon: MapPin,
                title: 'Address',
                value: '#29 Emilio Jacinto St. San Diego Zone 2',
                desc: 'City of Tayabas, 4327 Quezon Province'
              }
            ].map((contact, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-xl text-center hover:shadow-lg transition-all duration-300"
              >
                <contact.icon className="w-12 h-12 text-teal-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{contact.title}</h3>
                {index === 0 ? (
                  <div className="text-slate-700 font-medium mb-1">
                    <p>Telephone: (042) 7171156</p>
                    <p>Mobile: 09773651397</p>
                  </div>
                ) : (
                  <p className="text-slate-700 font-medium mb-1">{contact.value}</p>
                )}
                <p className="text-sm text-slate-600">{contact.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Clinic Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-12 text-center">About Our Clinic</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
              <div className="space-y-6">
                <p className="text-lg text-slate-700 leading-relaxed">
                  Maaño Dental Care is an established dental clinic dedicated to providing exceptional oral healthcare to our community. With a commitment to excellence and patient comfort, we combine modern dental technology with personalized, compassionate care that puts our patients' needs first.
                </p>
                <p className="text-lg text-slate-700 leading-relaxed">
                  Our team of experienced dental professionals stays at the forefront of modern dental practices and the latest advancements in dentistry. We follow the highest standards of infection control and patient safety, ensuring that every patient receives care in a clean, safe, and professional environment.
                </p>
                <p className="text-lg text-slate-700 leading-relaxed">
                  We believe that trustworthy relationships are built on transparency, quality care, and genuine concern for our patients' dental health and overall wellbeing. Every member of our team is dedicated to helping you achieve and maintain a healthy, beautiful smile.
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Award className="w-6 h-6 text-teal-600" />
                    Professional Excellence
                  </h3>
                  <p className="text-slate-600">We maintain the highest standards of clinical care, continuing education, and professional ethics in all our treatments</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Heart className="w-6 h-6 text-teal-600" />
                    Compassionate Care
                  </h3>
                  <p className="text-slate-600">Your comfort and wellbeing are our priority. We listen to your concerns and create personalized treatment plans tailored to your needs</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Stethoscope className="w-6 h-6 text-teal-600" />
                    Modern Technology
                  </h3>
                  <p className="text-slate-600">We invest in state-of-the-art dental equipment and techniques to provide efficient, effective, and comfortable treatment</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Developers Section */}
      <section className="py-20 bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Meet Our Developers</h2>
            <p className="text-xl text-slate-600">The developers behind the web presence and tools supporting Maaño Dental Care</p>
          </motion.div>

          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-2xl">
            {[
              {
                name: 'Krista Lyn A. Gob',
                role: 'Computer Engineering | Researcher',
                bio: 'Southern Luzon State University - Class of 2026'
              },
              {
                name: 'Sarah J. Zarsadias',
                role: 'Computer Engineering | Researcher',
                bio: 'Southern Luzon State University - Class of 2026'
              }
            ].map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-xl text-center hover:shadow-lg transition-all duration-300 shadow"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">{member.name}</h3>
                <p className="text-teal-600 text-sm mb-3">{member.role}</p>
                <p className="text-slate-600 text-sm">{member.bio}</p>
              </motion.div>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* Thin Footer (moved to bottom) */}
      <footer className="w-full" role="contentinfo">
        <div style={{ height: '0.5in' }} className="bg-slate-900 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <p className="text-center text-white text-sm">&copy; {new Date().getFullYear()} Maaño Dental Care. All rights reserved.</p>
          </div>
        </div>
      </footer>

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
                  <label className="block text-sm font-medium text-slate-700 mb-3 text-center">Verification Code</label>
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
                        <InputOTPSlot index={0} className="w-10 h-12 text-lg sm:w-12 sm:h-14 sm:text-xl" />
                        <InputOTPSlot index={1} className="w-10 h-12 text-lg sm:w-12 sm:h-14 sm:text-xl" />
                        <InputOTPSlot index={2} className="w-10 h-12 text-lg sm:w-12 sm:h-14 sm:text-xl" />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} className="w-10 h-12 text-lg sm:w-12 sm:h-14 sm:text-xl" />
                        <InputOTPSlot index={4} className="w-10 h-12 text-lg sm:w-12 sm:h-14 sm:text-xl" />
                        <InputOTPSlot index={5} className="w-10 h-12 text-lg sm:w-12 sm:h-14 sm:text-xl" />
                      </InputOTPGroup>
                    </InputOTP>
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
                    disabled={isResetLoading || resendCooldown > 0 || (!hasTriedVerify && resetOTP.length !== 6)}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors shadow-md disabled:opacity-70"
                  >
                    {isResetLoading ? 'Processing...' : (
                      resendCooldown > 0 
                        ? `Resend OTP (${resendCooldown}s)` 
                        : (hasTriedVerify ? 'Resend OTP' : 'Verify OTP')
                    )}
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
