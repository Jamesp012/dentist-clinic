import { motion } from 'motion/react';
import { Stethoscope, Users, Award, Heart, MapPin, Phone, Mail, ChevronLeft, ChevronRight, User, Lock, LogIn, UserPlus, Calendar, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { PatientRecordClaiming } from '../PatientRecordClaiming';
import { convertToDBDate, convertToDisplayDate, formatDateInput } from '../../utils/dateHelpers';

export type LandingPageProps = {
  onGetStarted?: () => void;
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

  const handleClaimingComplete = (user: any) => {
    // After claiming is complete, populate the login form with the created username
    setUsername(user.username);
    setPassword('');
    
    // Reset signup data and fields
    setSignupData({
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
    setConfirmPassword('');
    
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
      setConfirmPassword('');
      setUsername('');
      setPassword('');
      
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
                // Auth Form - Fixed height container (same for both Sign In and Sign Up)
              <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300" style={{ 
                height: 'min(640px, calc(100vh - 120px))'
              }}>
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
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1 sm:mb-2">
                      {isLoginMode ? 'Welcome Back' : 'Create Your Account'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600">
                      {isLoginMode ? 'Sign in to access your patient portal' : 'Create your account with Maaño Dental Care'}
                    </p>
                  </div>

                  {/* Toggle between Login and Signup */}
                  <div className="flex mt-5 sm:mt-6 bg-slate-100 rounded-xl p-1 sm:p-1.5 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoginMode(true);
                      }}
                      className={`flex-1 py-2 sm:py-2.5 rounded-lg transition-all duration-300 font-medium text-sm sm:text-base ${
                        isLoginMode
                          ? 'bg-white shadow-md text-teal-600'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoginMode(false);
                      }}
                      className={`flex-1 py-2 sm:py-2.5 rounded-lg transition-all duration-300 font-medium text-sm sm:text-base ${
                        !isLoginMode
                          ? 'bg-white shadow-md text-teal-600'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>

                {/* Form Content - Scrollable for Sign Up, centered for Sign In */}
                <div className={`px-6 sm:px-8 py-5 sm:py-6 flex-grow ${
                  isLoginMode 
                    ? 'overflow-hidden flex flex-col justify-center' 
                    : 'overflow-y-auto custom-scrollbar'
                }`} style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#14b8a6 transparent'
                }}>

                {isLoginMode ? (
                  // Login Form - No scrolling needed
                  <form onSubmit={(e) => { e.preventDefault(); onLogin?.(username, password); }} className="space-y-4 sm:space-y-5">
                    <div>
                      <label htmlFor="login-username" className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700">Username</label>
                      <div className="relative">
                        <User className="w-4 sm:w-5 h-4 sm:h-5 absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          id="login-username"
                          name="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          placeholder="Enter username"
                          className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm sm:text-base"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="login-password" className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700">Password</label>
                      <div className="relative">
                        <Lock className="w-4 sm:w-5 h-4 sm:h-5 absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          id="login-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="Enter password"
                          className="w-full pl-10 sm:pl-11 pr-11 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm sm:text-base"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 sm:right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 sm:w-5 h-4 sm:h-5" /> : <Eye className="w-4 sm:w-5 h-4 sm:h-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 sm:py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl font-semibold mt-6 sm:mt-8 text-sm sm:text-base"
                    >
                      <LogIn className="w-4 sm:w-5 h-4 sm:h-5" />
                      Sign In
                    </button>
                  </form>
                ) : (
                  // Signup Form - Scrollable when needed
                  <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    // Store signup data and show claiming flow
                    const first = (signupData.firstName || '').trim();
                    const last = (signupData.lastName || '').trim();
                    setPendingSignupData({
                      ...signupData,
                      fullName: `${first}\n\n${last}`.trim()
                    });
                    setShowClaimingFlow(true);
                  }} className="space-y-3.5 sm:space-y-4 pb-3 sm:pb-4">
                    {/* Name Fields Row */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label htmlFor="signup-firstname" className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700">First Name *</label>
                        <div className="relative">
                          <User className="w-4 sm:w-5 h-4 sm:h-5 absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                          <input
                            id="signup-firstname"
                            name="firstName"
                            type="text"
                            value={signupData.firstName}
                            onChange={(e) => updateNameFields('firstName', e.target.value)}
                            required
                            placeholder="First name"
                            className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm sm:text-base"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="signup-lastname" className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700">Last Name *</label>
                        <div className="relative">
                          <User className="w-4 sm:w-5 h-4 sm:h-5 absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                          <input
                            id="signup-lastname"
                            name="lastName"
                            type="text"
                            value={signupData.lastName}
                            onChange={(e) => updateNameFields('lastName', e.target.value)}
                            required
                            placeholder="Last name"
                            className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm sm:text-base"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="signup-email" className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700">Email *</label>
                      <div className="relative">
                        <Mail className="w-4 sm:w-5 h-4 sm:h-5 absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          id="signup-email"
                          name="email"
                          type="email"
                          value={signupData.email}
                          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                          required
                          placeholder="your@email.com"
                          className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm sm:text-base"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="signup-phone" className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700">Phone</label>
                      <div className="relative">
                        <Phone className="w-4 sm:w-5 h-4 sm:h-5 absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          id="signup-phone"
                          name="phone"
                          type="tel"
                          value={signupData.phone}
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            setSignupData({ ...signupData, phone: formatted });
                          }}
                          placeholder="+63 912 345 6789"
                          className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm sm:text-base"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="signup-birthdate" className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700">Birthdate *</label>
                      <div className="relative">
                        <Calendar className="w-4 sm:w-5 h-4 sm:h-5 absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          id="signup-birthdate"
                          name="dateOfBirth"
                          type="text"
                          value={signupData.dateOfBirth}
                          onChange={(e) => setSignupData({ ...signupData, dateOfBirth: formatDateInput(e.target.value) })}
                          placeholder="DD/MM/YYYY"
                          required
                          className="w-full pl-10 sm:pl-11 pr-11 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm sm:text-base"
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
                          className="absolute right-3 sm:right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          aria-label="Open calendar"
                        >
                          <Calendar className="w-4 sm:w-5 h-4 sm:h-5" />
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
                      <label htmlFor="signup-address" className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700">Address *</label>
                      <div className="relative">
                        <MapPin className="w-4 sm:w-5 h-4 sm:h-5 absolute left-3 sm:left-3.5 top-3 sm:top-3.5 text-slate-400" />
                        <textarea
                          id="signup-address"
                          name="address"
                          value={signupData.address}
                          onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                          placeholder="Enter your address"
                          required
                          rows={2}
                          className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none text-sm sm:text-base"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="signup-username" className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700">Username *</label>
                      <div className="relative">
                        <User className="w-4 sm:w-5 h-4 sm:h-5 absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          id="signup-username"
                          name="username"
                          type="text"
                          value={signupData.username}
                          onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                          required
                          placeholder="Choose a username"
                          className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm sm:text-base"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="signup-password" className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700">Password *</label>
                      <div className="relative">
                        <Lock className="w-4 sm:w-5 h-4 sm:h-5 absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          id="signup-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          required
                          placeholder="Create a password"
                          className="w-full pl-10 sm:pl-11 pr-11 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm sm:text-base"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 sm:right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 sm:w-5 h-4 sm:h-5" /> : <Eye className="w-4 sm:w-5 h-4 sm:h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="signup-confirm-password" className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700">Confirm Password *</label>
                      <div className="relative">
                        <Lock className="w-4 sm:w-5 h-4 sm:h-5 absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          id="signup-confirm-password"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          placeholder="Confirm your password"
                          className="w-full pl-10 sm:pl-11 pr-11 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm sm:text-base"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 sm:right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 sm:w-5 h-4 sm:h-5" /> : <Eye className="w-4 sm:w-5 h-4 sm:h-5" />}
                        </button>
                      </div>
                      {confirmPassword && signupData.password !== confirmPassword && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1.5 font-medium">Passwords do not match</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 sm:py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl font-semibold mt-6 sm:mt-8 text-sm sm:text-base"
                    >
                      <UserPlus className="w-4 sm:w-5 h-4 sm:h-5" />
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
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Our Services</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Comprehensive dental care services for your entire family's oral health
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Users,
                title: 'General Dentistry',
                description: 'Routine cleanings, exams, and preventive care for the whole family'
              },
              {
                icon: Award,
                title: 'Restorative Treatment',
                description: 'Fillings, crowns, and bridges to restore your natural smile'
              },
              {
                icon: Heart,
                title: 'Cosmetic Dentistry',
                description: 'Teeth whitening, veneers, and smile enhancements'
              },
              {
                icon: Stethoscope,
                title: 'Emergency Care',
                description: 'Prompt treatment for dental emergencies and urgent issues'
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
                © 2026 Maaño Dental Care. All rights reserved. | Committed to your oral health with ❤️
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
