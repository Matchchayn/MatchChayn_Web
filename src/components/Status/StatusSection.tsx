import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    <div className="w-full h-full flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
      {/* Create Status Button (Refined to match screenshot) */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div 
          onClick={() => setShowUploadModal(true)}
          className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-[#9d5ce9] to-[#8b46e5] cursor-pointer transition-transform hover:scale-105 group relative"
        >
          <div className="w-full h-full rounded-full bg-[#090a1e] flex items-center justify-center">
            <div className="w-[52px] h-[52px] rounded-full bg-[#a855f7] flex items-center justify-center transition-all group-hover:bg-[#b875ff]">
              <Plus className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
          </div>
        </div>
        <span className="text-[11px] font-medium text-white tracking-wide">Create</span>
      </div>

      {/* My Status */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div 
          onClick={() => myStatuses.length > 0 ? setViewerData({ statuses: myStatuses, index: 0 }) : setShowUploadModal(true)}
          className={`relative w-16 h-16 rounded-full p-0.5 cursor-pointer transition-transform hover:scale-105 ${myStatuses.length > 0 ? 'bg-[#a855f7]' : 'bg-white/10 border-2 border-dashed border-white/20'}`}
        >
          <div className="w-full h-full rounded-full bg-[#090a1e] p-0.5">
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
        </div>
        <span className="text-[11px] font-medium text-white tracking-wide">My Status</span>
      </div>

      {/* Match Statuses */}
      {Object.entries(groupedMatchStatuses).map(([userId, statuses]) => (
        <div key={userId} className="flex flex-col items-center gap-2 flex-shrink-0">
          <div 
            onClick={() => setViewerData({ statuses, index: 0 })}
            className="w-16 h-16 rounded-full p-0.5 bg-[#a855f7] cursor-pointer transition-transform hover:scale-105"
          >
            <div className="w-full h-full rounded-full bg-[#090a1e] p-0.5">
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
          <span className="text-[11px] font-medium text-white tracking-wide truncate w-16 text-center">
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


      {showUploadModal && profile && createPortal(
        <AnimatePresence>
          <StatusUploadModal 
            userId={profile.uid} 
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {}}
          />
        </AnimatePresence>,
        document.body
      )}

      {viewerData && createPortal(
        <AnimatePresence>
          <StatusViewerModal 
            statuses={viewerData.statuses}
            initialIndex={viewerData.index}
            onClose={() => setViewerData(null)}
            viewerProfile={profile}
          />
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
