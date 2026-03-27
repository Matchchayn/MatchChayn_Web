import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Loader2 } from 'lucide-react';
import { updateUserProfile } from '../../utils/userProfileService';
import { useAlert } from '../../hooks/useAlert';

interface InterestSelectionProps {
  user: any;
  onNext: () => void;
}

const INTERESTS = [
  'Music', 'Travel', 'Art', 'Food', 'Sports', 'Gaming', 'Reading', 'Movies',
  'Cooking', 'Photography', 'Dancing', 'Yoga', 'Hiking', 'Tech', 'Fashion',
  'Pets', 'Nature', 'Fitness', 'Politics', 'Business'
];

export default function InterestSelection({ user, onNext }: InterestSelectionProps) {
  const { showAlert } = useAlert();
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleInterest = (interest: string) => {
    if (selected.includes(interest)) {
      setSelected(selected.filter(i => i !== interest));
    } else if (selected.length < 5) {
      setSelected([...selected, interest]);
    } else {
      showAlert('You can select up to 5 interests', 'info');
    }
  };

  const handleContinue = async () => {
    if (selected.length < 3) {
      showAlert('Please select at least 3 interests', 'info');
      return;
    }

    setIsLoading(true);
    try {
      await updateUserProfile(user.uid, { interests: selected });
      onNext();
    } catch (error: any) {
      showAlert(error.message || 'Failed to save interests', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 justify-center">
        {INTERESTS.map((interest) => {
          const isSelected = selected.includes(interest);
          return (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`px-4 py-2 rounded-full border transition-all duration-300 flex items-center gap-2 group text-sm ${
                isSelected
                  ? 'bg-purple-500 border-purple-400 text-white font-bold'
                  : 'bg-white/5 border-white/5 text-gray-500 hover:border-purple-500/30 hover:bg-white/10 hover:text-gray-300'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              {interest}
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        <button
          onClick={handleContinue}
          disabled={isLoading || selected.length < 3}
          className="premium-button w-full h-12 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Continue'}
          {!isLoading && <span className="text-xs opacity-60">({selected.length}/5)</span>}
        </button>
      </div>
    </div>
  );
}
