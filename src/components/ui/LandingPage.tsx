import { motion } from 'motion/react';
import { Stethoscope, Users, Award, Heart, MapPin, Phone, Mail, ChevronLeft, ChevronRight, User, Lock, LogIn, UserPlus, Calendar, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { PatientRecordClaiming } from '../PatientRecordClaiming';
import { convertToDBDate, convertToDisplayDate, formatDateInput } from '../../utils/dateHelpers';

type LandingPageProps = {
  onGetStarted: () => void;
  onLogin?: (username: string, password: string) => void;
  onSignup?: (signupData: any) => void;
};

export function LandingPage({ onGetStarted, onLogin, onSignup }: LandingPageProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showClaimingFlow, setShowClaimingFlow] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState<any>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const birthdatePickerRef = useRef<HTMLInputElement | null>(null);
  
  const [signupData, setSignupData] = useState({
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

  const slides = [
    {
      icon: Stethoscope,
      title: 'Modern Dental Management',
      description: 'All-in-one solution for your clinic'
    },
    {
      icon: Users,
      title: 'Patient Care Excellence',
      description: 'Comprehensive patient management system'
    },
    {
      icon: Award,
      title: 'Award-Winning Platform',
      description: 'Trusted by leading dental professionals'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  
  const handleGetStarted = () => {
    setShowAuthForm(true);
  };

  const handleClaimingComplete = (user: any, token: string) => {
    // After claiming is complete, populate the login form with the created username
    setUsername(user.username);
    setPassword('');
    
    // Reset signup data and fields
    setSignupData({
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
    setConfirmPassword('');
    setError('');
    
    // Close claiming flow and switch to login mode
    setShowClaimingFlow(false);
    setPendingSignupData(null);
    setIsLoginMode(true);
    // Ensure auth form stays visible
    setShowAuthForm(true);
  };

  const handleClaimingCancel = () => {
    // User selected "No, I'm new" - create the account directly
    if (pendingSignupData) {
      const signupDataConverted = {
        ...pendingSignupData,
        dateOfBirth: convertToDBDate(pendingSignupData.dateOfBirth)
      };
      onSignup?.(signupDataConverted);
      
      // Close claiming flow
      setShowClaimingFlow(false);
      setPendingSignupData(null);
      
      // Clear all fields
      setSignupData({
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
      setConfirmPassword('');
      setUsername('');
      setPassword('');
      setError('');
      
      // Switch to login mode and keep auth form visible
      setIsLoginMode(true);
      setShowAuthForm(true);
    } else {
      // Just cancel without creating
      setShowClaimingFlow(false);
      setPendingSignupData(null);
    }
  };

  return (
    <div className="w-full bg-white overflow-x-hidden">
      {/* Patient Record Claiming Modal */}
      {showClaimingFlow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full relative p-8"
          >
            <PatientRecordClaiming
              onComplete={handleClaimingComplete}
              onCancel={handleClaimingCancel}
              isLoginFlow={false}
            />
          </motion.div>
        </div>
      )}

      {/* Header */}
      <header className="w-full bg-white shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🦷</span>
            </div>
            <span className="text-xl font-semibold text-teal-600">DentaCare Pro</span>
          </div>
          {/* Navigation */}
          <nav className="hidden md:flex gap-8">
            <button onClick={() => {
              const element = document.getElementById('home');
              if (element) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }} className="text-slate-600 hover:text-teal-600 transition cursor-pointer">Home</button>
            <button onClick={() => {
              const element = document.getElementById('services');
              if (element) {
                const offset = 80;
                const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
              }
            }} className="text-slate-600 hover:text-teal-600 transition cursor-pointer">Services</button>
            <button onClick={() => {
              const element = document.getElementById('contact');
              if (element) {
                const offset = 80;
                const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
              }
            }} className="text-slate-600 hover:text-teal-600 transition cursor-pointer">Contact</button>
            <button onClick={() => {
              const element = document.getElementById('about');
              if (element) {
                const offset = 80;
                const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
              }
            }} className="text-slate-600 hover:text-teal-600 transition cursor-pointer">About</button>
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
              className="space-y-8"
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
                <button
                  onClick={() => setShowAuthForm(false)}
                  className="px-8 py-4 bg-white text-teal-600 border-2 border-teal-500 rounded-lg hover:bg-teal-50 transition-all duration-300 font-bold text-lg"
                >
                  Learn More
                </button>
              </div>

            </motion.div>

            {/* Right side - Slideshow or Auth Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="hidden lg:block"
            >
              {!showAuthForm ? (
                // Slideshow
                <div className="bg-gradient-to-br from-teal-400 to-cyan-500 rounded-3xl p-1 shadow-2xl h-[600px]">
                  <div className="bg-white rounded-2xl p-8 pt-12 pb-28 flex flex-col items-center justify-center relative overflow-hidden h-full">
                    {/* Slideshow content */}
                    {slides.map((slide, index) => {
                      const SlideIcon = slide.icon;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: index === currentSlide ? 1 : 0, scale: index === currentSlide ? 1 : 0.9 }}
                          transition={{ duration: 0.5 }}
                          className={`text-center flex-1 flex flex-col items-center justify-center ${index === currentSlide ? 'block' : 'hidden'}`}
                        >
                          <SlideIcon className="w-28 h-28 text-teal-500 mx-auto mb-4" />
                          <p className="text-2xl font-semibold text-slate-800">{slide.title}</p>
                          <p className="text-slate-600 mt-3 text-base">{slide.description}</p>
                        </motion.div>
                      );
                    })}

                    {/* Bottom controls container */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-50 to-transparent p-4 space-y-3">
                      {/* Slide indicators */}
                      <div className="flex gap-2 justify-center">
                        {slides.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              index === currentSlide ? 'bg-teal-500 w-6' : 'bg-teal-300 w-2'
                            }`}
                            aria-label={`Go to slide ${index + 1}`}
                          />
                        ))}
                      </div>

                      {/* Navigation buttons */}
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={prevSlide}
                          className="p-2 bg-teal-500 hover:bg-teal-600 text-white rounded-full transition-colors duration-300"
                          aria-label="Previous slide"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={nextSlide}
                          className="p-2 bg-teal-500 hover:bg-teal-600 text-white rounded-full transition-colors duration-300"
                          aria-label="Next slide"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Auth Form
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 180px)', maxHeight: '700px' }}>
                {/* Fixed Header */}
                <div className="px-8 pt-8 pb-6 flex-shrink-0 border-b border-slate-200">
                  <div className="text-center">
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
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                      {isLoginMode ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-slate-600">
                      {isLoginMode ? 'Sign in to access your portal' : 'Join our dental care platform'}
                    </p>
                  </div>

                  {/* Toggle between Login and Signup */}
                  <div className="flex mt-6 bg-slate-100 rounded-xl p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoginMode(true);
                        setError('');
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
                </div>

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6">

                {isLoginMode ? (
                  // Login Form
                  <form onSubmit={(e) => { e.preventDefault(); onLogin?.(username, password); }} className="space-y-5">
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
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700">Password</label>
                      <div className="relative">
                        <Lock className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="Enter password"
                          className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl font-medium"
                    >
                      <LogIn className="w-5 h-5" />
                      Sign In
                    </button>
                  </form>
                ) : (
                  // Signup Form
                  <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    // Store signup data and show claiming flow
                    setPendingSignupData(signupData);
                    setShowClaimingFlow(true);
                  }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700">Full Name *</label>
                      <div className="relative">
                        <User className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={signupData.fullName}
                          onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
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
                          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                          required
                          placeholder="your@email.com"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700">Phone</label>
                      <div className="relative">
                        <Phone className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={signupData.phone}
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            setSignupData({ ...signupData, phone: formatted });
                          }}
                          placeholder="+63 912 345 6789"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700">Birthdate *</label>
                      <div className="relative">
                        <Calendar className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={signupData.dateOfBirth}
                          onChange={(e) => setSignupData({ ...signupData, dateOfBirth: formatDateInput(e.target.value) })}
                          placeholder="DD/MM/YYYY"
                          required
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
                          onChange={(e) => setSignupData({ ...signupData, dateOfBirth: convertToDisplayDate(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700">Username *</label>
                      <div className="relative">
                        <User className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={signupData.username}
                          onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                          required
                          placeholder="Choose a username"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700">Password *</label>
                      <div className="relative">
                        <Lock className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          required
                          placeholder="Create a password"
                          className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700">Confirm Password *</label>
                      <div className="relative">
                        <Lock className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          placeholder="Confirm your password"
                          className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {confirmPassword && signupData.password !== confirmPassword && (
                        <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl font-medium"
                    >
                      <UserPlus className="w-5 h-5" />
                      Create Account
                    </button>
                  </form>
                )}
                </div>
              </div>
              )}
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
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need to manage your dental clinic efficiently and professionally
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Users,
                title: 'Patient Management',
                description: 'Complete patient profiles, medical history, and digital records'
              },
              {
                icon: Award,
                title: 'Appointment Scheduling',
                description: 'Smart calendar system with automated reminders and confirmations'
              },
              {
                icon: Heart,
                title: 'Dental Charting',
                description: 'Advanced visual charting system for treatments and procedures'
              },
              {
                icon: Stethoscope,
                title: 'Financial Reporting',
                description: 'Track revenue, expenses, and generate comprehensive reports'
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
                  DentaCare Pro is built on the foundation of modern dental practice management. Our system has been developed by dental professionals and software engineers working together to solve the unique challenges faced by dental clinics.
                </p>
                <p className="text-lg text-slate-700 leading-relaxed">
                  With over a decade of experience in healthcare technology, we understand the importance of security, efficiency, and patient care. Our platform is trusted by clinics worldwide to manage their operations seamlessly.
                </p>
                <p className="text-lg text-slate-700 leading-relaxed">
                  We're committed to continuous innovation and improvement, ensuring that our clients always have access to cutting-edge dental management solutions.
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Award className="w-6 h-6 text-teal-600" />
                    HIPAA Compliant
                  </h3>
                  <p className="text-slate-600">We maintain the highest standards of data security and patient privacy compliance</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Heart className="w-6 h-6 text-teal-600" />
                    Patient-Centered
                  </h3>
                  <p className="text-slate-600">Every feature is designed with patients and healthcare providers in mind</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Stethoscope className="w-6 h-6 text-teal-600" />
                    24/7 Support
                  </h3>
                  <p className="text-slate-600">Our dedicated support team is always available to help your clinic succeed</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Developers Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Meet Our Team</h2>
            <p className="text-xl text-slate-300">Passionate developers and designers behind DentaCare Pro</p>
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
                className="bg-slate-700/50 backdrop-blur p-6 rounded-xl text-center hover:bg-slate-700/70 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <h3 className="text-lg font-semibold mb-1">{member.name}</h3>
                <p className="text-teal-400 text-sm mb-3">{member.role}</p>
                <p className="text-slate-300 text-sm">{member.bio}</p>
              </motion.div>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-slate-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-center md:text-left">
                © 2026 DentaCare Pro. All rights reserved. | Developed with ❤️ by our dedicated team
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-sm hover:text-teal-400 transition-colors duration-300">
                  Privacy
                </a>
                <a href="#" className="text-sm hover:text-teal-400 transition-colors duration-300">
                  Terms
                </a>
                <a href="#" className="text-sm hover:text-teal-400 transition-colors duration-300">
                  Cookies
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
