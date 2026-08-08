import React, { useState, useEffect } from 'react';
import { 
  Flame, ClipboardList, ShieldAlert, LogOut, Lock, 
  LayoutDashboard, ArrowLeft, Mail, X, ChevronRight, Info, AlertTriangle, 
  BookOpen, Send, Menu 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoBackground from './components/VideoBackground';
import ChecklistTab from './components/ChecklistTab';
import BlastDesignTab from './components/BlastDesignTab';
import IncidentLogsTab from './components/IncidentLogsTab';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import CentralHub from './components/CentralHub';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { 
    user, 
    registerUser, 
    verifyRegistrationOTP, 
    requestLoginOTP, 
    verifyLoginOTP, 
    loginWithPassword,
    requestForgotPasswordOTP, 
    resetPassword, 
    logoutUser 
  } = useAuth();

  // Modal control states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Multi-factor login type
  const [loginMode, setLoginMode] = useState<'otp' | 'password'>('password');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register inputs
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regDesignation, setRegDesignation] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCountry, setRegCountry] = useState('');

  // Forgot password inputs
  const [forgotMethod, setForgotMethod] = useState<'email' | 'phone'>('email');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Verification step states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationPhone, setVerificationPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Forgot password verification step
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Cooldown timers
  const [resendTimer, setResendTimer] = useState(0);

  // General messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Contact Form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);

  // Platform Dashboard tabs
  const [activeTab, setActiveTab] = useState<'hub' | 'dashboard' | 'checklist' | 'design' | 'incidents'>('hub');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await registerUser({
        email: regEmail,
        password: regPassword,
        full_name: regName,
        company: regCompany,
        designation: regDesignation,
        phone: regPhone,
        country: regCountry
      });
      setVerificationEmail(regEmail);
      setIsVerifying(true);
      setResendTimer(60);
      setSuccessMsg('A 6-digit OTP verification code has been dispatched to your email.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Registration failed. Try checking details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      if (loginMode === 'password') {
        // Direct password login — no OTP step
        await loginWithPassword(loginIdentifier, loginPassword);
        setShowAuthModal(false);
        setLoginIdentifier('');
        setLoginPassword('');
      } else {
        await requestLoginOTP(loginMethod, loginIdentifier);
        setVerificationEmail(loginMethod === 'email' ? loginIdentifier : '');
        setVerificationPhone(loginMethod === 'phone' ? loginIdentifier : '');
        setIsVerifying(true);
        setResendTimer(60);
        setSuccessMsg(`A 6-digit verification code has been sent to your registered ${loginMethod}.`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Authentication request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await requestForgotPasswordOTP(forgotMethod, forgotIdentifier);
      setIsVerifying(true);
      setResendTimer(60);
      setSuccessMsg(`A password reset verification code has been sent to your ${forgotMethod}.`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to dispatch reset code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    const identifier = authTab === 'register' 
      ? verificationEmail 
      : (loginMethod === 'email' ? verificationEmail : verificationPhone);
    try {
      if (authTab === 'register') {
        await verifyRegistrationOTP(identifier, otpCode);
        setShowAuthModal(false);
      } else {
        await verifyLoginOTP(identifier, otpCode);
        setShowAuthModal(false);
      }
      setIsVerifying(false);
      setOtpCode('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Invalid or expired OTP code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyResetOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      setIsResettingPassword(true);
      setIsVerifying(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await resetPassword({
        identifier: forgotIdentifier,
        otp: otpCode,
        new_password: newPassword
      });
      
      // Auto-login with the newly updated password
      try {
        await loginWithPassword(forgotIdentifier, newPassword);
        setShowAuthModal(false);
        setIsResettingPassword(false);
        setIsVerifying(false);
        setForgotIdentifier('');
        setOtpCode('');
        setNewPassword('');
        setSuccessMsg('Your password was updated successfully and you are now logged in!');
      } catch (_) {
        setAuthTab('login');
        setLoginMode('password');
        setLoginIdentifier(forgotIdentifier);
        setLoginPassword('');
        setIsResettingPassword(false);
        setIsVerifying(false);
        setForgotIdentifier('');
        setOtpCode('');
        setNewPassword('');
        setSuccessMsg('Password updated successfully! Enter your new password to sign in.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      if (authTab === 'register') {
        await registerUser({
          email: regEmail,
          password: regPassword,
          full_name: regName,
          company: regCompany,
          designation: regDesignation,
          phone: regPhone,
          country: regCountry
        });
      } else if (authTab === 'forgot') {
        await requestForgotPasswordOTP(forgotMethod, forgotIdentifier);
      } else {
        await requestLoginOTP(loginMethod, loginIdentifier);
      }
      setResendTimer(60);
      setSuccessMsg('Verification code resent successfully.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Resend code failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setActiveTab('hub');
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSuccess(true);
    setContactName('');
    setContactEmail('');
    setContactMsg('');
    setTimeout(() => setContactSuccess(false), 5000);
  };

  const triggerDataRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const openAuthWithTab = (tab: 'login' | 'register' | 'forgot') => {
    setAuthTab(tab);
    setIsVerifying(false);
    setIsResettingPassword(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowAuthModal(true);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Safe navigation proxy clicker for the hub cards
  const handleHubNavigation = (tab: 'dashboard' | 'checklist' | 'design' | 'incidents') => {
    if (!user) {
      openAuthWithTab('login');
    } else {
      setActiveTab(tab);
    }
  };

  const scrollAnimationProps = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-120px" },
    transition: { duration: 0.7, ease: "easeOut" as any }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans select-none overflow-x-hidden">
      <VideoBackground />

      {/* HEADER NAVBAR */}
      <header className="bg-mining-card/85 backdrop-blur-md border-b border-mining-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4.5 flex justify-between items-center">
          <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer" onClick={() => scrollToSection('home')}>
            <span className="text-mining-accent text-base sm:text-xl font-black">▲</span>
            <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-white leading-tight tracking-wider uppercase">
              Mining Intelligence Platform
            </h1>
          </div>

          {/* NAVBAR LINKS */}
          <nav className="hidden lg:flex items-center gap-6">
            <button onClick={() => scrollToSection('home')} className="text-xs font-bold text-gray-300 hover:text-white uppercase tracking-wider transition-colors">Home</button>
            <button onClick={() => scrollToSection('about')} className="text-xs font-bold text-gray-300 hover:text-white uppercase tracking-wider transition-colors">About</button>
            <button onClick={() => scrollToSection('features')} className="text-xs font-bold text-gray-300 hover:text-white uppercase tracking-wider transition-colors">Features</button>
            <button onClick={() => scrollToSection('risk-scoring')} className="text-xs font-bold text-gray-300 hover:text-white uppercase tracking-wider transition-colors">AI Risk</button>
            <button onClick={() => scrollToSection('articles')} className="text-xs font-bold text-gray-300 hover:text-white uppercase tracking-wider transition-colors">Mining Articles</button>
            <button onClick={() => scrollToSection('hazards')} className="text-xs font-bold text-gray-300 hover:text-white uppercase tracking-wider transition-colors">Hazards</button>
            <button onClick={() => scrollToSection('contact')} className="text-xs font-bold text-gray-300 hover:text-white uppercase tracking-wider transition-colors">Contact</button>
          </nav>

          <div className="flex items-center gap-3.5">
            {/* Highlighted Use Our Services button */}
            {!user && (
              <button
                onClick={() => openAuthWithTab('login')}
                className="px-4 py-1.5 bg-mining-accent hover:bg-mining-accent-hover text-black font-black text-[10px] sm:text-xs uppercase rounded-xl shadow-[0_0_15px_rgba(255,90,31,0.3)] hover:shadow-[0_0_25px_rgba(255,90,31,0.55)] transition-all animate-pulse"
              >
                Use Our Services
              </button>
            )}

            {user && (
              <>
                {activeTab !== 'hub' && (
                  <button
                    onClick={() => setActiveTab('hub')}
                    className="px-2.5 py-1.5 bg-mining-dark hover:bg-mining-accent/15 border border-mining-border rounded-xl text-xs font-bold text-mining-gold flex items-center gap-1.5 transition-all"
                  >
                    <ArrowLeft size={13} />
                    <span className="hidden sm:inline">Return to Hub</span>
                  </button>
                )}

                <div className="flex flex-col text-right">
                  <span className="text-xs text-white font-extrabold">{user.full_name}</span>
                  <span className="text-[10px] text-mining-gold font-bold font-mono uppercase tracking-widest">
                    {user.designation} | {user.company}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1 sm:p-1.5 bg-mining-dark hover:bg-red-950/20 border border-gray-500 rounded-xl text-gray-300 hover:text-red-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={15} />
                </button>
              </>
            )}

            {/* Mobile Hamburger Navigation Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 text-gray-300 hover:text-white bg-mining-dark border border-mining-border rounded-xl transition-all"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="lg:hidden bg-mining-card/95 border-b border-mining-border backdrop-blur-lg overflow-hidden px-4 py-3 flex flex-col gap-1"
            >
              <button 
                onClick={() => { scrollToSection('home'); setIsMobileMenuOpen(false); }} 
                className="text-left text-xs font-bold text-gray-300 hover:text-white py-2 px-3 hover:bg-mining-dark rounded-lg transition-colors uppercase tracking-wider flex items-center justify-between"
              >
                <span>Home</span>
                <ChevronRight size={12} className="text-gray-500" />
              </button>
              <button 
                onClick={() => { scrollToSection('about'); setIsMobileMenuOpen(false); }} 
                className="text-left text-xs font-bold text-gray-300 hover:text-white py-2 px-3 hover:bg-mining-dark rounded-lg transition-colors uppercase tracking-wider flex items-center justify-between"
              >
                <span>About</span>
                <ChevronRight size={12} className="text-gray-500" />
              </button>
              <button 
                onClick={() => { scrollToSection('features'); setIsMobileMenuOpen(false); }} 
                className="text-left text-xs font-bold text-gray-300 hover:text-white py-2 px-3 hover:bg-mining-dark rounded-lg transition-colors uppercase tracking-wider flex items-center justify-between"
              >
                <span>Features</span>
                <ChevronRight size={12} className="text-gray-500" />
              </button>
              <button 
                onClick={() => { scrollToSection('risk-scoring'); setIsMobileMenuOpen(false); }} 
                className="text-left text-xs font-bold text-gray-300 hover:text-white py-2 px-3 hover:bg-mining-dark rounded-lg transition-colors uppercase tracking-wider flex items-center justify-between"
              >
                <span>AI Risk</span>
                <ChevronRight size={12} className="text-gray-500" />
              </button>
              <button 
                onClick={() => { scrollToSection('articles'); setIsMobileMenuOpen(false); }} 
                className="text-left text-xs font-bold text-gray-300 hover:text-white py-2 px-3 hover:bg-mining-dark rounded-lg transition-colors uppercase tracking-wider flex items-center justify-between"
              >
                <span>Mining Articles</span>
                <ChevronRight size={12} className="text-gray-500" />
              </button>
              <button 
                onClick={() => { scrollToSection('hazards'); setIsMobileMenuOpen(false); }} 
                className="text-left text-xs font-bold text-gray-300 hover:text-white py-2 px-3 hover:bg-mining-dark rounded-lg transition-colors uppercase tracking-wider flex items-center justify-between"
              >
                <span>Hazards</span>
                <ChevronRight size={12} className="text-gray-500" />
              </button>
              <button 
                onClick={() => { scrollToSection('contact'); setIsMobileMenuOpen(false); }} 
                className="text-left text-xs font-bold text-gray-300 hover:text-white py-2 px-3 hover:bg-mining-dark rounded-lg transition-colors uppercase tracking-wider flex items-center justify-between"
              >
                <span>Contact</span>
                <ChevronRight size={12} className="text-gray-500" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* PORTAL VIEWS VS STUNNING LANDING PAGE SECTIONS */}
      {user && activeTab !== 'hub' ? (
        /* PORTAL ACTIVE SUB-SERVICES */
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center">
          <div className={activeTab === 'dashboard' ? '' : 'hidden'}>
            <ExecutiveDashboard key={refreshTrigger} />
          </div>
          <div className={activeTab === 'checklist' ? '' : 'hidden'}>
            <ChecklistTab onSubmissionSuccess={triggerDataRefresh} userRole={user.role} />
          </div>
          <div className={activeTab === 'design' ? '' : 'hidden'}>
            <BlastDesignTab />
          </div>
          <div className={activeTab === 'incidents' ? '' : 'hidden'}>
            <IncidentLogsTab key={refreshTrigger} />
          </div>
        </main>
      ) : (
        /* HERO CENTRAL HUB + LANDING SECTIONS */
        <div className="flex-1 flex flex-col w-full text-white">
          
          {/* HUB / HERO SECTION AT START */}
          <section id="home" className="min-h-[92vh] flex flex-col justify-center items-center py-12 px-4 relative">
            <CentralHub 
              setActiveTab={handleHubNavigation} 
              role={user ? user.role : ""} 
            />
          </section>

          {/* SECTION 2: ABOUT THE PLATFORM */}
          <motion.section 
            id="about" 
            {...scrollAnimationProps}
            className="border-t border-mining-border bg-mining-card/20 py-20 px-4"
          >
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col gap-5">
                <span className="text-[10px] text-mining-accent font-mono font-bold tracking-widest uppercase">platform specification</span>
                <h3 className="text-2xl sm:text-4xl font-extrabold text-white uppercase font-display">Autonomous Blast Telemetry</h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
                  The Mining Intelligence Platform is an automated telemetry compliance engine that integrates with local atmospheric maps, worker distribution coordinates, and pre-blast safety logs.
                </p>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
                  By matching checklist criteria against our proprietary 20-point risk score vector, the platform ensures zero explosive exceptions and full alignment with regulatory parameters.
                </p>
              </div>
              <div className="border border-mining-border bg-mining-dark/40 p-8 rounded-3xl flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 h-40 w-40 bg-mining-accent/5 rounded-full blur-3xl" />
                <h4 className="text-xs font-mono font-extrabold text-mining-gold uppercase tracking-wider">platform validation metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-mining-card/50 border border-mining-border/50 rounded-2xl">
                    <span className="text-xl sm:text-2xl font-black text-white">99.8%</span>
                    <span className="text-[10px] text-gray-400 block mt-1">Hazard Identification</span>
                  </div>
                  <div className="p-4 bg-mining-card/50 border border-mining-border/50 rounded-2xl">
                    <span className="text-xl sm:text-2xl font-black text-white">&lt; 150m</span>
                    <span className="text-[10px] text-gray-400 block mt-1">Flyrock Target Scope</span>
                  </div>
                  <div className="p-4 bg-mining-card/50 border border-mining-border/50 rounded-2xl">
                    <span className="text-xl sm:text-2xl font-black text-white">20-Point</span>
                    <span className="text-[10px] text-gray-400 block mt-1">Mathematical Vector</span>
                  </div>
                  <div className="p-4 bg-mining-card/50 border border-mining-border/50 rounded-2xl">
                    <span className="text-xl sm:text-2xl font-black text-white">100%</span>
                    <span className="text-[10px] text-gray-400 block mt-1">Immutable Auditing</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* SECTION 3: FEATURES GRID */}
          <motion.section 
            id="features" 
            {...scrollAnimationProps}
            className="border-t border-mining-border py-20 px-4"
          >
            <div className="max-w-6xl mx-auto flex flex-col gap-12">
              <div className="text-center flex flex-col items-center gap-3">
                <span className="text-[10px] text-mining-gold font-mono font-bold tracking-widest uppercase">system services</span>
                <h3 className="text-2xl sm:text-4xl font-extrabold text-white uppercase font-display">Operations Nodes</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Pre-blast controls are verified by our analytical safety engine.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div 
                  onClick={() => handleHubNavigation('checklist')}
                  className="bg-mining-card border border-mining-border/60 hover:border-mining-accent/60 p-6 rounded-2xl flex flex-col justify-between group cursor-pointer hover:shadow-neon-glow transition-all duration-300"
                >
                  <div className="flex flex-col gap-4">
                    <div className="h-10 w-10 bg-mining-accent/10 border border-mining-accent/30 rounded-xl flex items-center justify-center text-mining-accent group-hover:scale-105 transition-transform">
                      <ClipboardList size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-mining-accent transition-colors">Blast Safety Check</h4>
                      <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                        Submit meteorological sensors, workers cap, and safety parameters.
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-mining-gold uppercase mt-4 block">Launch Node ➔</span>
                </div>

                <div 
                  onClick={() => handleHubNavigation('dashboard')}
                  className="bg-mining-card border border-mining-border/60 hover:border-[#00ccff]/60 p-6 rounded-2xl flex flex-col justify-between group cursor-pointer hover:shadow-[0_0_20px_rgba(0,204,255,0.15)] transition-all duration-300"
                >
                  <div className="flex flex-col gap-4">
                    <div className="h-10 w-10 bg-[#00ccff]/10 border border-[#00ccff]/30 rounded-xl flex items-center justify-center text-[#00ccff] group-hover:scale-105 transition-transform">
                      <LayoutDashboard size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-[#00ccff] transition-colors">Safety Dashboard</h4>
                      <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                        Audit incident timelines, hazard distributions, and checklists charts.
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-[#00ccff] uppercase mt-4 block">Launch Node ➔</span>
                </div>

                <div 
                  onClick={() => handleHubNavigation('design')}
                  className="bg-mining-card border border-mining-border/60 hover:border-[#a855f7]/60 p-6 rounded-2xl flex flex-col justify-between group cursor-pointer hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all duration-300"
                >
                  <div className="flex flex-col gap-4">
                    <div className="h-10 w-10 bg-[#a855f7]/10 border border-[#a855f7]/30 rounded-xl flex items-center justify-center text-[#a855f7] group-hover:scale-105 transition-transform">
                      <Flame size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-[#a855f7] transition-colors">Design Optimizer</h4>
                      <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                        Calculate spacing optimization on satellite mapping simulators.
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-[#a855f7] uppercase mt-4 block">Launch Node ➔</span>
                </div>

                <div 
                  onClick={() => handleHubNavigation('incidents')}
                  className="bg-mining-card border border-mining-border/60 hover:border-green-500/60 p-6 rounded-2xl flex flex-col justify-between group cursor-pointer hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all duration-300"
                >
                  <div className="flex flex-col gap-4">
                    <div className="h-10 w-10 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-center text-green-400 group-hover:scale-105 transition-transform">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-green-400 transition-colors">Incident Diary</h4>
                      <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                        Track verified incidents logs and view tamper-evident diaries.
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-green-400 uppercase mt-4 block">Launch Node ➔</span>
                </div>

              </div>
            </div>
          </motion.section>

          {/* SECTION 4: AI RISK SCORE MATRIX */}
          <motion.section 
            id="risk-scoring" 
            {...scrollAnimationProps}
            className="border-t border-mining-border bg-mining-card/10 py-20 px-4"
          >
            <div className="max-w-5xl mx-auto flex flex-col gap-10">
              <div className="flex flex-col gap-3">
                <span className="text-[10px] text-mining-accent font-mono font-bold tracking-widest uppercase">mathematical modeling</span>
                <h3 className="text-2xl sm:text-4xl font-extrabold text-white uppercase font-display">AI Blast Risk Scoring</h3>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-sans">
                  Risk scoring calculates criteria weight parameters. Submissions exceeding 35 points are flagged as Safety Exceptions.
                </p>
              </div>

              <div className="border border-mining-border rounded-2xl overflow-hidden bg-mining-dark/60 font-sans text-xs">
                <div className="grid grid-cols-3 bg-mining-card/75 p-3.5 border-b border-mining-border font-bold text-mining-gold uppercase tracking-wider text-[10px]">
                  <span>Telemetry Factor</span>
                  <span className="text-center">Limit Threshold</span>
                  <span className="text-right">Risk Score Impact</span>
                </div>
                <div className="divide-y divide-mining-border/50 text-gray-300">
                  <div className="grid grid-cols-3 p-3.5 items-center">
                    <span>Wind Velocity</span>
                    <span className="text-center text-gray-400">&gt; 35 km/h</span>
                    <span className="text-right font-semibold text-red-400">+20 Risk Points</span>
                  </div>
                  <div className="grid grid-cols-3 p-3.5 items-center">
                    <span>Active Lightning Warning</span>
                    <span className="text-center text-gray-400">Triggered (True)</span>
                    <span className="text-right font-semibold text-red-400">+30 Risk Points</span>
                  </div>
                  <div className="grid grid-cols-3 p-3.5 items-center">
                    <span>Excessive Temperature</span>
                    <span className="text-center text-gray-400">&gt; 45°C</span>
                    <span className="text-right font-semibold text-red-400">+10 Risk Points</span>
                  </div>
                  <div className="grid grid-cols-3 p-3.5 items-center">
                    <span>Heavy Precipitation</span>
                    <span className="text-center text-gray-400">&gt; 10 mm</span>
                    <span className="text-right font-semibold text-red-400">+15 Risk Points</span>
                  </div>
                  <div className="grid grid-cols-3 p-3.5 items-center">
                    <span>Worker Overcrowding</span>
                    <span className="text-center text-gray-400">&gt; Safe Cap</span>
                    <span className="text-right font-semibold text-red-400">+25 Risk Points</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* SECTION 5: MINING SAFETY OVERVIEW */}
          <motion.section 
            {...scrollAnimationProps}
            className="border-t border-mining-border py-20 px-4"
          >
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 flex flex-col gap-4">
                <span className="text-[10px] text-mining-gold font-mono font-bold tracking-widest uppercase">operational compliance</span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white uppercase font-display leading-tight">Safety Guidelines</h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Pre-blast isolation plans must satisfy critical constraints before firing operations are cleared by safety officers.
                </p>
                <div className="flex gap-2.5 items-center text-xs text-mining-accent font-bold hover:underline cursor-pointer" onClick={() => openAuthWithTab('login')}>
                  <span>Access Platform Documents</span>
                  <ChevronRight size={14} />
                </div>
              </div>
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 bg-mining-card border border-mining-border rounded-2xl flex flex-col gap-3">
                  <div className="h-8 w-8 bg-mining-accent/10 rounded-lg flex items-center justify-center text-mining-accent">
                    <Info size={16} />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase">Exclusion Zone Control</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                    Exclusion perimeters require a minimum boundary limit of 500m. Operations are halted if mobile sensors verify entry.
                  </p>
                </div>
                <div className="p-6 bg-mining-card border border-mining-border rounded-2xl flex flex-col gap-3">
                  <div className="h-8 w-8 bg-mining-accent/10 rounded-lg flex items-center justify-center text-mining-accent">
                    <AlertTriangle size={16} />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase">Atmospheric Verification</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                    Active lightning triggers automatically drop operations checklist clearances to reject status.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* SECTION 6: MINING HAZARD ARTICLES */}
          <motion.section 
            id="articles" 
            {...scrollAnimationProps}
            className="border-t border-mining-border bg-mining-card/5 py-20 px-4"
          >
            <div className="max-w-6xl mx-auto flex flex-col gap-12">
              <div className="text-center flex flex-col items-center gap-3">
                <span className="text-[10px] text-mining-accent font-mono font-bold tracking-widest uppercase">knowledge database</span>
                <h3 className="text-2xl sm:text-4xl font-extrabold text-white uppercase font-display">Mining Hazard Articles</h3>
                <p className="text-xs text-gray-400">Mitigation strategies and engineering reports covering blast hazards.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                <article className="bg-mining-card border border-mining-border rounded-2xl overflow-hidden flex flex-col justify-between group">
                  <div className="p-6 flex flex-col gap-4">
                    <span className="text-[9px] font-mono text-mining-gold font-bold uppercase tracking-wider bg-mining-gold/5 px-2 py-1 border border-mining-gold/20 rounded w-fit">Mitigation</span>
                    <h4 className="text-sm font-extrabold text-white uppercase group-hover:text-mining-accent transition-colors font-display">1. Flyrock Hazards Control</h4>
                    <p className="text-xs text-gray-400 leading-relaxed font-sans">
                      Flyrock represents fragmentation escaping blast boundaries. Strict delay timings and charge calculations limit hazard risks.
                    </p>
                  </div>
                  <div className="px-6 pb-6 pt-4 border-t border-mining-border/50 text-[10px] font-mono text-gray-400 flex justify-between items-center">
                    <span>By Dr. Alok Prasad</span>
                    <span>Read Full ➔</span>
                  </div>
                </article>

                <article className="bg-mining-card border border-mining-border rounded-2xl overflow-hidden flex flex-col justify-between group">
                  <div className="p-6 flex flex-col gap-4">
                    <span className="text-[9px] font-mono text-[#00ccff] font-bold uppercase tracking-wider bg-[#00ccff]/5 px-2 py-1 border border-[#00ccff]/20 rounded w-fit">Structural</span>
                    <h4 className="text-sm font-extrabold text-white uppercase group-hover:text-[#00ccff] transition-colors font-display">2. Vibration Vector Dampening</h4>
                    <p className="text-xs text-gray-400 leading-relaxed font-sans">
                      Ground velocity coordinates are tracked to shield concrete frames. Safe burden optimizations drop resonant vibrations.
                    </p>
                  </div>
                  <div className="px-6 pb-6 pt-4 border-t border-mining-border/50 text-[10px] font-mono text-gray-400 flex justify-between items-center">
                    <span>By Safety Board</span>
                    <span>Read Full ➔</span>
                  </div>
                </article>

                <article className="bg-mining-card border border-mining-border rounded-2xl overflow-hidden flex flex-col justify-between group">
                  <div className="p-6 flex flex-col gap-4">
                    <span className="text-[9px] font-mono text-[#a855f7] font-bold uppercase tracking-wider bg-[#a855f7]/5 px-2 py-1 border border-[#a855f7]/20 rounded w-fit">Chemical</span>
                    <h4 className="text-sm font-extrabold text-white uppercase group-hover:text-[#a855f7] transition-colors font-display">3. Toxic Fumes Dispersal</h4>
                    <p className="text-xs text-gray-400 leading-relaxed font-sans">
                      Nitrous oxides generated by low explosive quality trigger respiratory hazards. Sensor audits clear return entries.
                    </p>
                  </div>
                  <div className="px-6 pb-6 pt-4 border-t border-mining-border/50 text-[10px] font-mono text-gray-400 flex justify-between items-center">
                    <span>By Dr. John Doe</span>
                    <span>Read Full ➔</span>
                  </div>
                </article>

              </div>
            </div>
          </motion.section>

          {/* SECTION 7: HAZARDS CHECKS */}
          <motion.section 
            id="hazards" 
            {...scrollAnimationProps}
            className="border-t border-mining-border py-20 px-4"
          >
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12 bg-mining-card/45 border border-mining-border p-8 rounded-3xl relative overflow-hidden">
              <div className="flex-1 flex flex-col gap-5 z-10">
                <span className="text-[10px] text-red-400 font-mono font-bold tracking-widest uppercase flex items-center gap-1.5">
                  <ShieldAlert size={12} /> critical warnings
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white uppercase font-display">Mining Hazard Checklist</h3>
                <ul className="text-xs text-gray-300 flex flex-col gap-3 font-sans list-disc list-inside">
                  <li>Faulty spacing triggers high rock ejection vectors</li>
                  <li>Humidity alters safety performance limits of cords</li>
                  <li>Overcrowded loading spots risk operations halts</li>
                </ul>
              </div>
              <div className="h-44 w-44 bg-gradient-to-tr from-mining-accent/20 to-[#a855f7]/20 border border-mining-border rounded-2xl flex items-center justify-center text-mining-accent animate-pulse relative shrink-0">
                <ShieldAlert size={80} className="text-mining-accent/80" />
                <div className="absolute inset-0 border border-mining-accent/30 rounded-2xl rotate-45 scale-105 pointer-events-none" />
                <div className="absolute inset-0 border border-mining-accent/15 rounded-2xl -rotate-45 scale-110 pointer-events-none" />
              </div>
            </div>
          </motion.section>

          {/* SECTION 8: LATEST INDUSTRY INSIGHTS */}
          <motion.section 
            {...scrollAnimationProps}
            className="border-t border-mining-border bg-mining-card/15 py-20 px-4"
          >
            <div className="max-w-6xl mx-auto flex flex-col gap-12">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-mining-gold font-mono font-bold tracking-widest uppercase">global updates</span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white uppercase font-display">Industry Insights</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-gray-300">
                <div className="p-6 bg-mining-card border border-mining-border rounded-2xl flex flex-col gap-3">
                  <span className="text-[9px] font-mono text-[#00ccff] uppercase font-bold tracking-widest">august 2026 update</span>
                  <h4 className="text-sm font-bold text-white uppercase font-display">DGMS Spacing Standards Revision</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                    DGMS compliance parameters require strict digital ledger checks. Operations logs using immutable signatures are recommended.
                  </p>
                </div>
                <div className="p-6 bg-mining-card border border-mining-border rounded-2xl flex flex-col gap-3">
                  <span className="text-[9px] font-mono text-[#a855f7] uppercase font-bold tracking-widest">research release</span>
                  <h4 className="text-sm font-bold text-white uppercase font-display">Decentralized Blast Verification</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                    Statistical studies report 42% reduction in safety failures upon implementing digital checklists and active sensor locks.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* SECTION 9: CONTACT SECTION */}
          <motion.section 
            id="contact" 
            {...scrollAnimationProps}
            className="border-t border-mining-border bg-mining-card/25 py-20 px-4"
          >
            <div className="max-w-4xl mx-auto flex flex-col gap-10">
              <div className="text-center flex flex-col items-center gap-3">
                <span className="text-[10px] text-mining-accent font-mono font-bold tracking-widest uppercase">support network</span>
                <h3 className="text-2xl sm:text-4xl font-extrabold text-white uppercase font-display">Contact Platform Command</h3>
                <p className="text-xs text-gray-400 max-w-md">Reach out to platform operations for support or telemetry review queries.</p>
              </div>

              {contactSuccess && (
                <div className="bg-green-950/20 border border-green-800 text-green-400 p-4 rounded-xl text-xs font-bold text-center leading-relaxed">
                  Thank you! Your message has been routed to safety platform command.
                </div>
              )}

              <form onSubmit={handleContactSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-mining-card border border-mining-border p-8 rounded-3xl relative">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-mining-dark border border-mining-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mining-accent" 
                    placeholder="Enter name"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-mining-dark border border-mining-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mining-accent" 
                    placeholder="Enter email"
                  />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Operational Message</label>
                  <textarea 
                    rows={4} 
                    required 
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                    className="w-full bg-mining-dark border border-mining-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mining-accent resize-none" 
                    placeholder="Write message here..."
                  />
                </div>
                <div className="sm:col-span-2 mt-2">
                  <button 
                    type="submit" 
                    className="w-full btn-neon-yellow py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Send size={14} /> Send Message
                  </button>
                </div>
              </form>
            </div>
          </motion.section>

        </div>
      )}

      {/* RESPONSIVE AUTHENTICATION MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg bg-mining-card border border-mining-border p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col gap-5 relative max-h-[90vh] overflow-y-auto"
            >
              {/* Close button */}
              <button 
                onClick={() => { setShowAuthModal(false); setIsVerifying(false); setIsResettingPassword(false); setErrorMsg(null); setSuccessMsg(null); }}
                className="absolute right-4 top-4 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-mining-border/50 transition-all animate-pulse"
              >
                <X size={18} />
              </button>

              <div className="text-center">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                  {isResettingPassword 
                    ? 'Reset Password' 
                    : isVerifying 
                      ? 'Verification Needed' 
                      : authTab === 'forgot'
                        ? 'Password Recovery'
                        : 'Platform Authentication'
                  }
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {isResettingPassword 
                    ? 'Define secure credentials for your profile' 
                    : isVerifying 
                      ? 'Enter 6-digit OTP verification code' 
                      : authTab === 'forgot'
                        ? 'Request verification OTP to update password'
                        : 'Secure multi-factor portal validation'
                  }
                </p>
              </div>

              {/* Display Tabs (only if not verifying or resetting) */}
              {!isVerifying && !isResettingPassword && (
                <div className="flex border-b border-mining-border">
                  <button
                    onClick={() => openAuthWithTab('login')}
                    className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      authTab === 'login' 
                        ? 'border-mining-accent text-white font-black' 
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => openAuthWithTab('register')}
                    className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      authTab === 'register' 
                        ? 'border-mining-accent text-white font-black' 
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Register
                  </button>
                </div>
              )}

              {successMsg && (
                <div className="bg-green-950/25 border border-green-800 text-green-400 p-3 rounded-lg text-xs leading-relaxed font-bold">
                  {successMsg}
                </div>
              )}

              {errorMsg && (
                <div className="bg-red-950/25 border border-red-800 text-red-400 p-3 rounded-lg text-xs leading-relaxed font-bold flex flex-col gap-2">
                  <span>{errorMsg}</span>
                  {errorMsg === "Account already exists." && (
                    <div className="flex gap-4 mt-1 border-t border-red-900/35 pt-1.5">
                      <button 
                        onClick={() => openAuthWithTab('login')} 
                        className="text-mining-gold hover:underline text-[10px] font-bold uppercase"
                      >
                        Login Instead
                      </button>
                      <button 
                        onClick={() => openAuthWithTab('forgot')} 
                        className="text-gray-400 hover:text-white hover:underline text-[10px] font-bold uppercase"
                      >
                        Forgot Password
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Conditional step forms */}
              {isResettingPassword ? (
                /* Password Reset Input Screen */
                <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-semibold">New Safe Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-mining-dark border border-mining-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-mining-accent"
                      placeholder="Min 6 characters"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full btn-neon-yellow py-2.5 rounded-xl font-bold mt-2"
                  >
                    {submitting ? 'HASHING & UPDATING...' : 'UPDATE PASSWORD & SIGN IN'}
                  </button>
                </form>
              ) : isVerifying ? (
                /* OTP Verification */
                <form onSubmit={authTab === 'forgot' ? handleVerifyResetOTP : handleVerifyOTP} className="flex flex-col gap-4">
                  <div className="bg-mining-accent/5 border border-mining-accent/20 p-3.5 rounded-xl text-xs flex flex-col gap-1 text-gray-300">
                    <div className="flex justify-between items-center">
                      <span>Target: <strong>{authTab === 'register' ? verificationEmail : (authTab === 'forgot' ? forgotIdentifier : loginIdentifier)}</strong></span>
                      <button 
                        type="button" 
                        onClick={() => { setIsVerifying(false); setErrorMsg(null); setSuccessMsg(null); }}
                        className="text-mining-gold font-bold hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-semibold">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full bg-mining-dark border border-mining-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-mining-accent tracking-widest font-mono font-bold text-center"
                      placeholder="XXXXXX"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full btn-neon-yellow py-2.5 rounded-xl font-bold mt-2"
                  >
                    {submitting ? 'VERIFYING...' : 'VERIFY & CONTINUE'}
                  </button>

                  <div className="text-center mt-2">
                    {resendTimer > 0 ? (
                      <span className="text-[11px] text-gray-500 font-bold">Resend code in {resendTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={submitting}
                        className="text-[11px] text-mining-gold font-bold hover:underline"
                      >
                        Resend Code Now
                      </button>
                    )}
                  </div>
                </form>
              ) : authTab === 'login' ? (
                /* Login Tab */
                <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                  {/* Login Mode Toggle: Password vs OTP */}
                  <div className="flex bg-mining-dark border border-mining-border rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => { setLoginMode('password'); setLoginPassword(''); setErrorMsg(null); }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        loginMode === 'password' ? 'bg-mining-accent/20 text-mining-accent border border-mining-accent/40' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Lock size={12} className="inline mr-1 -mt-0.5" />Password
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoginMode('otp'); setLoginPassword(''); setErrorMsg(null); }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        loginMode === 'otp' ? 'bg-mining-accent/20 text-mining-accent border border-mining-accent/40' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Mail size={12} className="inline mr-1 -mt-0.5" />OTP Code
                    </button>
                  </div>

                  {loginMode === 'otp' && (
                    <div className="flex bg-mining-dark border border-mining-border rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => { setLoginMethod('email'); setLoginIdentifier(''); setErrorMsg(null); }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          loginMethod === 'email' ? 'bg-mining-border text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Email Address
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLoginMethod('phone'); setLoginIdentifier(''); setErrorMsg(null); }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          loginMethod === 'phone' ? 'bg-mining-border text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Phone Number
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-semibold">
                      {loginMode === 'password' ? 'Email Address or Phone' : (loginMethod === 'email' ? 'Email Address' : 'Phone Number')}
                    </label>
                    <input
                      type={loginMode === 'password' ? 'text' : (loginMethod === 'email' ? 'email' : 'text')}
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full bg-mining-dark border border-mining-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-mining-accent"
                      placeholder={loginMode === 'password' ? 'yourname@company.com or phone' : (loginMethod === 'email' ? 'yourname@company.com' : '+91 99999 88888')}
                    />
                  </div>

                  {loginMode === 'password' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-400 font-semibold">Password</label>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-mining-dark border border-mining-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-mining-accent"
                        placeholder="Enter your password"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full btn-neon-yellow py-2.5 rounded-xl font-bold mt-2"
                  >
                    {submitting 
                      ? (loginMode === 'password' ? 'SIGNING IN...' : 'SENDING OTP...') 
                      : (loginMode === 'password' ? 'SIGN IN' : 'REQUEST SECURE OTP')}
                  </button>

                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={() => openAuthWithTab('forgot')}
                      className="text-[11px] text-gray-400 hover:text-white hover:underline font-bold uppercase tracking-wider"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </form>
              ) : authTab === 'forgot' ? (
                /* Forgot password request OTP */
                <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                  <div className="flex bg-mining-dark border border-mining-border rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => { setForgotMethod('email'); setForgotIdentifier(''); setErrorMsg(null); }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        forgotMethod === 'email' ? 'bg-mining-border text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Email Address
                    </button>
                    <button
                      type="button"
                      onClick={() => { setForgotMethod('phone'); setForgotIdentifier(''); setErrorMsg(null); }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        forgotMethod === 'phone' ? 'bg-mining-border text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Phone Number
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-semibold">
                      {forgotMethod === 'email' ? 'Registered Email' : 'Registered Phone'}
                    </label>
                    <input
                      type={forgotMethod === 'email' ? 'email' : 'text'}
                      required
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      className="w-full bg-mining-dark border border-mining-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-mining-accent"
                      placeholder={forgotMethod === 'email' ? 'yourname@company.com' : '+91 99999 88888'}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full btn-neon-yellow py-2.5 rounded-xl font-bold mt-2"
                  >
                    {submitting ? 'SENDING CODE...' : 'REQUEST PASSWORD RESET OTP'}
                  </button>

                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={() => openAuthWithTab('login')}
                      className="text-[11px] text-gray-400 hover:text-white hover:underline font-bold uppercase tracking-wider"
                    >
                      Return to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                /* Register Form */
                <form onSubmit={handleRegisterSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-semibold">Full Name</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-mining-dark border border-mining-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-mining-accent"
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-semibold">Company Name</label>
                    <input
                      type="text"
                      required
                      value={regCompany}
                      onChange={(e) => setRegCompany(e.target.value)}
                      className="w-full bg-mining-dark border border-mining-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-mining-accent"
                      placeholder="Apex Mining Corp"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-semibold">Designation</label>
                    <input
                      type="text"
                      required
                      value={regDesignation}
                      onChange={(e) => setRegDesignation(e.target.value)}
                      className="w-full bg-mining-dark border border-mining-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-mining-accent"
                      placeholder="Blasting Officer"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-semibold">Email Address</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-mining-dark border border-mining-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-mining-accent"
                      placeholder="john.doe@company.com"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-semibold">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-mining-dark border border-mining-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-mining-accent"
                      placeholder="+91 99999 88888"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-semibold">Country</label>
                    <input
                      type="text"
                      required
                      value={regCountry}
                      onChange={(e) => setRegCountry(e.target.value)}
                      className="w-full bg-mining-dark border border-mining-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-mining-accent"
                      placeholder="India"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-semibold">Create Password</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-mining-dark border border-mining-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-mining-accent"
                      placeholder="Min 6 characters"
                    />
                  </div>

                  <div className="sm:col-span-2 mt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full btn-neon-yellow py-2.5 rounded-xl font-bold"
                    >
                      {submitting ? 'DISPATCHING OTP...' : 'REGISTER & VERIFY'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="border-t border-mining-border bg-mining-card/40 py-4 text-center text-[10px] text-gray-500 font-mono">
        © 2026 Mining Intelligence Platform. All rights reserved. Secured Audit Hashing Enabled.
      </footer>
    </div>
  );
}