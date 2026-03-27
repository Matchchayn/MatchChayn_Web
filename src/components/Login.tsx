import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAlert } from '../hooks/useAlert';
import GoogleAuth from './third_party_auth/GoogleAuth';
import AppleAuth from './third_party_auth/AppleAuth';
import AuthLayout from './AuthLayout';

interface LoginProps {
  onLoginSuccess?: (user: any) => void;
  onToggleSignup: () => void;
  onForgotPassword: () => void;
}

export default function Login({ onLoginSuccess, onToggleSignup, onForgotPassword }: LoginProps) {
  const { alert, showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apologyShown, setApologyShown] = useState(false);

  useEffect(() => {
    if (!apologyShown) {
      Swal.fire({
        title: 'Important Update',
        html: `
          <div class="text-left space-y-4">
            <p>We had some database decision making problems that affected users data that resulted in <b>dataloses</b>.</p>
            <p>We advise you to <b>signup again</b> with real data and videos of your original self.</p>
            <p class="text-purple-400 font-bold italic">This is the final wave.</p>
          </div>
        `,
        icon: 'warning',
        background: '#1a1b3b',
        color: '#ffffff',
        confirmButtonColor: '#a855f7',
        confirmButtonText: 'I Understand',
        customClass: {
          popup: 'rounded-3xl border border-white/10 backdrop-blur-xl',
          title: 'text-2xl font-bold text-rose-500',
          confirmButton: 'rounded-2xl px-8 py-3 font-bold'
        }
      });
      setApologyShown(true);
    }
  }, [apologyShown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (onLoginSuccess) onLoginSuccess(userCredential.user);
      showAlert('Welcome back!', 'success');
    } catch (error: any) {
      showAlert(error.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Welcome to MatchChayn"
      subtitle="Match with those who vibe on your frequency on chain."
    >
      <form onSubmit={handleLogin} className="space-y-6">
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
              className="w-full premium-input with-icon"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center ml-1">
            <label className="text-xs font-medium text-gray-500 tracking-wider">Your Password</label>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full premium-input with-icon pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="w-full premium-button h-12">
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Sign in'}
        </button>
      </form>

      <div className="flex flex-col items-center space-y-4">
        <button onClick={onForgotPassword} className="text-xs text-purple-500 hover:text-purple-400 font-bold transition-colors">
          Forgot your password?
        </button>
        <p className="text-sm text-gray-400">
          Don't have an account? <button onClick={onToggleSignup} className="text-purple-500 font-bold hover:underline">Sign up</button>
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
        <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-600">
          <span className="bg-[#090a1e] px-4">Social Login</span>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <GoogleAuth
          onSuccess={(user) => onLoginSuccess?.(user)}
          onBeforeLogin={() => true}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          variant="circle"
        />
        <AppleAuth
          onSuccess={(user) => onLoginSuccess?.(user)}
          onBeforeLogin={() => true}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          variant="circle"
        />
      </div>

    </AuthLayout>
  );
}
