import React, { useState } from 'react';
import { UserProfile } from '../../types';
import MainLayout from '../../components/MainLayout';
import { Crown, CheckCircle2, Sparkles, Heart, Shield, Calendar, Users, X, Loader2 } from 'lucide-react';
import { auth } from '../../firebase';
import { downgradeUserToFree, upgradeUserToPro } from './proService';
import { useAlert } from '../../hooks/useAlert';

interface PremiumPageProps {
  profile: UserProfile | null;
}

export default function PremiumPage({ profile }: PremiumPageProps) {
  const { showAlert } = useAlert();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);

  const handleUpgrade = async () => {
    if (!auth.currentUser) return;
    setIsUpgrading(true);
    try {
      // Simulation delay for demo
      await new Promise(resolve => setTimeout(resolve, 1500));
      await upgradeUserToPro(auth.currentUser.uid);
      if (profile) profile.isPro = true;
      showAlert('Welcome to VIP! Your account has been upgraded.', 'success');
    } catch (e: any) {
      console.error(e);
      showAlert(e.message || 'Upgrade failed. Please try again.', 'error');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!auth.currentUser) return;
    setIsDowngrading(true);
    try {
      await downgradeUserToFree(auth.currentUser.uid);
      if (profile) profile.isPro = false;
      showAlert('Your account has been switched to the Free plan.', 'success');
    } catch (e: any) {
      console.error(e);
      showAlert(e.message || 'Action failed. Please try again.', 'error');
    } finally {
      setIsDowngrading(false);
    }
  };

  return (
    <MainLayout profile={profile}>
      <div className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col justify-center min-h-0">
        {/* Header */}
        <div className="text-center space-y-4 mb-16 animate-in fade-in zoom-in duration-500 mt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Choose Your MatchChayn Experience
          </h1>
          <p className="text-gray-400 font-medium max-w-2xl mx-auto text-lg">
            Unlock the full potential of your dating journey with our VIP features.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center pb-20">
          {/* Basic Plan */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8 flex flex-col h-[500px]">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-300">Basic</h2>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-white">Free</span>
              </div>
              <p className="text-gray-500 text-sm font-medium">For casual dating and making basic connections.</p>
            </div>

            <ul className="space-y-4 flex-1">
              <li className="flex items-center gap-3 text-sm font-medium text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-gray-500 shrink-0" />
                Unlimited Swipes
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-gray-500 shrink-0" />
                Basic Matching
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-gray-500 shrink-0" />
                Attend Public Events
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-gray-600">
                <X className="w-5 h-5 text-rose-500/50 shrink-0" />
                See Who Likes You instantly
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-gray-600">
                <X className="w-5 h-5 text-rose-500/50 shrink-0" />
                Host & Create Custom Events
              </li>
            </ul>

            {profile?.isPro ? (
              <button 
                onClick={handleDowngrade}
                disabled={isDowngrading}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
              >
                {isDowngrading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Switch to Free'}
              </button>
            ) : (
              <button disabled className="w-full py-4 bg-white/5 border border-white/10 text-gray-400 rounded-2xl font-bold transition-all cursor-not-allowed">
                Current Plan
              </button>
            )}
          </div>

          {/* Premium Plan */}
          <div className="relative bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] rounded-3xl p-8 space-y-8 flex flex-col min-h-[550px] transform md:-translate-y-4 border border-purple-500/30">
            <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-10">
              <Crown className="w-32 h-32 text-purple-200" />
            </div>
            
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full">
              Most Popular
            </div>

            <div className="space-y-4 relative z-10">
              <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                VIP Premium <Crown className="w-5 h-5" />
              </h2>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-white">0.1 SOL</span>
                <span className="text-purple-300 font-medium mb-1">/ one-time</span>
              </div>
              <p className="text-purple-200 text-sm font-medium">Lifetime access to all premium edge features.</p>
            </div>

            <ul className="space-y-4 flex-1 relative z-10">
              <li className="flex items-center gap-3 text-sm font-bold text-white">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                Everything in Basic
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-white">
                <Heart className="w-5 h-5 text-amber-400 shrink-0 fill-amber-400/20" />
                See Who Likes You instantly
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-white">
                <Calendar className="w-5 h-5 text-amber-400 shrink-0 fill-amber-400/20" />
                Host & Create Custom Events
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-white">
                <Users className="w-5 h-5 text-amber-400 shrink-0 fill-amber-400/20" />
                Priority Profile Boosting
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-white">
                <Shield className="w-5 h-5 text-amber-400 shrink-0 fill-amber-400/20" />
                VIP Profile Badge
              </li>
            </ul>

            {profile?.isPro ? (
              <button disabled className="relative z-10 w-full py-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Active
              </button>
            ) : (
              <button 
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="relative z-10 w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-2xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Upgrade to VIP'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
