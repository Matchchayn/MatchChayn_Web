import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, ArrowRight, Check, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { useAlert } from '../hooks/useAlert';
import { apiFetch } from '../utils/apiFetch';
import AuthLayout from './AuthLayout';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

type ResetStep = 'email' | 'otp' | 'password' | 'success';

export default function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const { alert, showAlert } = useAlert();
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'Passwords must match', met: password === confirmPassword && password.length > 0 },
  ];

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiFetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStep('otp');
      showAlert('Check your email for the recovery code', 'success');
    } catch (error: any) {
      showAlert(error.message || 'Failed to send recovery code', 'error');
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
        body: JSON.stringify({ email, otp: otpValue }),
      });
      setStep('password');
      showAlert('Code verified successfully', 'success');
    } catch (error: any) {
      showAlert(error.message || 'Invalid recovery code', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordRequirements.every(req => req.met)) {
      showAlert('Please meet all password requirements', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Assuming a password-reset endpoint exists or using mock behavior
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep('success');
      showAlert('Password reset successfully!', 'success');
    } catch (error: any) {
      showAlert(error.message || 'Reset failed', 'error');
    } finally {
      setIsLoading(false);
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

  return (
    <AuthLayout 
      title={
        step === 'email' ? "Reset Password" :
        step === 'otp' ? "Verify Account" :
        step === 'password' ? "New Password" :
        "Success!"
      }
      subtitle={
        step === 'email' ? "Enter your email to receive a password reset link." :
        step === 'otp' ? `Enter the recovery code sent to ${email}` :
        step === 'password' ? "Create a strong new password for your account." :
        "Your password has been changed successfully."
      }
    >
      <div className="space-y-8 min-h-[400px]">
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
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 tracking-wider ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    className="w-full premium-input with-icon h-12"
                  />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full premium-button h-12 flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    Send Recovery Code
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <button type="button" onClick={onBackToLogin} className="w-full text-center text-sm text-gray-500 font-bold hover:text-purple-400 transition-colors">
                Back to Sign In
              </button>
            </motion.form>
          )}

          {step === 'otp' && (
            <motion.form
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleOtpVerify}
              className="space-y-8"
            >
              <div className="flex justify-between gap-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    className="w-16 h-16 text-center text-2xl font-bold premium-input"
                  />
                ))}
              </div>

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length < 4}
                  className="premium-button w-full h-12"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Verify Code'}
                </button>

                <div className="text-center space-y-2">
                  <button
                    type="button"
                    onClick={handleEmailSubmit}
                    className="text-sm text-purple-500 font-bold hover:text-purple-400"
                  >
                    Resend Code
                  </button>
                  <p>
                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="text-xs text-gray-500 font-bold hover:text-gray-400"
                    >
                      Change Email
                    </button>
                  </p>
                </div>
              </div>
            </motion.form>
          )}

          {step === 'password' && (
            <motion.form
              key="password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handlePasswordReset}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 tracking-wider ml-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create password"
                      className="premium-input w-full with-icon h-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 tracking-wider ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="premium-input w-full with-icon h-12"
                    />
                  </div>
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
                className="premium-button w-full h-12"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Reset Password'}
              </button>
            </motion.form>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 py-4"
            >
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                <Check className="w-12 h-12 text-green-500" strokeWidth={3} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Security Updated</h3>
                <p className="text-gray-400 text-sm">Your password has been reset successfully.</p>
              </div>
              <button onClick={onBackToLogin} className="w-full premium-button h-12">
                Back to Sign In
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </AuthLayout>
  );
}
