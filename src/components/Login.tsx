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
        background: '#ffffff',
        color: '#000000',
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

        <button 
          type="submit" 
          disabled={isLoading} 
          className="w-full text-white font-bold text-lg rounded-full h-12 sm:h-14 transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center"
          style={{ background: 'linear-gradient(90deg, #9700FF 0%, #B95AFB 65.87%)' }}
        >
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Login'}
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

      <div className="flex items-center gap-4 py-2 mt-4">
        <div className="flex-1 border-t border-white/20"></div>
        <span className="text-xs text-white">or continue with</span>
        <div className="flex-1 border-t border-white/20"></div>
      </div>

      <div className="flex justify-center gap-4 mt-2">
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

      <div className="pt-8 text-center px-4">
        <p className="text-[10px] sm:text-xs text-gray-400 font-medium">
          By continuing, you agree to matchchayn{' '}
          <a href="#" className="text-white underline font-bold">Terms of service</a>{' '}
          and <a href="#" className="text-white underline font-bold">Privacy Policy.</a>
        </p>
      </div>

    </AuthLayout>
  );
}
