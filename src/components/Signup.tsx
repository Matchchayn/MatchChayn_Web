import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import envelopeOpen from '../assets/envelope-open.png';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useAlert } from '../hooks/useAlert';
import { apiFetch } from '../utils/apiFetch';
import { clearProfileCache, createUserProfile } from '../utils/userProfileService';
import GoogleAuth from './third_party_auth/GoogleAuth';
import AppleAuth from './third_party_auth/AppleAuth';
import TermsModal from './TermsModal';
import { SignupStep } from '../types';
import AuthLayout from './AuthLayout';

interface SignupProps {
  onSignupSuccess?: (user: any) => void;
  onToggleLogin: () => void;
}

export default function Signup({ onSignupSuccess, onToggleLogin }: SignupProps) {
  const { alert, showAlert } = useAlert();
  const [step, setStep] = useState<SignupStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);
  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      showAlert('Please agree to the Terms and Conditions', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await apiFetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setStep('otp');
      showAlert('OTP sent to your email', 'success');
    } catch (error: any) {
      showAlert(error.message || 'Failed to send OTP', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    
    setIsLoading(true);
    try {
      await apiFetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setResendCooldown(30);
      showAlert('A new verification code has been sent', 'success');
    } catch (error: any) {
      showAlert(error.message || 'Failed to resend code', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length < 4) return;

    setIsLoading(true);
    try {
      await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), otp: otpValue }),
      });
      setStep('password');
      showAlert('Email verified successfully', 'success');
    } catch (error: any) {
      showAlert(error.message || 'Invalid OTP', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordRequirements.every(req => req.met)) {
      showAlert('Please meet all password requirements', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: email.split('@')[0] });
      // We no longer call createUserProfile here—let Onboarding flow handle it!

      handleAuthSuccess(userCredential.user);
    } catch (error: any) {
      showAlert(error.message || 'Signup failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async (user: any) => {
    clearProfileCache();
    showAlert('Welcome to MatchChayn!', 'success');

    // Send welcome email for newly created social accounts (Google/Apple)
    // Check if account was created within the last 30 seconds to avoid sending on every login
    const createdAt = user?.metadata?.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;
    const isNewUser = Date.now() - createdAt < 30000;
    if (isNewUser && user?.email) {
      try {
        await apiFetch('/api/auth/welcome', {
          method: 'POST',
          body: JSON.stringify({ 
            email: user.email,
            firstName: user.displayName?.split(' ')[0] || user.email.split('@')[0]
          }),
        });
      } catch (err) {
        // Non-blocking — welcome email failure should not affect the login flow
        console.warn('Welcome email failed:', err);
      }
    }

    if (onSignupSuccess) {
      onSignupSuccess(user);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <AuthLayout 
      title={step === 'otp' || step === 'password' ? "" : "Create Account"}
      subtitle={step === 'otp' || step === 'password' ? "" : "Start your journey today"}
    >
      <div className={step === 'otp' ? "space-y-2 sm:space-y-4" : "space-y-8"}>
        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.form
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleEmailSubmit}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 tracking-wider ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="premium-input w-full with-icon"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="peer w-5 h-5 rounded-[4px] border-2 border-white/60 bg-transparent appearance-none cursor-pointer checked:bg-transparent checked:border-white transition-all outline-none"
                    />
                    <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                  </div>
                  <label htmlFor="terms" className="text-sm text-white font-medium cursor-pointer">
                    Agree with{' '}
                    <button
                      type="button"
                      onClick={() => setIsTermsModalOpen(true)}
                      className="text-white font-bold hover:underline transition-all"
                    >
                      Terms and Conditions
                    </button>{' '}
                    (18+ Only)
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-white font-bold text-lg rounded-full h-12 sm:h-14 transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center"
                style={{ background: 'linear-gradient(90deg, #9700FF 0%, #B95AFB 65.87%)' }}
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Get Started'}
              </button>

              <p className="text-center text-gray-400 font-medium pt-4">
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={onToggleLogin} 
                  className="text-purple-500 font-bold hover:text-purple-400 transition-colors"
                >
                  Log In
                </button>
              </p>

              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 border-t border-white/20"></div>
                <span className="text-xs text-white">or continue with</span>
                <div className="flex-1 border-t border-white/20"></div>
              </div>

              <div className="flex justify-center gap-4">
                <GoogleAuth
                  onSuccess={handleAuthSuccess}
                  onBeforeLogin={() => {
                    if (!agreedToTerms) {
                      showAlert('Please agree to the Terms and Conditions', 'error');
                      return false;
                    }
                    return true;
                  }}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  variant="circle"
                />
                <AppleAuth
                  onSuccess={handleAuthSuccess}
                  onBeforeLogin={() => {
                    if (!agreedToTerms) {
                      showAlert('Please agree to the Terms and Conditions', 'error');
                      return false;
                    }
                    return true;
                  }}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  variant="circle"
                />
              </div>
            </motion.form>
          )}

          {step === 'otp' && (
            <motion.form
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleOtpVerify}
              className="space-y-4 sm:space-y-5"
            >
              {/* Back Button */}
              <button 
                type="button"
                onClick={() => setStep('email')}
                className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors group mb-0 sm:mb-2"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-all">
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="hidden sm:inline font-bold text-sm">Back</span>
              </button>

              <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                <img src={envelopeOpen} alt="Mail Icon" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
                <div className="space-y-0.5 sm:space-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">You've got a mail!</h2>
                  <p className="text-gray-400 text-[11px] sm:text-xs max-w-[280px] sm:max-w-none mx-auto leading-relaxed">
                    Check your inbox. Please enter the verification code sent to your email: <span className="text-white font-semibold">{email}</span>
                  </p>
                </div>
              </div>

              <div className="flex justify-between gap-3 py-2 sm:py-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-transparent border-2 border-white/20 rounded-xl text-white outline-none focus:border-[#9700FF] focus:ring-4 focus:ring-[#9700FF]/20 transition-all"
                  />
                ))}
              </div>

              <div className="text-center">
                <p className="text-[10px] sm:text-xs text-gray-400 font-medium">
                  Didn't receive an email?{' '}
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={handleResendOtp}
                    className="text-purple-500 font-bold hover:underline disabled:text-gray-600 transition-all"
                  >
                    {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
                  </button>
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.join('').length < 4}
                className="w-full text-white font-bold text-lg rounded-full h-12 sm:h-14 transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg, #9700FF 0%, #B95AFB 65.87%)' }}
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Verify Email'}
              </button>

              <div className="pt-4 text-center px-4">
                <p className="text-[10px] sm:text-xs text-gray-400 font-medium">
                  By continuing, you agree to matchchayn{' '}
                  <a href="#" className="text-white underline font-bold">Terms of service</a>{' '}
                  and <a href="#" className="text-white underline font-bold">Privacy Policy.</a>
                </p>
              </div>
            </motion.form>
          )}

          {step === 'password' && (
            <motion.form
              key="password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handlePasswordSetup}
              className="space-y-3 sm:space-y-4"
            >
              <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                <div className="flex flex-col items-center gap-2">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Set Password</h2>
                  <p className="text-gray-400 text-[10px] sm:text-xs max-w-[300px] leading-relaxed">
                    Secure your account by setting a password you'll remember.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500 tracking-wide ml-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-white/5 border-2 border-white/10 rounded-xl h-12 sm:h-14 px-4 text-white placeholder:text-white/20 outline-none focus:border-[#9700FF] focus:ring-4 focus:ring-[#9700FF]/10 transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Meter */}
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((i) => {
                      const metCount = passwordRequirements.filter(r => r.met).length;
                      const isActive = metCount > i;
                      const colors = ['bg-rose-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className={`h-1.5 rounded-full transition-all duration-500 ${isActive ? colors[metCount - 1] : 'bg-white/10'}`} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between px-1">
                    {['Poor', 'Weak', 'Normal', 'Strong'].map((label, idx) => (
                      <span key={label} className={`text-[10px] font-bold transition-colors duration-300 ${passwordRequirements.filter(r => r.met).length === idx + 1 ? 'text-white' : 'text-gray-600'}`}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !passwordRequirements.every(req => req.met)}
                className="w-full text-white font-bold text-lg rounded-full h-12 sm:h-14 transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg, #9700FF 0%, #B95AFB 65.87%)' }}
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Set Password'}
              </button>

              <div className="space-y-4 pt-4">
                <p className="text-center text-xs text-gray-400 font-bold tracking-tight">Your password must contain the following:</p>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 max-w-sm mx-auto">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-[4px] border border-white/20 flex items-center justify-center transition-colors ${req.met ? 'bg-purple-600 border-purple-600' : 'bg-transparent'}`}>
                        {req.met && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                      </div>
                      <span className={`text-[10px] sm:text-xs font-medium transition-colors ${req.met ? 'text-white' : 'text-gray-500'}`}>{req.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 text-center px-4">
                <p className="text-[10px] sm:text-xs text-gray-400 font-medium">
                  By continuing, you agree to matchchayn{' '}
                  <a href="#" className="text-white underline font-bold">Terms of service</a>{' '}
                  and <a href="#" className="text-white underline font-bold">Privacy Policy.</a>
                </p>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => {
          setAgreedToTerms(true);
          setIsTermsModalOpen(false);
        }}
      />

    </AuthLayout>
  );
}
