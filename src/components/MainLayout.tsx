import React, { useState } from 'react';
import { Bell, ChevronDown, Plus, Heart, MessageCircle, Calendar, User, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import Sidebar from './Sidebar';
import { UserProfile } from '../types';
import logo from '../assets/matchlogo.png';
import NotificationModal from './NotificationModal';

interface MainLayoutProps {
  children: React.ReactNode;
  profile: UserProfile | null;
  noScroll?: boolean;
}

export default function MainLayout({ children, profile, noScroll = false }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const isAdmin = profile?.email?.toLowerCase() === 'josephsunday9619@gmail.com' || profile?.email?.toLowerCase() === 'josephakpansunday@gmail.com' || profile?.role === 'admin';

  const navItems = [
    { id: 'match', icon: Plus, path: '/', label: 'Match' },
    { id: 'likes', icon: Heart, path: '/likes', label: 'Likes' },
    { id: 'messages', icon: MessageCircle, path: '/messages', label: 'Chat' },
    { id: 'events', icon: Calendar, path: '/events', label: 'Events' },
    { id: 'profile', icon: User, path: '/profile', label: 'Me' },
  ];

  if (isAdmin) {
    navItems.splice(4, 0, { id: 'admin', icon: LayoutDashboard, path: '/admin', label: 'Admin' });
  }

  return (
    <div className="h-screen bg-[#090a1e] text-white flex flex-col overflow-hidden font-sans">
      {/* Global Top Bar */}
      <header className="h-16 sm:h-20 w-full border-b border-white/5 flex items-center justify-between px-4 sm:px-8 bg-[#090a1e]/60 backdrop-blur-2xl z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-all">
              <img src={logo} alt="MatchChayn Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-purple-400 transition-colors">MatchChayn</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="h-8 w-px bg-white/10 hidden sm:block mx-2" />

          <button
            onClick={() => setIsNotificationOpen(true)}
            className="relative p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full border-2 border-[#090a1e]"></span>
          </button>

          <div
            className="flex items-center gap-3 pl-2 cursor-pointer group"
            onClick={() => navigate('/profile')}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500/30 group-hover:border-purple-500 transition-all p-0.5 bg-gradient-to-tr from-purple-500/20 to-transparent">
              {profile?.media?.some(m => m.type === 'video') && !profile?.media?.some(m => m.type === 'image') ? (
                <video
                  src={profile.media.find(m => m.type === 'video')?.url}
                  autoPlay loop muted playsInline
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <img
                  src={profile?.media?.find(m => m.type === 'image')?.url || profile?.media?.[0]?.url || `https://picsum.photos/seed/${profile?.uid || 'user'}/100/100`}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${profile?.firstName || 'User'}&background=a855f7&color=fff`;
                  }}
                />
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Sidebar profile={profile} isAdmin={isAdmin} />

        <main className={`flex-1 bg-[#090a1e] relative flex flex-col ${noScroll ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar scroll-smooth'}`}>
          <div className={`relative z-10 w-full pb-20 md:pb-0 ${noScroll ? 'h-full' : 'min-h-full'}`}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#090a1e]/80 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-2 z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
                isActive ? 'text-purple-500' : 'text-gray-500'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'scale-110' : 'scale-100'}`} />
              <span className="text-[10px] font-bold tracking-tighter">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="bottom-nav-indicator"
                  className="absolute bottom-1 w-1 h-1 bg-purple-500 rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </div>
  );
}
