import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Check, X, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchReceivedRequests, fetchMatches, respondToRequest, MatchRequest } from '../utils/likesService';
import { UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';
import MainLayout from './MainLayout';

interface MatchesLikesProps {
  profile: UserProfile | null;
}

export default function MatchesLikes({ profile }: MatchesLikesProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'received' | 'matches' | 'sent'>('matches');
  const [received, setReceived] = useState<MatchRequest[]>([]);
  const [sent, setSent] = useState<MatchRequest[]>([]);
  const [matches, setMatches] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to calculate age from DOB string
  const calculateAge = (dob: string) => {
    if (!dob) return 25;
    const birthDate = new Date(dob);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    const m = new Date().getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && new Date().getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch everything so counts are accurate
        const [receivedData, matchesData] = await Promise.all([
          fetchReceivedRequests(),
          fetchMatches()
        ]);
        
        const { fetchSentRequests } = await import('../utils/likesService');
        const sentData = await fetchSentRequests();

        setReceived(receivedData);
        setMatches(matchesData);
        setSent(sentData);
      } catch (error) {
        console.error('Error loading likes data:', error);
      }
      setLoading(false);
    };
    loadData();
  }, []); // Only load once on mount

  const handleResponse = async (requestId: string, status: 'accepted' | 'rejected') => {
    await respondToRequest(requestId, status);
    setReceived(prev => prev.filter(r => r.id !== requestId));
    if (status === 'accepted') {
      const updatedMatches = await fetchMatches();
      setMatches(updatedMatches);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    const { cancelMatchRequest } = await import('../utils/likesService');
    await cancelMatchRequest(requestId);
    setSent(prev => prev.filter(r => r.id !== requestId));
  };

  const renderProfileCard = (p: UserProfile, type: 'match' | 'sent' | 'received', requestId?: string) => {
    const age = calculateAge(p.dateOfBirth);
    const name = `${p.firstName}, ${age}`;
    const bio = p.bio || 'Confident, open-minded and here for real vibes only.';
    const displayUrl = p.media?.find(m => m.type === 'image')?.url || p.media?.[0]?.url || `https://picsum.photos/seed/${p.uid}/400/600`;

    return (
      <div 
        key={p.uid || requestId} 
        className="relative aspect-[3/4] rounded-[12px] lg:rounded-[24px] overflow-hidden group cursor-pointer shadow-lg bg-[#11112b] border border-white/5"
        onClick={() => navigate(`/profile/${p.uid}`)}
      >
        {/* Main Background Image */}
        <img 
          src={displayUrl} 
          alt={p.firstName} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Info Overlay at Bottom */}
        <div className="absolute bottom-2 left-2 right-2 lg:bottom-4 lg:left-4 lg:right-4 z-20">
          <div className="bg-white rounded-[10px] lg:rounded-[20px] p-2 lg:p-4 shadow-xl">
            <div className="flex items-center justify-between gap-1 lg:gap-2 mb-0.5 lg:mb-1">
              <div className="flex items-center gap-1.5 lg:gap-2 overflow-hidden">
                <span className="text-[10px] md:text-[12px] lg:text-[16px] font-bold text-black leading-none truncate">
                  {name}
                </span>
                {p.isPro && (
                  <div className="w-3 h-3 lg:w-4 lg:h-4 bg-[#a855f7] rounded-full flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-1.5 h-1.5 lg:w-2.5 lg:h-2.5 fill-white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                )}
              </div>
              
              <div className="flex gap-0.5 lg:gap-1 shrink-0">
                {p.interests?.slice(0, 2).map((int: string, idx: number) => (
                  <span key={idx} className="bg-[#333333] text-white text-[6.5px] md:text-[8px] lg:text-[9px] font-medium px-1 py-0.5 lg:px-2 lg:py-1 rounded-[4px] lg:rounded-md whitespace-nowrap">
                    {int}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[8px] md:text-[9px] lg:text-[11px] text-black/70 font-medium leading-tight line-clamp-1">
              {bio}
            </p>
          </div>
        </div>

        {/* Action Buttons (Fades in on hover) */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 lg:gap-4">
          {type === 'match' ? (
            <button 
              onClick={(e) => { e.stopPropagation(); navigate(`/messages/${p.uid}`); }}
              className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100"
            >
              <MessageCircle className="w-5 h-5 lg:w-6 lg:h-6 text-[#a855f7]" />
            </button>
          ) : type === 'sent' && requestId ? (
            <button 
              onClick={(e) => { e.stopPropagation(); handleCancelRequest(requestId); }}
              className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-500 hover:text-white group/btn"
            >
              <X className="w-5 h-5 lg:w-6 lg:h-6 text-rose-500 group-hover/btn:text-white" />
            </button>
          ) : type === 'received' && requestId ? (
            <div className="flex gap-2 lg:gap-4">
              <button 
                onClick={(e) => { e.stopPropagation(); handleResponse(requestId, 'accepted'); }}
                className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700"
              >
                <Check className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleResponse(requestId, 'rejected'); }}
                className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-full flex items-center justify-center shadow-lg hover:bg-white/30"
              >
                <X className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Bottom Shade */}
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />
      </div>
    );
  };

  return (
    <MainLayout profile={profile}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 lg:py-12 space-y-6 lg:space-y-12">
        <div className="flex flex-col gap-4 lg:gap-8">
          {/* Mobile Tabs */}
          <div className="lg:hidden p-1 bg-[#a855f7] rounded-[16px] flex items-center w-full shadow-lg border border-[#c084fc]/50">
             <button
               onClick={() => setTab('received')}
               className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-[12px] text-sm font-bold transition-all ${
                 tab === 'received' ? 'bg-white text-[#a855f7] shadow-sm' : 'text-white hover:bg-white/10'
               }`}
             >
               <Heart className={`w-4 h-4 ${tab === 'received' ? 'text-[#a855f7] fill-[#a855f7]' : 'text-white fill-white'}`} />
               Liked me
               <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                 tab === 'received' ? 'bg-[#a855f7] text-white' : 'bg-white text-[#a855f7]'
               }`}>
                 {received.length}
               </span>
             </button>
             <button
               onClick={() => setTab('sent')}
               className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-[12px] text-sm font-bold transition-all ${
                 tab === 'sent' ? 'bg-white text-[#a855f7] shadow-sm' : 'text-white hover:bg-white/10'
               }`}
             >
               <Heart className={`w-4 h-4 ${tab === 'sent' ? 'text-[#a855f7] fill-[#a855f7]' : 'text-white fill-white'}`} />
               My likes
               <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                 tab === 'sent' ? 'bg-[#a855f7] text-white' : 'bg-white text-[#a855f7]'
               }`}>
                 {sent.length}
               </span>
             </button>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden lg:flex items-center gap-8 border-b border-white/5">
            <button 
              onClick={() => setTab('matches')}
              className={`pb-4 px-2 text-base lg:text-lg font-bold transition-all relative flex items-center gap-3 ${
                tab === 'matches' ? 'text-purple-500' : 'text-gray-500 hover:text-white'
              }`}
            >
              <MessageCircle className={`w-5 h-5 ${tab === 'matches' ? 'text-purple-500' : 'text-gray-500'}`} />
              Matches
              <span className="bg-white text-black px-2 py-0.5 rounded-md text-[12px] font-bold min-w-[24px] text-center">
                {matches.length}
              </span>
              {tab === 'matches' && (
                <motion.div 
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 rounded-t-full"
                />
              )}
            </button>
            <button 
              onClick={() => setTab('received')}
              className={`pb-4 px-2 text-base lg:text-lg font-bold transition-all relative flex items-center gap-3 ${
                tab === 'received' ? 'text-purple-500' : 'text-gray-500 hover:text-white'
              }`}
            >
              <Heart className={`w-5 h-5 ${tab === 'received' ? 'text-purple-500' : 'text-gray-500'}`} />
              Liked me
              <span className="bg-white text-black px-2 py-0.5 rounded-md text-[12px] font-bold min-w-[24px] text-center">
                {received.length}
              </span>
              {tab === 'received' && (
                <motion.div 
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 rounded-t-full"
                />
              )}
            </button>
            <button 
              onClick={() => setTab('sent')}
              className={`pb-4 px-2 text-base lg:text-lg font-bold transition-all relative flex items-center gap-3 ${
                tab === 'sent' ? 'text-purple-500' : 'text-gray-500 hover:text-white'
              }`}
            >
              <Heart className={`w-5 h-5 ${tab === 'sent' ? 'text-purple-500' : 'text-gray-500'}`} />
              My likes
              <span className="bg-white text-black px-2 py-0.5 rounded-md text-[12px] font-bold min-w-[24px] text-center">
                {sent.length}
              </span>
              {tab === 'sent' && (
                <motion.div 
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 rounded-t-full"
                />
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-8">
            {tab === 'matches' ? (
              matches.length > 0 ? (
                matches.map(m => renderProfileCard(m, 'match'))
              ) : (
                <div className="col-span-full py-20 text-center text-gray-500">No matches yet.</div>
              )
            ) : tab === 'received' ? (
              received.length > 0 ? (
                received.map(req => req.fromUser && renderProfileCard(req.fromUser, 'received', req.id))
              ) : (
                <div className="col-span-full py-20 text-center text-gray-500">No one has liked you yet.</div>
              )
            ) : tab === 'sent' ? (
              sent.length > 0 ? (
                sent.map(req => req.toUser && renderProfileCard(req.toUser, 'sent', req.id))
              ) : (
                <div className="col-span-full py-20 text-center text-gray-500">You haven't liked anyone yet.</div>
              )
            ) : null}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
