import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Calendar, Phone, CheckCircle, AlertCircle, Loader2, ArrowLeft, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { patientClaimingAPI, setAuthToken } from '../api';
import { handlePhoneInput } from '../utils/phoneValidation';

type ClaimingStep = 'initial' | 'search' | 'otp' | 'account' | 'success';

type PatientClaimingProps = {
  onComplete: (user: any, token: string) => void;
  onCancel: () => void;
  isLoginFlow?: boolean;
  loggedInUser?: any;
};

/**
 * Patient Record Claiming Component
 * 
 * Flow:
 * 1. Ask if patient has existing record
 * 2. If yes, collect identifying information
 * 3. Search for matching records
 * 4. Send OTP to phone on record
 * 5. Verify OTP
 * 6. Create account and link to existing record
 */
export function PatientRecordClaiming({ onComplete, onCancel, isLoginFlow = false, loggedInUser }: PatientClaimingProps) {
  const [step, setStep] = useState<ClaimingStep>(isLoginFlow ? 'search' : 'initial');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Search form data
  const [searchData, setSearchData] = useState({
    fullName: '',
    dateOfBirth: '',
    phone: '',
  });

  // Multiple matches data
  const [multipleMatches, setMultipleMatches] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  // OTP data
  const [otp, setOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');

  // Account creation data
  const [accountData, setAccountData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
  });

  /**
   * Step 1: Search for existing records
   */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await patientClaimingAPI.searchRecords(searchData);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      if (!result.found) {
        // No record found - show message
        toast.error(result.message || 'No existing record found');
        setError(result.message || 'No existing record found. You can proceed with new registration.');
        setIsLoading(false);
        return;
      }

      if (result.matches === 1) {
        // Single match found - proceed to send OTP
        setSelectedPatientId(result.patientId);
        await sendOTP(result.patientId);
      } else if (result.needsMoreInfo) {
        // Multiple matches - show selection
        setMultipleMatches(result.patients);
        toast.info('Multiple records found. Please select yours.');
      }

    } catch (err) {
      setError('Failed to search records. Please try again.');
      toast.error('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 2: Select patient from multiple matches
   */
  const handleSelectPatient = async (patientId: number) => {
    setError('');
    setIsLoading(true);
    setSelectedPatientId(patientId);

    try {
      const result = await patientClaimingAPI.selectPatient({ patientId });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      await sendOTP(patientId);

    } catch (err) {
      setError('Failed to select patient. Please try again.');
      toast.error('Selection failed');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 3: Send OTP
   */
  const sendOTP = async (patientId: number) => {
    try {
      const result = await patientClaimingAPI.sendOTP(patientId);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      if (result.success) {
        setMaskedPhone(result.phone);
        setStep('otp');
        toast.success('OTP sent to your phone!');
      }
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
      toast.error('Failed to send OTP');
    }
  };

  /**
   * Step 4: Resend OTP
   */
  const handleResendOTP = async () => {
    if (!selectedPatientId) return;
    
    setIsLoading(true);
    try {
      const result = await patientClaimingAPI.resendOTP(selectedPatientId);
      
      if (result.success) {
        toast.success('New OTP sent!');
      } else {
        toast.error(result.error || 'Failed to resend OTP');
      }
    } catch (err) {
      toast.error('Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 5: Verify OTP and proceed to account creation
   */
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setStep('account');
    toast.success('OTP verified! Please create your account.');
  };

  /**
   * Step 6: Create account and link to patient record
   */
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!accountData.username || !accountData.password) {
      setError('Username and password are required');
      return;
    }

    if (accountData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (accountData.password !== accountData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!selectedPatientId) {
      setError('No patient record selected');
      return;
    }

    setIsLoading(true);

    try {
      const result = await patientClaimingAPI.verifyAndLink({
        patientId: selectedPatientId,
        otp: otp,
        userData: {
          username: accountData.username,
          password: accountData.password,
          email: accountData.email,
        },
      });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      if (result.success) {
        // Save token and user data
        setAuthToken(result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        setStep('success');
        toast.success('Account linked successfully!');
        
        // Complete the process
        setTimeout(() => {
          onComplete(result.user, result.token);
        }, 2000);
      }

    } catch (err) {
      setError('Failed to create account. Please try again.');
      toast.error('Account creation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Render based on current step
  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {/* Initial Question */}
        {step === 'initial' && (
          <motion.div
            key="initial"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Welcome! Let's Get Started
              </h2>
              <p className="text-slate-600">
                Do you have an existing record in our clinic?
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('search')}
                className="flex-1 p-6 bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-2xl hover:shadow-lg transition-all"
              >
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold">Yes, I have a record</p>
                <p className="text-sm text-white/80 mt-1">Link to existing record</p>
              </button>

              <button
                onClick={onCancel}
                className="flex-1 p-6 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:border-teal-500 hover:bg-teal-50 transition-all"
              >
                <User className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold">No, I'm new</p>
                <p className="text-sm text-slate-500 mt-1">Create new record</p>
              </button>
            </div>
          </motion.div>
        )}

        {/* Search Form */}
        {step === 'search' && (
          <motion.div
            key="search"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => isLoginFlow ? onCancel() : setStep('initial')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Find Your Record</h2>
                <p className="text-slate-600">Enter your information as registered</p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={isLoginFlow ? (loggedInUser?.fullName || searchData.fullName) : searchData.fullName}
                    onChange={(e) => setSearchData({ ...searchData, fullName: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">
                  Date of Birth *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="date"
                    value={searchData.dateOfBirth}
                    onChange={(e) => setSearchData({ ...searchData, dateOfBirth: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">
                  Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={searchData.phone}
                    onChange={(e) => {
                      const value = e.target.value;
                      handlePhoneInput(value, (formatted) => {
                        setSearchData({ ...searchData, phone: formatted });
                      });
                    }}
                    className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Multiple matches selection */}
              {multipleMatches.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">
                    Multiple records found. Please select yours:
                  </p>
                  {multipleMatches.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => handleSelectPatient(patient.id)}
                      className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
                    >
                      <p className="font-semibold text-slate-800">{patient.name}</p>
                      {patient.lastVisit && (
                        <p className="text-sm text-slate-600 mt-1">
                          Last visit: {new Date(patient.lastVisit).toLocaleDateString()}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || multipleMatches.length > 0}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  'Search My Record'
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* OTP Verification */}
        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Verify Your Identity</h2>
              <p className="text-slate-600">
                We've sent a 6-digit code to <span className="font-semibold">{maskedPhone}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 text-center">
                  Enter Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                  }}
                  className="w-full text-center text-2xl tracking-widest font-mono py-4 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={otp.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify Code
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isLoading}
                className="w-full py-2 text-teal-600 hover:text-teal-700 font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Resend Code'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Account Creation */}
        {step === 'account' && (
          <motion.div
            key="account"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Create Your Account</h2>
              <p className="text-slate-600">Set up your login credentials</p>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">
                  Username *
                </label>
                <input
                  type="text"
                  value={accountData.username}
                  onChange={(e) => setAccountData({ ...accountData, username: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Choose a username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={accountData.email}
                  onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">
                  Password *
                </label>
                <input
                  type="password"
                  value={accountData.password}
                  onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={accountData.confirmPassword}
                  onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Re-enter password"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* Success */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-6"
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">All Set!</h2>
            <p className="text-slate-600 mb-4">
              Your account has been successfully linked to your existing records.
            </p>
            <p className="text-sm text-slate-500">Redirecting to your dashboard...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
