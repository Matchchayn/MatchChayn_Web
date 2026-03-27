import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, MapPin, Play, ChevronLeft, ChevronRight } from 'lucide-react';
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

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
      resetControlTimeout();
    }
  };

  const age = p.dateOfBirth ? new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear() : 25;
  const name = p.firstName ? `${p.firstName} ${p.lastName}` : p.name;
  const location = p.city ? `${p.city}${p.country ? `, ${p.country}` : ''}` : p.location;
  const bio = p.bio || '';
  const interests = p.interests || [];

  const videoMedia = p.media?.find((m: any) => m.type === 'video');
  const imageMedia = p.media?.find((m: any) => m.type === 'image') || p.media?.[0];
  const displayUrl = videoMedia?.url || imageMedia?.url || 'https://picsum.photos/seed/dating/800/1200';
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
            <video
              ref={videoRef}
              src={displayUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover cursor-pointer"
              onClick={togglePlay}
            />
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
              <motion.div 
                className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                initial={{ width: '0%' }}
                animate={isPlaying ? { width: '100%' } : { width: '30%' }}
                transition={isPlaying ? { duration: 15, repeat: Infinity, ease: "linear" } : { duration: 0 }}
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
              <img src={isPlaying ? playIcon : playIcon} alt="Play" className={`w-[32px] h-[32px] object-contain ml-1 transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-50'}`} />
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
        {/* Main Media Background */}
        {isVideo ? (
          <video
            ref={videoRef}
            src={displayUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            onClick={togglePlay}
          />
        ) : (
          <img
            src={displayUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        )}

        {/* Story Progress Bar Overlay */}
        <div className={`absolute top-4 left-4 right-4 h-1 flex gap-1 z-30 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 h-full bg-white/20 rounded-full overflow-hidden">
              {s === 1 && (
                <motion.div 
                  className="h-full bg-white"
                  initial={{ width: '0%' }}
                  animate={isPlaying ? { width: '100%' } : { width: '30%' }}
                  transition={isPlaying ? { duration: 15, repeat: Infinity, ease: "linear" } : { duration: 0 }}
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
          <div className="bg-white rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-bold text-black leading-none">
                  {name}, {age}
                </span>
                <div className="w-4 h-4 bg-[#a855f7] rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </div>
              </div>
              
              <div className="flex gap-2">
                {interests.slice(0, 2).map((int: any, idx: number) => (
                  <span key={idx} className="bg-[#101820] text-white text-[9px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap">
                    {int}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-black/60 font-medium leading-normal line-clamp-1">
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
