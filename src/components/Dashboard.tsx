import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MessageCircle, 
  Check, 
  X,
  Loader2,
  ChevronRight
} from 'lucide-react';
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
    <>
      <div className="flex border-b border-white/5 shrink-0">
        <button 
          onClick={() => setRightTab('matches')}
          className={`flex-1 py-5 text-sm font-bold transition-all relative ${
            rightTab === 'matches' ? 'text-purple-500' : 'text-gray-500 hover:text-white'
          }`}
        >
          Matches
          {rightTab === 'matches' && (
            <motion.div layoutId={`${layoutPrefix}-tab`} className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
          )}
        </button>
        <button 
          onClick={() => setRightTab('received')}
          className={`flex-1 py-5 text-sm font-bold transition-all relative ${
            rightTab === 'received' ? 'text-purple-500' : 'text-gray-500 hover:text-white'
          }`}
        >
          Received
          {received.length > 0 && (
            <span className="absolute top-4 right-1/3 w-2 h-2 bg-purple-500 rounded-full" />
          )}
          {rightTab === 'received' && (
            <motion.div layoutId={`${layoutPrefix}-tab`} className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
          )}
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {sidebarLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-500/50 animate-spin" />
          </div>
        ) : rightTab === 'matches' ? (
          matches.length > 0 ? (
            <div className={`grid gap-3 ${layoutPrefix === 'mobile' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {matches.map((match) => (
                <div 
                  key={match.uid}
                  onClick={() => navigate(`/messages/${match.uid}`)}
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/0 hover:border-purple-500/20 hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                    <img 
                      src={match.media?.[0]?.url || `https://picsum.photos/seed/${match.uid}/100/100`} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{match.firstName}</h4>
                    <p className="text-[10px] text-gray-500">Ready to chat</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-30 space-y-4">
              <Heart className="w-10 h-10" />
              <p className="text-sm font-bold">No matches yet</p>
            </div>
          )
        ) : (
          received.length > 0 ? (
            <div className="space-y-3">
              {received.map((req) => (
                <div 
                  key={req.id}
                  className="group p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-purple-500/20 transition-all"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div 
                      className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shrink-0 cursor-pointer"
                      onClick={() => navigate(`/profile/${req.fromUserId}`)}
                    >
                      <img 
                        src={req.fromUser?.media?.[0]?.url || `https://picsum.photos/seed/${req.fromUserId}/100/100`} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-white truncate">{req.fromUser?.firstName}</h4>
                      <p className="text-xs text-gray-500 truncate">{req.fromUser?.city}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleSidebarResponse(req.id, 'accepted')}
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Connect
                    </button>
                    <button 
                      onClick={() => handleSidebarResponse(req.id, 'rejected')}
                      className="w-12 h-12 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-2xl transition-all flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-30 space-y-4">
              <Heart className="w-10 h-10" />
              <p className="text-sm font-bold">No received requests</p>
            </div>
          )
        )}
      </div>
    </>
  );

  return (
    <MainLayout profile={profile}>
      <div className="flex flex-col xl:flex-row h-full overflow-hidden bg-[#090a1e]">
        
        {/* Main Content Area (Scrollable single column on mobile, center column on desktop) */}
        <main className="flex-1 h-full overflow-y-auto custom-scrollbar scroll-smooth relative">
          <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8 flex flex-col items-center xl:justify-center min-h-full pb-24 xl:pb-8">
            
            {/* Mobile-only Status */}
            <div className="w-full xl:hidden">
              {renderStatus()}
            </div>

            {/* Main Discovery / Video Area */}
            <div className="w-full max-w-[400px] xl:max-w-[440px] mx-auto flex flex-col items-center justify-center shrink-0">
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

            {/* Mobile-only Bottom Elements */}
            <div className="w-full xl:hidden space-y-8">
              <div className="w-full max-w-lg mx-auto">
                {renderPremiumCard()}
              </div>
              <div className="w-full max-w-lg mx-auto bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden flex flex-col">
                {renderMatchesReceived('mobile')}
              </div>
            </div>
            
          </div>
        </main>

        {/* Right Sidebar (Desktop only) */}
        <aside className="hidden xl:flex w-96 border-l border-white/5 bg-[#090a1e]/50 backdrop-blur-xl flex-col relative overflow-hidden h-full z-20 shrink-0">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-10%] right-[-20%] w-[300px] h-[300px] bg-purple-900/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-indigo-900/10 rounded-full blur-[80px]" />
          </div>

          <div className="p-6 pb-2 relative z-10 shrink-0">
            {renderStatus()}
          </div>
          
          <div className="px-5 mb-4 relative z-10 shrink-0">
            {renderPremiumCard(true)}
          </div>

          <div className="flex-1 flex flex-col min-h-0 relative z-10">
            {renderMatchesReceived('desktop')}
          </div>
        </aside>

      </div>
    </MainLayout>
  );
}
