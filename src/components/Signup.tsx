import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
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
      title="Create Account"
      subtitle="Start your journey today"
    >
      <div className="space-y-8">
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

                <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-400 leading-tight">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setIsTermsModalOpen(true)}
                      className="text-purple-500 font-bold hover:text-purple-400 transition-colors"
                    >
                      Terms and Conditions
                    </button>{' '}
                    and Privacy Policy.
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="premium-button w-full h-12 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Continue'}
                {!isLoading && <ArrowRight className="w-5 h-5" />}
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

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-600">
                  <span className="bg-[#090a1e] px-4 tracking-widest">Or sign up with</span>
                </div>
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
              className="space-y-6"
            >
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold text-white">Verify Email</h2>
                <p className="text-gray-400 text-sm">Enter the code sent to {email}</p>
              </div>

              <div className="flex justify-between gap-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-16 h-16 text-center text-2xl font-bold premium-input"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.join('').length < 4}
                className="premium-button w-full h-12 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Verify Code'}
              </button>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={handleResendOtp}
                  className="w-full text-purple-500 font-bold text-sm hover:text-purple-400 disabled:text-gray-600 transition-colors"
                >
                  {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-full text-gray-500 font-bold text-sm hover:text-purple-400 transition-colors"
                >
                  Change Email
                </button>
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
              className="space-y-6"
            >
              <div className="space-y-2 text-left">
                <label className="text-xs font-medium text-gray-500 tracking-wider ml-1">Create Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password"
                    className="premium-input with-icon w-full pr-12 h-12"
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

              <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${req.met ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-gray-600'}`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className={req.met ? 'text-green-500 font-medium' : 'text-gray-500'}>{req.label}</span>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading || !passwordRequirements.every(req => req.met)}
                className="premium-button w-full h-12 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Complete Signup'}
              </button>
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
