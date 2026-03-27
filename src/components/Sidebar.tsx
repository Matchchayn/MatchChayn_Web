import React from 'react';
import { 
  Heart, 
  User, 
  LogOut,
  Settings as SettingsIcon,
  Ticket,
  MessageSquare,
  LayoutDashboard
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import logo from '../assets/matchlogo.png';
import holdphone from '../assets/holdphone.png';

interface SidebarProps {
  profile: UserProfile | null;
  isAdmin?: boolean;
}

export default function Sidebar({ profile, isAdmin }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const sidebarItems = [
    { id: 'match', label: 'Match', customIcon: true, path: '/' },
    { id: 'likes', label: 'Likes', icon: Heart, path: '/likes' },
    { id: 'messages', label: 'Message', icon: MessageSquare, path: '/messages' },
    { id: 'events', label: 'Events', icon: Ticket, path: '/events' },
    { id: 'profile', label: 'Profiles', icon: User, path: '/profile' },
  ];

  if (isAdmin) {
    sidebarItems.push({ id: 'admin', label: 'Admin Dashboard', icon: LayoutDashboard, path: '/admin' });
  }

  const activeId = sidebarItems.find(item => item.path === location.pathname)?.id || 'match';

  return (
    <aside className="hidden md:flex w-[260px] bg-[#090a1e] h-screen transition-all duration-300 border-r border-white/5 overflow-hidden">
      <div className="flex flex-col overflow-y-auto h-full custom-scrollbar">
        {/* Navigation Section */}
        <nav className="px-5 pt-4 pb-0 space-y-2">
          <div className="max-w-[200px] mx-auto space-y-2">
            {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 py-1.5 transition-all group ${
                location.pathname === item.path
                  ? 'text-white'
                  : 'text-gray-400'
              }`}
            >
              <div className={`transition-all ${location.pathname === item.path ? 'scale-110' : 'scale-100 opacity-60'}`}>
                {item.customIcon ? (
                  <img 
                    src={logo} 
                    alt="Match" 
                    className={`w-5 h-5 object-contain ${location.pathname === item.path ? 'brightness-125' : 'brightness-75'}`}
                  />
                ) : (
                  <item.icon className="w-5 h-5" strokeWidth={2} />
                )}
              </div>
              <span className="text-[14px] font-medium tracking-tight whitespace-nowrap">
                {item.label}
              </span>
            </button>
          ))}
          </div>
        </nav>

        {/* Bottom Actions Section */}
        <div className="mt-8 px-5 pb-6 space-y-4">
          <div className="max-w-[200px] mx-auto space-y-4 pt-4 border-t border-white/5">
            <button 
              onClick={() => navigate('/settings')}
              className="w-full flex items-center gap-3 text-gray-400 transition-all group"
            >
              <SettingsIcon className="w-5 h-5 opacity-60" strokeWidth={2} />
              <span className="text-[14px] font-medium">Settings</span>
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="w-full flex items-center gap-3 text-gray-400 transition-all group"
            >
              <LogOut className="w-5 h-5 opacity-60 rotate-180" strokeWidth={2} />
              <span className="text-[14px] font-medium">Log out</span>
            </button>
          </div>

          {/* App Promo Card */}
          <div className="bg-white rounded-xl p-2 overflow-hidden relative mx-auto w-full max-w-[200px]">
            <div className="flex flex-col items-center">
              <div className="w-full mb-2">
                <img 
                  src={holdphone} 
                  alt="Download App" 
                  className="w-full max-h-[140px] object-contain"
                />
              </div>
              <div className="flex gap-2 w-full mt-2">
                <button className="flex-1 bg-black rounded-lg py-1.5 px-0.5 flex items-center justify-center transition-transform active:scale-95">
                  <div className="flex items-center gap-1 scale-[0.85]">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0">
                      <path d="M17.523 15.341l-3.328 3.328a.494.494 0 0 1-.703 0l-3.328-3.328a8.311 8.311 0 0 1-1.841.218c-4.576 0-8.286-3.709-8.286-8.285C.037 2.709 3.746-1 8.322-1c4.576 0 8.285 3.709 8.285 8.286a8.311 8.311 0 0 1-.218 1.841l3.328 3.328a.494.494 0 0 1 0 .703l-3.328 3.328z"/>
                    </svg>
                    <div className="flex flex-col items-start leading-none gap-0 whitespace-nowrap">
                      <span className="text-[5px] text-white/50 uppercase">Coming soon on</span>
                      <span className="text-[8px] text-white font-bold">Google Play</span>
                    </div>
                  </div>
                </button>
                <button className="flex-1 bg-black rounded-lg py-1.5 px-0.5 flex items-center justify-center transition-transform active:scale-95">
                  <div className="flex items-center gap-1 scale-[0.85]">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.22-1.99 1.08-3.15-1 .04-2.21.67-2.93 1.51-.64.75-1.2 1.94-1.05 3.05 1.11.09 2.19-.66 2.9-1.41z"/>
                    </svg>
                    <div className="flex flex-col items-start leading-none gap-0 whitespace-nowrap">
                      <span className="text-[5px] text-white/50 uppercase">Coming soon on</span>
                      <span className="text-[8px] text-white font-bold">App Store</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
