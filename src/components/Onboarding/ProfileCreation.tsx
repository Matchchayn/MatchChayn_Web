import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Calendar, MapPin, Heart, FileText, Loader2 } from 'lucide-react';
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="First Name"
              className="premium-input with-icon w-full h-12"
            />
          </div>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Last Name"
              className="premium-input with-icon w-full h-12"
            />
          </div>
        </div>

        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="text"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="Username"
            className="premium-input with-icon w-full h-12"
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="date"
            required
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            className="premium-input with-icon w-full h-12 text-gray-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <select
              required
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="premium-input w-full px-4 h-12 text-gray-300 appearance-none bg-black/20"
            >
              <option value="" className="bg-[#090a1e]">Gender</option>
              <option value="male" className="bg-[#090a1e]">Male</option>
              <option value="female" className="bg-[#090a1e]">Female</option>
              <option value="non-binary" className="bg-[#090a1e]">Non-binary</option>
              <option value="other" className="bg-[#090a1e]">Other</option>
            </select>
          </div>

          <div className="relative">
            <select
              required
              value={formData.relationshipStatus}
              onChange={(e) => setFormData({ ...formData, relationshipStatus: e.target.value })}
              className="premium-input w-full px-4 h-12 text-gray-300 appearance-none bg-black/20"
            >
              <option value="" className="bg-[#090a1e]">Status</option>
              <option value="single" className="bg-[#090a1e]">Single</option>
              <option value="separated" className="bg-[#090a1e]">Separated</option>
              <option value="divorced" className="bg-[#090a1e]">Divorced</option>
              <option value="widowed" className="bg-[#090a1e]">Widowed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="City"
              className="premium-input with-icon w-full h-12"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              required
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="Country"
              className="premium-input with-icon w-full h-12"
            />
          </div>
        </div>

        <div className="relative">
          <FileText className="absolute left-4 top-4 text-gray-500 w-5 h-5" />
          <textarea
            required
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell us about yourself..."
            rows={4}
            className="premium-input with-icon w-full py-4 resize-none min-h-[120px]"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="premium-button w-full h-12 flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Continue'}
      </button>
    </form>
  );
}
