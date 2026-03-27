import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Signup from './components/Signup';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ProfileCreation from './components/Onboarding/ProfileCreation';
import InterestSelection from './components/Onboarding/InterestSelection';
import PreferenceSelection from './components/Onboarding/PreferenceSelection';
import MediaUpload from './components/Onboarding/MediaUpload';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import MatchesLikes from './components/MatchesLikes';
import Messages from './components/Messages';
import Events from './components/Events';
import AdminDashboard from './components/AdminDashboard';
import Settings from './components/Settings';
import PremiumPage from './features/pro/PremiumPage';
import ErrorBoundary from './components/ErrorBoundary';
import { OnboardingStep } from './types';
import { getUserProfile } from './utils/userProfileService';
import { Loader2 } from 'lucide-react';
import AuthLayout from './components/AuthLayout';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | 'complete' | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot-password'>('signup');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userProfile = await getUserProfile(currentUser.uid);
        if (userProfile) {
          setProfile(userProfile);
          if (userProfile.media && userProfile.media.length > 0) {
            setOnboardingStep('complete');
          } else if (userProfile.preferences && Object.keys(userProfile.preferences).length > 0) {
            setOnboardingStep('media');
          } else if (userProfile.interests && userProfile.interests.length > 0) {
            setOnboardingStep('preferences');
          } else {
            setOnboardingStep('interests');
          }
        } else {
          setOnboardingStep('profile');
        }
      } else {
        setOnboardingStep(null);
      }
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Force-refresh profile state when onboarding finishes
  useEffect(() => {
    if (user?.uid && onboardingStep === 'complete') {
      getUserProfile(user.uid).then(p => {
        if (p) setProfile(p);
      }).catch(console.error);
    }
  }, [onboardingStep, user?.uid]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090a1e]">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  const steps: (OnboardingStep | 'complete')[] = ['profile', 'interests', 'preferences', 'media'];

  const renderAuth = () => {
    switch (authView) {
      case 'signup':
        return <Signup onSignupSuccess={(u) => setUser(u)} onToggleLogin={() => setAuthView('login')} />;
      case 'login':
        return <Login onLoginSuccess={(u) => setUser(u)} onToggleSignup={() => setAuthView('signup')} onForgotPassword={() => setAuthView('forgot-password')} />;
      case 'forgot-password':
        return <ForgotPassword onBackToLogin={() => setAuthView('login')} />;
    }
  };

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* ... existing routes ... */}
          <Route
            path="/"
            element={
              !user ? (
                renderAuth()
              ) : onboardingStep === 'complete' ? (
                <Dashboard profile={profile} />
              ) : (
                <AuthLayout
                  title={
                    onboardingStep === 'profile' ? "About You" :
                    onboardingStep === 'interests' ? "Your Interests" :
                    onboardingStep === 'preferences' ? "Matching Preferences" :
                    "Show Yourself"
                  }
                  subtitle={
                    onboardingStep === 'profile' ? "Let's start with the basics" :
                    onboardingStep === 'interests' ? "Tell us what you love to do" :
                    onboardingStep === 'preferences' ? "Who would you like to meet?" :
                    "Add some photos to your profile"
                  }
                  heroImage={
                    onboardingStep === 'profile' ? "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846" :
                    onboardingStep === 'interests' ? "https://images.unsplash.com/photo-1523240795612-9a054b0db644" :
                    onboardingStep === 'preferences' ? "https://images.unsplash.com/photo-1511632765486-a01980e01a18" :
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330"
                  }
                  progress={{ current: steps.indexOf(onboardingStep) + 1, total: steps.length }}
                >
                  <div className="space-y-8 animate-fade-in-up">
                    {onboardingStep === 'profile' && <ProfileCreation user={user} onNext={() => setOnboardingStep('interests')} />}
                    {onboardingStep === 'interests' && <InterestSelection user={user} onNext={() => setOnboardingStep('preferences')} />}
                    {onboardingStep === 'preferences' && <PreferenceSelection user={user} onNext={() => setOnboardingStep('media')} />}
                    {onboardingStep === 'media' && <MediaUpload user={user} onComplete={() => setOnboardingStep('complete')} />}
                  </div>
                </AuthLayout>
              )
            }
          />
          <Route path="/profile" element={user ? <Profile profile={profile} /> : <Navigate to="/" />} />
          <Route path="/profile/:id" element={user ? <Profile profile={profile} /> : <Navigate to="/" />} />
          <Route path="/likes" element={user ? <MatchesLikes profile={profile} /> : <Navigate to="/" />} />
          <Route path="/messages" element={user ? <Messages profile={profile} /> : <Navigate to="/" />} />
          <Route path="/messages/:matchId" element={user ? <Messages profile={profile} /> : <Navigate to="/" />} />
          <Route path="/events" element={user ? <Events profile={profile} /> : <Navigate to="/" />} />
          <Route path="/premium" element={user ? <PremiumPage profile={profile} /> : <Navigate to="/" />} />
          <Route path="/admin" element={user ? <AdminDashboard profile={profile} /> : <Navigate to="/" />} />
          <Route path="/settings" element={user ? <Settings profile={profile} /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
