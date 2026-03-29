import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Calendar, MapPin, Heart, FileText, Loader2, ChevronDown, MapPinned } from 'lucide-react';
import { createUserProfile } from '../../utils/userProfileService';
import { useAlert } from '../../hooks/useAlert';

interface ProfileCreationProps {
  user: any;
  onNext: () => void;
}

export default function ProfileCreation({ user, onNext }: ProfileCreationProps) {
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
    username: '',
    dateOfBirth: '',
    gender: '',
    city: '',
    country: '',
    relationshipStatus: '',
    bio: '',
  });

  useEffect(() => {
    // Detect country based on IP
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_name) {
          setFormData(prev => ({ ...prev, country: data.country_name }));
        }
      } catch (error) {
        console.error('Error detecting country:', error);
      }
    };
    detectCountry();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createUserProfile({
        uid: user.uid,
        email: user.email,
        ...formData,
        interests: [],
        preferences: {},
        media: [],
      });
      onNext();
    } catch (error: any) {
      showAlert(error.message || 'Failed to save profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-1 sm:space-y-2">
        <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight leading-tight">Create a Profile</h2>
        <p className="text-gray-400 text-[10px] sm:text-xs">Complete your profile to find better matches</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:gap-y-3">
          {/* First Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-500 tracking-wide ml-1">First Name</label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="First name"
                className="w-full bg-white/5 border border-white/10 rounded-xl h-10 sm:h-12 px-4 text-white text-xs sm:text-sm placeholder:text-white/20 outline-none focus:border-purple-500 transition-all"
              />
            </div>
          </div>

          {/* Last Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-500 tracking-wide ml-1">Last Name</label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Last name"
                className="w-full bg-white/5 border border-white/10 rounded-xl h-10 sm:h-12 px-4 text-white text-xs sm:text-sm placeholder:text-white/20 outline-none focus:border-purple-500 transition-all"
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-500 tracking-wide ml-1">Username</label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Your username"
                className="w-full bg-white/5 border border-white/10 rounded-xl h-10 sm:h-12 px-4 text-white text-xs sm:text-sm placeholder:text-white/20 outline-none focus:border-purple-500 transition-all"
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 ml-1 mb-1">
              <label className="text-[11px] font-bold text-gray-500 tracking-wide">Date Of Birth</label>
              <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-500" />
            </div>
            <div className="relative">
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl h-10 sm:h-12 px-4 text-white text-xs sm:text-sm outline-none focus:border-purple-500 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Country */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 ml-1 mb-1">
              <label className="text-[11px] font-bold text-gray-500 tracking-wide">Country</label>
              <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-500" />
            </div>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Country"
                className="w-full bg-white/5 border border-white/10 rounded-xl h-10 sm:h-12 px-4 text-white text-xs sm:text-sm placeholder:text-white/20 outline-none focus:border-purple-500 transition-all"
              />
            </div>
          </div>

          {/* City */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-500 tracking-wide ml-1">City</label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="w-full bg-white/5 border border-white/10 rounded-xl h-10 sm:h-12 px-4 text-white text-xs sm:text-sm placeholder:text-white/20 outline-none focus:border-purple-500 transition-all"
              />
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-500 tracking-wide ml-1">Gender</label>
            <div className="relative">
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl h-10 sm:h-12 px-4 text-white text-xs sm:text-sm outline-none focus:border-purple-500 transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#0b0c26]">Select Gender</option>
                <option value="male" className="bg-[#0b0c26]">Male</option>
                <option value="female" className="bg-[#0b0c26]">Female</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          {/* Relationship Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-500 tracking-wide ml-1">Relationship Status</label>
            <div className="relative">
              <select
                required
                value={formData.relationshipStatus}
                onChange={(e) => setFormData({ ...formData, relationshipStatus: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl h-10 sm:h-12 px-4 text-white text-xs sm:text-sm outline-none focus:border-purple-500 transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#0b0c26]">Select Status</option>
                <option value="single" className="bg-[#0b0c26]">Single</option>
                <option value="separated" className="bg-[#0b0c26]">Separated</option>
                <option value="divorced" className="bg-[#0b0c26]">Divorced</option>
                <option value="widowed" className="bg-[#0b0c26]">Widowed</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-500 tracking-wide ml-1">Bio (optional)</label>
          <div className="relative">
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us a bit about yourself..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 text-white text-xs sm:text-sm placeholder:text-white/20 outline-none focus:border-purple-500 transition-all resize-none min-h-[60px] sm:min-h-[80px]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full text-white font-bold text-lg rounded-full h-12 sm:h-14 transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center disabled:opacity-50 mt-2"
          style={{ background: 'linear-gradient(90deg, #9700FF 0%, #B95AFB 65.87%)' }}
        >
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Continue'}
        </button>

        <div className="pt-2 text-center px-4 mb-2">
          <p className="text-[10px] sm:text-xs text-gray-400 font-medium">
            By continuing, you agree to matchchayn{' '}
            <a href="#" className="text-white underline font-bold">Terms of service</a>{' '}
            and <a href="#" className="text-white underline font-bold">Privacy Policy.</a>
          </p>
        </div>
      </form>
    </div>
  );
}
