import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MessageCircle, 
  Check, 
  X,
  Loader2,
  ChevronRight,
  Calendar
} from 'lucide-react';
import giftIcon from '../assets/gift.png';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import { fetchMatchingProfiles } from '../utils/userProfileService';
import { sendMatchRequest, skipUser, fetchMatches, fetchReceivedRequests, respondToRequest, MatchRequest } from '../utils/likesService';
import RelaxConnectMatchCard from './RelaxConnectMatchCard';
import StatusSection from './Status/StatusSection';
import MainLayout from './MainLayout';
import logo from '../assets/matchlogo.png';

interface DashboardProps {
  profile: UserProfile | null;
}

export default function Dashboard({ profile }: DashboardProps) {
  const navigate = useNavigate();
  const [discoveryProfiles, setDiscoveryProfiles] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<UserProfile[]>([]);
  const [received, setReceived] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [rightTab, setRightTab] = useState<'matches' | 'received'>('matches');

  const loadDiscovery = async () => {
    setLoading(true);
    const data = await fetchMatchingProfiles(profile?.preferences?.interestedIn);
    if (data) {
      const completed = data.filter(p => p.media && p.media.length > 0);
      const withId = completed.map(p => ({ ...p, id: p.uid }));
      setDiscoveryProfiles(withId);
    }
    setLoading(false);
  };

  const loadSidebarData = async () => {
    setSidebarLoading(true);
    try {
      const [m, r] = await Promise.all([
        fetchMatches(),
        fetchReceivedRequests()
      ]);
      setMatches(m);
      setReceived(r);
    } catch (err) {
      console.error('Error loading sidebar data:', err);
    } finally {
      setSidebarLoading(false);
    }
  };

  useEffect(() => {
    loadDiscovery();
    loadSidebarData();
  }, [profile?.preferences?.interestedIn]);

  const handleLike = async (targetUserId: string) => {
    try {
      setDiscoveryProfiles(prev => prev.filter(m => (m.id || m.uid) !== targetUserId));
      await sendMatchRequest(targetUserId);
      loadSidebarData(); // Refresh sidebar in case of instant match
    } catch (err) {
      console.error('Error liking profile:', err);
    }
  };

  const handlePass = async (targetUserId: string) => {
    try {
      setDiscoveryProfiles(prev => prev.filter(m => (m.id || m.uid) !== targetUserId));
      await skipUser(targetUserId);
    } catch (err) {
      console.error('Error skipping profile:', err);
    }
  };

  const handleSidebarResponse = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await respondToRequest(requestId, status);
      setReceived(prev => prev.filter(r => r.id !== requestId));
      if (status === 'accepted') {
        loadSidebarData();
      }
    } catch (err) {
      console.error('Error responding to request:', err);
    }
  };

  const renderStatus = () => <StatusSection profile={profile} />;

  const renderPremiumCard = (isSidebar?: boolean) => (
    <div 
      onClick={() => navigate('/premium')}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/20 group hover:border-purple-500/40 transition-all cursor-pointer shadow-xl ${isSidebar ? 'p-4' : 'p-6'}`}
    >
      {!isSidebar && (
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Heart className="w-24 h-24 fill-white text-white" />
        </div>
      )}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`${isSidebar ? 'w-8 h-8' : 'w-10 h-10'} bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0`}>
            <Heart className={`${isSidebar ? 'w-4 h-4' : 'w-5 h-5'} text-purple-400`} />
          </div>
          <div className="min-w-0">
            <h3 className={`font-bold text-white truncate ${isSidebar ? 'text-base leading-tight' : 'text-lg'}`}>Premium Access</h3>
            <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-widest uppercase">Elite Status</span>
          </div>
        </div>
        <p className={`${isSidebar ? 'text-xs' : 'text-sm'} text-purple-200/60 leading-relaxed font-medium line-clamp-2`}>
          Boost visibility 5x and see who vibes instantly.
        </p>
        <button className={`w-full bg-white text-purple-900 rounded-2xl font-bold transition-all active:scale-95 hover:bg-purple-50 ${isSidebar ? 'py-2 text-[10px]' : 'py-3 text-xs'}`}>
          {profile?.isPro ? 'VIP Active' : 'Upgrade to Pro'}
        </button>
      </div>
    </div>
  );

  const renderMatchesReceived = (layoutPrefix: string) => (
    <div className="w-full h-full flex flex-col bg-[#090a1e] rounded-[18px] p-[2px] bg-gradient-to-r from-[#9700FF] to-[#B95AFB]">
      <div className="bg-[#090a1e] rounded-[16px] overflow-hidden flex flex-col h-full">
        <div className="flex border-b border-white/5 shrink-0">
          <button 
            onClick={() => setRightTab('matches')}
            className={`flex-1 py-5 text-sm font-bold transition-all relative flex items-center justify-center gap-2 ${
              rightTab === 'matches' ? 'text-[#a855f7]' : 'text-gray-500 hover:text-white'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Matches</span>
            <span className="bg-white text-[#090a1e] px-1.5 py-0.5 rounded text-[10px] font-black">{matches.length}</span>
            {rightTab === 'matches' && (
              <motion.div layoutId={`${layoutPrefix}-tab`} className="absolute bottom-0 left-0 right-0 h-1 bg-[#a855f7]" />
            )}
          </button>
          <button 
            onClick={() => setRightTab('received')}
            className={`flex-1 py-5 text-sm font-bold transition-all relative flex items-center justify-center gap-2 ${
              rightTab === 'received' ? 'text-[#a855f7]' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>My likes</span>
            <span className="bg-white text-[#090a1e] px-1.5 py-0.5 rounded text-[10px] font-black">{received.length}</span>
            {rightTab === 'received' && (
              <motion.div layoutId={`${layoutPrefix}-tab`} className="absolute bottom-0 left-0 right-0 h-1 bg-[#a855f7]" />
            )}
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
          {sidebarLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#a855f7]/50 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {rightTab === 'matches' ? (
                matches.length > 0 ? (
                  matches.map((match) => (
                    <div key={match.uid} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-white/10">
                        <img 
                          src={match.media?.[0]?.url || `https://picsum.photos/seed/${match.uid}/100/100`} 
                          className="w-full h-full object-cover" 
                          alt="" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold text-white truncate">{match.firstName}</h4>
                        <p className="text-[10px] text-gray-400">Connected</p>
                      </div>
                      <button 
                        onClick={() => navigate(`/profile/${match.uid}`)}
                        className="bg-[#a855f7] hover:bg-[#b875ff] text-white text-[9px] font-bold px-3 py-2 rounded-lg transition-all active:scale-95"
                      >
                        View profile
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-500 text-xs">No matches yet</div>
                )
              ) : (
                received.length > 0 ? (
                  received.map((req) => (
                    <div key={req.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-white/10">
                        <img 
                          src={req.fromUser?.media?.[0]?.url || `https://picsum.photos/seed/${req.fromUserId}/100/100`} 
                          className="w-full h-full object-cover" 
                          alt="" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold text-white truncate">{req.fromUser?.firstName}</h4>
                        <p className="text-[10px] text-gray-400">Sent a Match request</p>
                      </div>
                      <button 
                        onClick={() => navigate(`/profile/${req.fromUserId}`)}
                        className="bg-[#a855f7] hover:bg-[#b875ff] text-white text-[9px] font-bold px-3 py-2 rounded-lg transition-all active:scale-95"
                      >
                        View profile
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-500 text-xs">No likes yet</div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout profile={profile}>
      <div className="flex flex-col xl:flex-row h-full overflow-hidden bg-[#090a1e]">
        
        {/* Main Content Area (Scrollable single column on mobile, center column on desktop) */}
        <main className="flex-1 h-full overflow-y-auto custom-scrollbar scroll-smooth relative">
          <div className="max-w-2xl mx-auto p-4 sm:p-6 flex flex-col items-center xl:justify-center min-h-full pb-24 xl:pb-6">
            
            {/* Mobile-only Top Elements (Status and Banner) */}
            <div className="w-full xl:hidden space-y-6 mb-6">
              {renderStatus()}
              
              {/* Featured event card (Mobile version) */}
              <div
                onClick={() => navigate('/events')}
                className="relative p-[2px] rounded-[18px] bg-gradient-to-r from-[#9700FF] to-[#B95AFB] cursor-pointer transition-all shadow-2xl overflow-hidden mx-auto max-w-[440px]"
                style={{ height: '180px' }}
              >
                <div className="bg-[#090a1e] rounded-[16px] overflow-hidden relative h-full w-full flex flex-col justify-center p-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#9700FF]/20 to-[#B95AFB]/10 pointer-events-none" />
                  
                  <div className="flex justify-between items-center gap-4 relative z-10 w-full h-full">
                    <div className="space-y-2 flex-1 pr-12">
                      <h3 className="font-bold text-white text-[18px] leading-[1.1] tracking-tight">Unlock the Future of Finance</h3>
                      <p className="text-[10px] text-white/60 leading-relaxed line-clamp-2">
                        Join top minds in crypto, blockchain, and Web3 for insight, innovation, and connections.
                      </p>
                      <button className="px-5 py-2 bg-gradient-to-r from-[#9700FF] to-[#B95AFB] text-white text-[10px] font-bold rounded-full transition-all active:scale-95 shadow-lg shadow-purple-500/20">
                        Register for event
                      </button>
                    </div>
                    
                    <div className="absolute -bottom-4 -right-6 w-[160px] h-[160px] flex items-center justify-center shrink-0 z-0 text-white">
                      <img 
                        src={giftIcon} 
                        className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(151,0,255,0.4)] rotate-12" 
                        alt="Gift" 
                      />
                    </div>
                  </div>

                  <div className="flex justify-center gap-1.5 mt-1 relative z-10">
                    <div className="w-8 h-1 bg-[#9700FF] rounded-full" />
                    <div className="w-1.5 h-1 bg-white/20 rounded-full" />
                    <div className="w-1.5 h-1 bg-white/20 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Discovery / Video Area */}
            <div className="w-full max-w-[440px] mx-auto">
              {loading ? (
                <div className="py-20 flex justify-center w-full"><Loader2 className="w-12 h-12 text-purple-500 animate-spin" /></div>
              ) : discoveryProfiles.length > 0 ? (
                <RelaxConnectMatchCard 
                  profile={discoveryProfiles[0]}
                  onLike={() => handleLike(discoveryProfiles[0].id || discoveryProfiles[0].uid)}
                  onPass={() => handlePass(discoveryProfiles[0].id || discoveryProfiles[0].uid)}
                />
              ) : (
                <div className="text-center space-y-4 py-12 animate-in fade-in zoom-in duration-500">
                  <div className="flex items-center justify-center mx-auto mb-6">
                    <img src={logo} alt="MatchChayn Logo" className="h-16 object-contain opacity-80" />
                  </div>
                  <h2 className="text-2xl font-bold">Discover Matches</h2>
                  <p className="text-sm font-bold text-gray-500">Find your perfect connection</p>
                </div>
              )}
            </div>

            {/* Mobile-only Bottom Elements (Removed per user request) */}
            
          </div>
        </main>

        {/* Right Sidebar (Desktop only) */}
        <aside className="hidden xl:flex w-[450px] border-l border-white/5 bg-[#090a1e]/50 backdrop-blur-xl flex-col relative overflow-hidden h-full z-20 shrink-0">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-10%] right-[-20%] w-[300px] h-[300px] bg-purple-900/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-indigo-900/10 rounded-full blur-[80px]" />
          </div>

          {/* Status Section Wrapper (Border removed per user request) */}
          <div className="p-5 pb-3 relative z-10 shrink-0">
            {renderStatus()}
          </div>
          
          {/* Featured event card (Refined: Entering bottom-right, reduced height) */}
          <div className="px-5 mb-4 relative z-10 shrink-0">
            <div
              onClick={() => navigate('/events')}
              className="relative p-[2px] rounded-[18px] bg-gradient-to-r from-[#9700FF] to-[#B95AFB] cursor-pointer transition-all shadow-2xl overflow-hidden"
              style={{ height: '180px' }}
            >
              <div className="bg-[#090a1e] rounded-[16px] overflow-hidden relative h-full w-full flex flex-col justify-center p-5">
                {/* Subtle Background Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#9700FF]/20 to-[#B95AFB]/10 pointer-events-none" />
                
                <div className="flex justify-between items-center gap-4 relative z-10 w-full h-full">
                  <div className="space-y-2 flex-1 pr-12">
                    <h3 className="font-bold text-white text-[18px] leading-[1.1] tracking-tight">Unlock the Future of Finance</h3>
                    <p className="text-[10px] text-white/60 leading-relaxed line-clamp-2">
                      Join top minds in crypto, blockchain, and Web3 for insight, innovation, and connections.
                    </p>
                    <button className="px-5 py-2 bg-gradient-to-r from-[#9700FF] to-[#B95AFB] text-white text-[10px] font-bold rounded-full transition-all active:scale-95 shadow-lg shadow-purple-500/20">
                      Register for event
                    </button>
                  </div>
                  
                  {/* Gift Icon Pushed More (Entering from Bottom Right) - Reduced Size */}
                  <div className="absolute -bottom-4 -right-6 w-[160px] h-[160px] flex items-center justify-center shrink-0 z-0 text-white">
                    <img 
                      src={giftIcon} 
                      className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(151,0,255,0.4)] rotate-12" 
                      alt="Gift" 
                    />
                  </div>
                </div>

                {/* Carousel Indicators (Aligned bottom-center like screenshot) */}
                <div className="flex justify-center gap-1.5 mt-2 relative z-10 pb-1">
                  <div className="w-8 h-1 bg-[#9700FF] rounded-full" />
                  <div className="w-1.5 h-1 bg-white/20 rounded-full" />
                  <div className="w-1.5 h-1 bg-white/20 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Matches Section Wrapper (Adjusted to fit like the image) */}
          <div className="flex-1 px-5 mb-6 relative z-10 min-h-0">
            {renderMatchesReceived('desktop')}
          </div>
        </aside>

      </div>
    </MainLayout>
  );
}
