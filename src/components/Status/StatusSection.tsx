import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Camera, Loader2, Play } from 'lucide-react';
import { Status, UserProfile } from '../../types';
import { subscribeToMyStatuses, fetchMatchesWithStatuses } from '../../utils/statusService';
import StatusUploadModal from './StatusUploadModal';
import StatusViewerModal from './StatusViewerModal';

interface StatusSectionProps {
  profile: UserProfile | null;
}

export default function StatusSection({ profile }: StatusSectionProps) {
  const [myStatuses, setMyStatuses] = useState<Status[]>([]);
  const [matchStatuses, setMatchStatuses] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewerData, setViewerData] = useState<{ statuses: Status[]; index: number } | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    const unsubscribeMy = subscribeToMyStatuses(profile.uid, (statuses) => {
      setMyStatuses(statuses);
    });

    const loadMatchStatuses = async () => {
      setIsLoading(true);
      try {
        const statuses = await fetchMatchesWithStatuses();
        setMatchStatuses(statuses);
      } catch (err) {
        console.error('Error loading match statuses:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMatchStatuses();

    return () => {
      unsubscribeMy();
    };
  }, [profile?.uid]);

  const groupedMatchStatuses = matchStatuses.reduce((acc, status) => {
    const userId = status.userId;
    if (!acc[userId]) acc[userId] = [];
    acc[userId].push(status);
    return acc;
  }, {} as Record<string, Status[]>);

  return (
    <div className="w-full flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
      {/* My Status */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div 
          onClick={() => myStatuses.length > 0 ? setViewerData({ statuses: myStatuses, index: 0 }) : setShowUploadModal(true)}
          className={`relative w-16 h-16 rounded-full p-0.5 cursor-pointer transition-transform hover:scale-105 ${myStatuses.length > 0 ? 'bg-gradient-to-tr from-purple-600 to-pink-500' : 'bg-white/10 border border-dashed border-white/20'}`}
        >
          <div className="w-full h-full rounded-full bg-[#050512] p-0.5">
            <div className="w-full h-full rounded-full overflow-hidden">
              {profile?.media?.some(m => m.type === 'video') && !profile?.media?.some(m => m.type === 'image') ? (
                <video 
                  src={profile.media.find(m => m.type === 'video')?.url}
                  autoPlay loop muted playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src={profile?.media?.find(m => m.type === 'image')?.url || profile?.media?.[0]?.url || "https://picsum.photos/seed/user/100/100"} 
                  alt="My Status" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowUploadModal(true);
            }}
            className="absolute bottom-0 right-0 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center border-2 border-[#050512] hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-3 h-3 text-white" />
          </button>
        </div>
        <span className="text-[10px] font-bold text-gray-400">My Status</span>
      </div>

      {/* Match Statuses */}
      {Object.entries(groupedMatchStatuses).map(([userId, statuses]) => (
        <div key={userId} className="flex flex-col items-center gap-2 flex-shrink-0">
          <div 
            onClick={() => setViewerData({ statuses, index: 0 })}
            className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-purple-600 to-pink-500 cursor-pointer transition-transform hover:scale-105"
          >
            <div className="w-full h-full rounded-full bg-[#050512] p-0.5">
              <div className="w-full h-full rounded-full overflow-hidden">
                {statuses[0].user?.media?.some((m: any) => m.type === 'video') && !statuses[0].user?.media?.some((m: any) => m.type === 'image') ? (
                  <video 
                    src={statuses[0].user.media.find((m: any) => m.type === 'video')?.url}
                    autoPlay loop muted playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={statuses[0].user?.media?.find((m: any) => m.type === 'image')?.url || statuses[0].user?.media?.[0]?.url || "https://picsum.photos/seed/user/100/100"} 
                    alt={statuses[0].user?.firstName} 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-gray-400 truncate w-16 text-center">
            {statuses[0].user?.firstName || 'User'}
          </span>
        </div>
      ))}

      {isLoading && matchStatuses.length === 0 && (
        <div className="flex items-center gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showUploadModal && profile && (
          <StatusUploadModal 
            userId={profile.uid} 
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              // Refresh match statuses if needed, though my status is handled by subscription
            }}
          />
        )}

        {viewerData && (
          <StatusViewerModal 
            statuses={viewerData.statuses}
            initialIndex={viewerData.index}
            onClose={() => setViewerData(null)}
            viewerProfile={profile}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
