import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Users, MapPin, Loader2, Check } from 'lucide-react';
import { updateUserProfile } from '../../utils/userProfileService';
import { useAlert } from '../../hooks/useAlert';

interface PreferenceSelectionProps {
  user: any;
  onNext: () => void;
}

export default function PreferenceSelection({ user, onNext }: PreferenceSelectionProps) {
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    interestedIn: '',
    ageRange: [18, 35],
    maxDistance: 50,
  });

  const handleContinue = async () => {
    if (!preferences.interestedIn) {
      showAlert('Please select who you are interested in', 'info');
      return;
    }

    setIsLoading(true);
    try {
      await updateUserProfile(user.uid, { preferences });
      onNext();
    } catch (error: any) {
      showAlert(error.message || 'Failed to save preferences', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="space-y-8">
        <div className="space-y-4 text-center lg:text-left">
          <label className="block text-xs font-bold text-gray-500 tracking-widest ml-1">Interested In</label>
          <div className="grid grid-cols-3 gap-3">
            {['Men', 'Women', 'Everyone'].map((option) => {
              const isSelected = preferences.interestedIn === option.toLowerCase();
              return (
                <button
                  key={option}
                  onClick={() => setPreferences({ ...preferences, interestedIn: option.toLowerCase() })}
                  className={`py-6 rounded-2xl font-bold transition-all duration-300 border flex flex-col items-center justify-center gap-2 ${
                    isSelected
                      ? 'bg-purple-500 text-white border-purple-400'
                      : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/10'
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 mb-1" />}
                  <span className="text-sm">{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <label className="text-xs font-bold text-gray-500 tracking-widest">Age Range</label>
            <span className="text-purple-500 font-bold">{preferences.ageRange[0]} - {preferences.ageRange[1]}</span>
          </div>
          <input
            type="range"
            min="18"
            max="80"
            value={preferences.ageRange[1]}
            onChange={(e) => setPreferences({ ...preferences, ageRange: [18, parseInt(e.target.value)] })}
            className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <label className="text-xs font-bold text-gray-500 tracking-widest">Distance (km)</label>
            <span className="text-purple-500 font-bold">{preferences.maxDistance} km</span>
          </div>
          <input
            type="range"
            min="1"
            max="200"
            value={preferences.maxDistance}
            onChange={(e) => setPreferences({ ...preferences, maxDistance: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={handleContinue}
          disabled={isLoading || !preferences.interestedIn}
          className="premium-button w-full h-12 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Continue'}
        </button>
      </div>
    </div>
  );
}
