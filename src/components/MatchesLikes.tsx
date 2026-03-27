import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Check, X, Loader2, User as UserIcon } from 'lucide-react';
import { fetchReceivedRequests, fetchMatches, respondToRequest, MatchRequest } from '../utils/likesService';
import { UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';
import MainLayout from './MainLayout';

interface MatchesLikesProps {
  profile: UserProfile | null;
}

export default function MatchesLikes({ profile }: MatchesLikesProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'received' | 'matches' | 'sent'>('received');
  const [received, setReceived] = useState<MatchRequest[]>([]);
  const [sent, setSent] = useState<MatchRequest[]>([]);
  const [matches, setMatches] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (tab === 'received') {
        const data = await fetchReceivedRequests();
        setReceived(data);
      } else if (tab === 'matches') {
        const data = await fetchMatches();
        setMatches(data);
      } else {
        const { fetchSentRequests } = await import('../utils/likesService');
        const data = await fetchSentRequests();
        setSent(data);
      }
      setLoading(false);
    };
    loadData();
  }, [tab]);

  const handleResponse = async (requestId: string, status: 'accepted' | 'rejected') => {
    await respondToRequest(requestId, status);
    setReceived(prev => prev.filter(r => r.id !== requestId));
    if (status === 'accepted') {
      setTab('matches');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    const { cancelMatchRequest } = await import('../utils/likesService');
    await cancelMatchRequest(requestId);
    setSent(prev => prev.filter(r => r.id !== requestId));
  };

  return (
    <MainLayout profile={profile}>
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h1 className="text-4xl font-bold tracking-tight">Signals & Connections</h1>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-fit">
            <button 
              onClick={() => setTab('received')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === 'received' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              Received
            </button>
            <button 
              onClick={() => setTab('sent')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === 'sent' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              Sent
            </button>
            <button 
              onClick={() => setTab('matches')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === 'matches' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              Matches
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          </div>
        ) : tab === 'received' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {received.length > 0 ? (
              received.map((req) => (
                <div key={req.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-6 group hover:border-purple-500/30 transition-all">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-purple-500/20 cursor-pointer" onClick={() => navigate(`/profile/${req.fromUserId}`)}>
                    <img 
                      src={req.fromUser?.media?.find(m => m.type === 'image')?.url || req.fromUser?.media?.[0]?.url || `https://picsum.photos/seed/${req.fromUserId}/200/200`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{req.fromUser?.firstName} {req.fromUser?.lastName}</h3>
                    <p className="text-sm text-gray-500 truncate">{req.fromUser?.city}, {req.fromUser?.country}</p>
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => handleResponse(req.id, 'accepted')}
                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> Accept
                      </button>
                      <button 
                        onClick={() => handleResponse(req.id, 'rejected')}
                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/10"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto opacity-20">
                  <Heart className="w-8 h-8" />
                </div>
                <p className="text-gray-500 font-medium">No pending signals received yet.</p>
              </div>
            )}
          </div>
        ) : tab === 'sent' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sent.length > 0 ? (
              sent.map((req) => (
                <div key={req.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-6 group hover:border-purple-500/30 transition-all">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-purple-500/20 cursor-pointer" onClick={() => navigate(`/profile/${req.toUserId}`)}>
                    <img 
                      src={req.toUser?.media?.find(m => m.type === 'image')?.url || req.toUser?.media?.[0]?.url || `https://picsum.photos/seed/${req.toUserId}/200/200`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{req.toUser?.firstName} {req.toUser?.lastName}</h3>
                    <p className="text-sm text-gray-500 truncate">{req.toUser?.city}, {req.toUser?.country}</p>
                    <button 
                      onClick={() => handleCancelRequest(req.id)}
                      className="mt-4 w-full py-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-500 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/10 hover:border-rose-500/30"
                    >
                      <X className="w-4 h-4" /> Withdraw
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto opacity-20">
                  <Heart className="w-8 h-8" />
                </div>
                <p className="text-gray-500 font-medium">You haven't sent any signals yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.length > 0 ? (
              matches.map((match) => (
                <div key={match.uid} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-6 group hover:border-purple-500/30 transition-all">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-purple-500/20 cursor-pointer" onClick={() => navigate(`/profile/${match.uid}`)}>
                    <img 
                      src={match.media?.find(m => m.type === 'image')?.url || match.media?.[0]?.url || `https://picsum.photos/seed/${match.uid}/200/200`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{match.firstName} {match.lastName}</h3>
                    <p className="text-sm text-gray-500 truncate">{match.city}, {match.country}</p>
                    <button 
                      onClick={() => navigate(`/messages/${match.uid}`)}
                      className="mt-4 w-full py-2 bg-white/5 hover:bg-purple-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/10 hover:border-purple-600"
                    >
                      <MessageCircle className="w-4 h-4" /> Message
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto opacity-20">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <p className="text-gray-500 font-medium">No matches yet. Keep exploring!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
