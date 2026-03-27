import React from 'react';
import { motion } from 'motion/react';
import { X, Info, MapPin } from 'lucide-react';
import logo from '../assets/matchlogo.png';

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
  const age = p.dateOfBirth ? new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear() : 25;
  const name = p.firstName ? `${p.firstName} ${p.lastName}` : p.name;
  const location = p.city ? `${p.city}, ${p.country}` : p.location;

  const videoMedia = p.media?.find((m: any) => m.type === 'video');
  const imageMedia = p.media?.find((m: any) => m.type === 'image') || p.media?.[0];
  const displayUrl = videoMedia?.url || imageMedia?.url || 'https://picsum.photos/seed/dating/800/1200';
  const isVideo = !!videoMedia;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative w-full max-w-lg aspect-[4/5] bg-[#090a1e] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group"
    >
      {isVideo ? (
        <video
          src={displayUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <img
          src={displayUrl}
          alt={name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

      <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-4 sm:pb-6 text-white">
        {/* Name/location wrapped in tight white pill */}
        <div className="flex items-end justify-between mb-5">
          <div className="bg-white rounded-2xl px-4 py-3 space-y-0.5 flex-1 mr-3">
            <h3 className="text-xl font-bold tracking-tight text-gray-900">
              {name}, {age}
            </h3>
            <div className="flex items-center gap-1.5 text-gray-500">
              <MapPin className="w-4 h-4 text-purple-500" />
              <span className="text-sm">{location}</span>
            </div>
          </div>
          <button className="p-2.5 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-2xl transition-colors">
            <Info className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex gap-4 sm:gap-6 justify-center">
          <button
            onClick={onPass}
            className="w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-all active:scale-95"
          >
            <X className="w-7 h-7 text-white" />
          </button>
          <button
            onClick={onLike}
            className="w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-all active:scale-95"
          >
            <img src={logo} alt="Match" className="w-8 h-8 object-contain" />
          </button>
        </div>
      </div>



    </motion.div>
  );
}
