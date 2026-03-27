import React from 'react';
import { 
  Heart, 
  MessageCircle, 
  Calendar, 
  User, 
  LogOut,
  LayoutDashboard,
  Settings as SettingsIcon,
  Plus,
  Crown
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import logo from '../assets/matchlogo.png';

interface SidebarProps {
  profile: UserProfile | null;
  isAdmin?: boolean;
}

export default function Sidebar({ profile, isAdmin }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const sidebarItems = [
    { id: 'match', label: 'Match', customIcon: true, path: '/' },
    { id: 'likes', label: 'Likes & Matches', icon: Heart, path: '/likes' },
    { id: 'messages', label: 'Messages', icon: MessageCircle, path: '/messages' },
    { id: 'events', label: 'Events', icon: Calendar, path: '/events' },
    { id: 'premium', label: 'Premium', icon: Crown, path: '/premium' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, path: '/settings' },
  ];

  if (isAdmin) {
    sidebarItems.push({ id: 'admin', label: 'Admin Dashboard', icon: LayoutDashboard, path: '/admin' });
  }

  const activeId = sidebarItems.find(item => item.path === location.pathname)?.id || 'match';

  return (
    <aside className="hidden md:flex w-64 border-r border-white/5 flex flex-col bg-[#090a1e] h-full transition-all duration-300">
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">

        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-4 px-6 py-3 transition-all rounded-2xl group ${
              location.pathname === item.path
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {item.customIcon ? (
              <img 
                src={logo} 
                alt="Match" 
                className={`w-5 h-5 object-contain transition-all ${location.pathname === item.path ? 'scale-110 opacity-100' : 'scale-100 opacity-60 group-hover:scale-110 group-hover:opacity-100'}`} 
              />
            ) : (
              <item.icon className={`w-5 h-5 transition-all ${location.pathname === item.path ? 'scale-110 opacity-100 text-white' : 'scale-100 opacity-60 group-hover:scale-110 group-hover:opacity-100 group-hover:text-white'}`} />
            )}
            <span className="font-semibold">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-white/5">
        <button 
          onClick={() => auth.signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all group"
        >
          <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          <span className="font-semibold">Log out</span>
        </button>
      </div>
    </aside>
  );
}
