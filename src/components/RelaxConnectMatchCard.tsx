import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, MapPin, Play, Pause, ChevronLeft, ChevronRight, Share2, Loader2, Volume2, VolumeX } from 'lucide-react';
import logo from '../assets/matchlogo.png';
import playIcon from '../assets/play.png';
import likeIcon from '../assets/like.png';

interface RelaxConnectMatchCardProps {
  profile: any;
  onLike: () => void;
  onPass: () => void;
}

export default function RelaxConnectMatchCard({ profile, onLike, onPass }: RelaxConnectMatchCardProps) {
  const defaultProfile = {
    name: 'Sarah',
    dob: '1995-06-15',
    location: 'New York, NY',
    media: [{ url: 'https://picsum.photos/seed/sarah/800/1200' }]
  };

  const p = profile || defaultProfile;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlTimeout = useRef<NodeJS.Timeout | null>(null);

  const resetControlTimeout = () => {
    setShowControls(true);
    if (controlTimeout.current) clearTimeout(controlTimeout.current);
    controlTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const [isBuffering, setIsBuffering] = useState(false);
  const bufferingTimeout = useRef<NodeJS.Timeout | null>(null);

  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  const onWaiting = () => {
    if (bufferingTimeout.current) clearTimeout(bufferingTimeout.current);
    bufferingTimeout.current = setTimeout(() => {
      setIsBuffering(true);
    }, 800);
  };

  const onPlaying = () => {
    if (bufferingTimeout.current) clearTimeout(bufferingTimeout.current);
    setIsBuffering(false);
  };
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Playback error:", error);
          setIsPlaying(false);
        });
      }
    } else {
      video.pause();
    }
  }, [isPlaying]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
    resetControlTimeout();
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/profile/${p.uid || p.id}`;
    const shareTitle = `Check out ${p.firstName || p.name}'s profile on MatchChayn!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        const { default: Swal } = await import('sweetalert2');
        Swal.fire({
          title: 'Link Copied!',
          text: 'Profile link copied to clipboard.',
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          background: '#1a1a2e',
          color: '#fff'
        });
      } catch (err) {
        console.error('Error copying to clipboard:', err);
      }
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 25;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const age = calculateAge(p.dateOfBirth);
  const name = p.firstName ? `${p.firstName} ${p.lastName}` : p.name;
  const location = p.city ? `${p.city}${p.country ? `, ${p.country}` : ''}` : p.location;
  const bio = p.bio || '';
  const interests = p.interests || [];

  const videoMedia = p.media?.find((m: any) => m.type === 'video');
  const imageMedia = p.media?.find((m: any) => m.type === 'image') || p.media?.[0];
  const videoUrl = videoMedia?.url || null;
  const imageUrl = imageMedia?.url || 'https://picsum.photos/seed/dating/800/1200';
  const displayUrl = videoUrl || imageUrl; // desktop uses this
  const isVideo = !!videoMedia;

  return (
    <div className="w-full h-full">
      {/* --- DESKTOP VIEW --- */}
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="hidden md:block relative bg-[#11112b] rounded-xl overflow-hidden shadow-2xl border border-white/10 mx-auto group"
        style={{ width: '440px', height: '540px' }}
      >
        {/* Image / Video Section */}
        <div className="relative w-full h-[380px] overflow-hidden">
          {isVideo ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                src={displayUrl}
                poster={imageUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                preload="auto"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onWaiting={onWaiting}
                onPlaying={onPlaying}
                onCanPlay={onPlaying}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                className="w-full h-full object-cover cursor-pointer bg-[#0d0d22]"
                onClick={togglePlay}
              />
              {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-15">
                  <Loader2 className="w-12 h-12 text-white animate-spin opacity-50" />
                </div>
              )}
              {/* Audio Toggle (Desktop) */}
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="absolute bottom-4 right-4 z-20 p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-all border border-white/10"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <img
              src={displayUrl}
              alt={name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Progress Bar */}
          {isVideo && (
            <div className={`absolute top-4 left-6 right-6 h-[2px] bg-white/20 rounded-full overflow-hidden z-20 transition-opacity duration-300 ${isHovered || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
              <div 
                className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-100"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
          )}

          {/* Subtle gradient at bottom of image */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#11112b]/60 via-transparent to-transparent pointer-events-none" />

          {/* Play icon for videos - Fades on hover */}
          {isVideo && (
            <motion.button 
              initial={{ opacity: 1 }}
              animate={{ opacity: (isHovered || !isPlaying) ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              onClick={togglePlay}
              className="absolute z-10 flex items-center justify-center bg-white/10 backdrop-blur-[19.2px] hover:bg-white/20 transition-all active:scale-95 shadow-xl"
              style={{ 
                width: '64px', 
                height: '64px', 
                top: '158px', 
                left: '188px', 
                borderRadius: '600px',
                border: '0.96px solid rgba(255, 255, 255, 0.5)'
              }}
            >
              <img 
                src={playIcon} 
                alt="Play" 
                className={`w-[32px] h-[32px] object-contain ml-1 transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-50'}`} 
              />
            </motion.button>
          )}

          {/* Action buttons overlaid on image - Fades on hover */}
          <motion.div 
            initial={{ opacity: 1 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-4 left-0 right-0 flex justify-center gap-6"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onPass(); }}
              className="bg-white flex items-center justify-center shadow-lg transition-all active:scale-95 hover:bg-gray-100"
              style={{ width: '48px', height: '48px', borderRadius: '66.04px' }}
            >
              <X className="w-5 h-5 text-[#a855f7]" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onLike(); }}
              className="bg-white flex items-center justify-center shadow-lg transition-all active:scale-95 hover:bg-gray-100"
              style={{ width: '48px', height: '48px', borderRadius: '66.04px' }}
            >
              <div className="w-7 h-7 flex items-center justify-center">
                <img src={likeIcon} alt="Like" className="w-full h-full object-contain" />
              </div>
            </button>
          </motion.div>
        </div>

        {/* Profile Info Section — below image */}
        <div className="pt-[10px] pr-[16px] pb-[10px] pl-[16px] space-y-[8px]" style={{ height: '160px' }}>
          <div className="flex items-center gap-[9.6px]">
            <h3 className="text-[20px] font-bold text-white tracking-tight">
              {name}, {age}
            </h3>
            {p.isPro && (
              <div className="w-[4.5] h-[4.5] bg-[#a855f7] rounded-full flex items-center justify-center p-1 shrink-0">
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
            )}
          </div>

          {location && (
            <div className="flex items-center gap-[9.6px] text-white/90">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">{location}</span>
            </div>
          )}

          {bio && (
            <p className="text-sm text-white font-medium line-clamp-1">{bio}</p>
          )}

          {interests.length > 0 && (
            <div className="flex flex-wrap gap-[10px]">
              {interests.slice(0, 5).map((interest: string, i: number) => (
                <span
                  key={i}
                  className="bg-white text-black shadow-sm flex items-center justify-center px-4 py-1 rounded-[5.6px] text-[10px] font-[700]"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* --- MOBILE VIEW --- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={resetControlTimeout}
        className="md:hidden relative w-full aspect-[3/4] max-h-[640px] bg-[#11112b] rounded-3xl overflow-hidden shadow-2xl mx-auto"
      >
        {/* Main Media Background — mobile shows video only */}
        {videoUrl ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src={videoUrl}
              poster={imageUrl}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              preload="auto"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onWaiting={onWaiting}
              onPlaying={onPlaying}
              onCanPlay={onPlaying}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              className="w-full h-full object-cover bg-[#0d0d22]"
              onClick={togglePlay}
            />
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-15">
                <Loader2 className="w-10 h-10 text-white animate-spin opacity-50" />
              </div>
            )}
            {/* Audio Toggle (Mobile) */}
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
              className="absolute bottom-24 right-4 z-40 p-3 bg-black/30 backdrop-blur-md rounded-full text-white active:scale-95 transition-all border border-white/10"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        ) : (
          // No video uploaded — show a dark placeholder so the card still renders
          <div className="w-full h-full bg-[#0d0d22] flex items-center justify-center">
            <span className="text-white/30 text-sm font-medium">No video available</span>
          </div>
        )}

        {/* Story Progress Bar Overlay */}
        <div className={`absolute top-4 left-4 right-4 h-1 flex gap-1 z-30 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 h-full bg-white/20 rounded-full overflow-hidden">
              {s === 1 && (
                <div 
                  className="h-full bg-white transition-all duration-100"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Floating Play Icon (Center) */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <motion.button 
              animate={{ opacity: (showControls || !isPlaying) ? 1 : 0, scale: (showControls || !isPlaying) ? 1 : 0.8 }}
              className="pointer-events-auto w-16 h-16 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30 shadow-2xl"
              onClick={togglePlay}
            >
              <img 
                src={playIcon} 
                alt="Play" 
                className={`w-8 h-8 object-contain ml-1 transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-30'}`} 
              />
            </motion.button>
          </div>
        )}

        {/* Navigation Arrows (Fading) */}
        <motion.div 
          animate={{ opacity: showControls ? 1 : 0 }}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 z-20 pointer-events-none"
        >
          <button onClick={() => {/* next maybe? */}} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 pointer-events-auto shadow-lg">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button onClick={() => {/* next maybe? */}} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 pointer-events-auto shadow-lg">
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </motion.div>

        {/* FLOATING ACTION BUTTONS (Floating in middle area like screenshot) */}
        <div className="absolute inset-x-0 bottom-[140px] flex justify-center gap-6 z-30">
          <button
            onClick={(e) => { e.stopPropagation(); onPass(); }}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6 text-[#a855f7]" strokeWidth={2.5} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onLike(); }}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl hover:bg-gray-100 transition-colors"
          >
            <img src={likeIcon} className="w-6 h-6 object-contain" alt="" />
          </button>
        </div>

        {/* Location (Top Right) */}
        <div className={`absolute top-10 right-4 z-30 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-black/30 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 border border-white/10">
            <MapPin className="w-3 h-3 text-white" />
            <span className="text-[10px] text-white font-bold">{p.city || 'Abuja'}, 4.5 km</span>
          </div>
        </div>

        {/* INFO OVERLAY (MOBILE ONLY) - Rounded card at the bottom */}
        <div className="absolute bottom-6 left-4 right-4 z-40">
          <div className="bg-white rounded-2xl p-4 shadow-2xl relative">
            {/* Share Button (Top Right of card) */}
            <button 
              onClick={handleShare}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full text-[#a855f7] active:scale-95 transition-all shadow-sm"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between gap-2 mb-1 pr-8">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[18px] font-bold text-black leading-none truncate">
                  {name}, {age}
                </span>
                <div className="w-4 h-4 bg-[#a855f7] rounded-full flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              {interests.slice(0, 2).map((int: any, idx: number) => (
                <span key={idx} className="bg-[#101820] text-white text-[9px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap">
                  {int}
                </span>
              ))}
            </div>

            <p className="text-[11px] text-black/60 font-medium leading-normal line-clamp-1 mt-2">
              {bio || 'Confident, open-minded and here for real vibes only.'}
            </p>
          </div>
        </div>

        {/* Bottom Shade */}
        <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/50 to-transparent pointer-events-none z-10" />
      </motion.div>
    </div>
  );
}
