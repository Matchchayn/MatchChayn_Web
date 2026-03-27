import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Clock, Eye } from 'lucide-react';
import { Status } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { recordStatusView } from '../../utils/statusService';
import { auth } from '../../firebase';

interface StatusViewerModalProps {
  statuses: Status[];
  initialIndex: number;
  onClose: () => void;
  viewerProfile?: any; // current user's own profile, used when viewing own status
}

export default function StatusViewerModal({ statuses, initialIndex, onClose, viewerProfile }: StatusViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentStatus = statuses[currentIndex];

  // Record view whenever status changes
  useEffect(() => {
    if (currentStatus?.id) {
      recordStatusView(currentStatus.id);
    }
  }, [currentStatus?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentIndex < statuses.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentIndex, statuses.length, onClose]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < statuses.length - 1) setCurrentIndex(currentIndex + 1);
    else onClose();
  };

  if (!currentStatus) return null;

  const isMyStatus = currentStatus.userId === auth.currentUser?.uid;
  const viewerCount = currentStatus.viewedBy?.length ?? 0;
  // For own statuses, user is undefined — fall back to viewerProfile
  const displayUser = currentStatus.user || viewerProfile;
  const pfpUrl = displayUser?.media?.find((m: any) => m.type === 'image')?.url
    || displayUser?.media?.[0]?.url
    || `https://picsum.photos/seed/${currentStatus.userId}/100/100`;
  const displayName = displayUser ? `${displayUser.firstName} ${displayUser.lastName}` : 'Me';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl">
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
            <img 
              src={pfpUrl}
              alt={currentStatus.user?.firstName} 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white tracking-tight">
              {displayName}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              {currentStatus.createdAt ? formatDistanceToNow(currentStatus.createdAt.toDate()) : 'Recently'} ago
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="relative w-full max-w-lg aspect-[9/16] max-h-[90vh] mx-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute top-0 left-0 right-0 p-2 flex gap-1 z-20">
          {statuses.map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: i === currentIndex ? '100%' : i < currentIndex ? '100%' : '0%' }}
                transition={{ duration: i === currentIndex ? 5 : 0, ease: 'linear' }}
                className="h-full bg-white"
              />
            </div>
          ))}
        </div>

        <img 
          src={currentStatus.imageUrl} 
          alt="Status" 
          className="w-full h-full object-cover"
        />

        {currentStatus.text && (
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-lg font-medium text-white leading-relaxed text-center">
              {currentStatus.text}
            </p>
          </div>
        )}

        {/* Viewer count — only shown to status owner */}
        {isMyStatus && (
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full">
            <Eye className="w-4 h-4 text-white/70" />
            <span className="text-xs text-white font-medium">{viewerCount} {viewerCount === 1 ? 'view' : 'views'}</span>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-between px-4">
          <button 
            onClick={handlePrev}
            className={`p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all ${currentIndex === 0 ? 'opacity-0 cursor-default' : 'opacity-100'}`}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button 
            onClick={handleNext}
            className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      </div>
    </div>
  );
}
