import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { updateUserProfile } from '../utils/userProfileService';
import { uploadMedia } from '../utils/storageService';
import { useAlert } from '../hooks/useAlert';
import MainLayout from './MainLayout';
import { ArrowLeft, Save, Loader2, Camera, Video, Plus, X, Check } from 'lucide-react';

interface SettingsProps {
  profile: UserProfile | null;
}

interface MediaItem {
  file?: File | Blob;
  preview: string;
  url?: string;
  type: 'image' | 'video';
}

const INTERESTS = [
  'Music', 'Travel', 'Art', 'Food', 'Sports', 'Gaming', 'Reading', 'Movies',
  'Cooking', 'Photography', 'Dancing', 'Yoga', 'Hiking', 'Tech', 'Fashion',
  'Pets', 'Nature', 'Fitness', 'Politics', 'Business'
];

export default function Settings({ profile }: SettingsProps) {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [preferences, setPreferences] = useState({
    interestedIn: '',
    ageRange: [18, 35],
    maxDistance: 50,
  });

  useEffect(() => {
    if (profile) {
      setFormData(profile);
      if (profile.media) {
        setMediaItems(profile.media.map(m => ({
          preview: m.url,
          url: m.url,
          type: m.type
        })));
      }
      if (profile.interests) {
        setSelectedInterests(profile.interests);
      }
      if (profile.preferences) {
        setPreferences({
          interestedIn: profile.preferences.interestedIn || '',
          ageRange: profile.preferences.ageRange || [18, 35],
          maxDistance: profile.preferences.maxDistance || 50,
        });
      }
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else if (selectedInterests.length < 5) {
      setSelectedInterests([...selectedInterests, interest]);
    } else {
      showAlert('You can select up to 5 interests', 'info');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setMediaItems(prev => [...prev, { file, preview, type: 'image' }]);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setMediaItems(prev => [...prev, { file, preview, type: 'video' }]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaItems(prev => {
      const next = [...prev];
      if (next[index].file) {
        URL.revokeObjectURL(next[index].preview);
      }
      next.splice(index, 1);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    
    setLoading(true);
    try {
      // Upload new files
      const uploadPromises = mediaItems.map(async (item) => {
        if (item.file) {
          const url = await uploadMedia(profile.uid, item.file, item.type);
          return { type: item.type, url };
        }
        return { type: item.type, url: item.url! };
      });

      const media = await Promise.all(uploadPromises);
      
      await updateUserProfile(profile.uid, { 
        ...formData, 
        media,
        interests: selectedInterests,
        preferences
      });
      showAlert('Profile updated successfully!', 'success');
      navigate('/profile');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      showAlert(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <MainLayout profile={profile}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout profile={profile}>
      <div className="max-w-4xl mx-auto p-8 space-y-12">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Profile
            </button>
            <h1 className="text-4xl font-bold tracking-tight">Edit Profile</h1>
            <p className="text-gray-500 font-medium">Update your personal information and preferences.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 pb-20">
          {/* Basic Info */}
          <section className="bg-white/5 rounded-2xl p-8 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="w-6 h-1 bg-purple-500 rounded-full" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">First Name</label>
                <input 
                  type="text" 
                  name="firstName"
                  value={formData.firstName || ''}
                  onChange={handleChange}
                  className="w-full bg-[#050512] border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:border-purple-500 transition-all outline-none text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Last Name</label>
                <input 
                  type="text" 
                  name="lastName"
                  value={formData.lastName || ''}
                  onChange={handleChange}
                  className="w-full bg-[#050512] border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:border-purple-500 transition-all outline-none text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Username</label>
                <input 
                  type="text" 
                  name="username"
                  value={formData.username || ''}
                  onChange={handleChange}
                  className="w-full bg-[#050512] border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:border-purple-500 transition-all outline-none text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Date of Birth</label>
                <input 
                  type="date" 
                  name="dateOfBirth"
                  value={formData.dateOfBirth || ''}
                  onChange={handleChange}
                  className="w-full bg-[#050512] border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:border-purple-500 transition-all outline-none text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Gender</label>
                <select 
                  name="gender"
                  value={formData.gender || ''}
                  onChange={handleChange}
                  className="w-full bg-[#050512] border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:border-purple-500 transition-all outline-none text-white appearance-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Relationship Status</label>
                <select 
                  name="relationshipStatus"
                  value={formData.relationshipStatus || ''}
                  onChange={handleChange}
                  className="w-full bg-[#050512] border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:border-purple-500 transition-all outline-none text-white appearance-none"
                >
                  <option value="single">Single</option>
                  <option value="in_a_relationship">In a relationship</option>
                  <option value="married">Married</option>
                  <option value="it_is_complicated">It's complicated</option>
                  <option value="separated">Separated</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
            </div>
          </section>

          {/* Location & Bio */}
          <section className="bg-white/5 rounded-2xl p-8 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="w-6 h-1 bg-purple-500 rounded-full" />
              Location & Bio
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">City</label>
                <input 
                  type="text" 
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  className="w-full bg-[#050512] border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:border-purple-500 transition-all outline-none text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Country</label>
                <input 
                  type="text" 
                  name="country"
                  value={formData.country || ''}
                  onChange={handleChange}
                  className="w-full bg-[#050512] border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:border-purple-500 transition-all outline-none text-white"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Bio</label>
              <textarea 
                name="bio"
                value={formData.bio || ''}
                onChange={handleChange}
                rows={4}
                className="w-full bg-[#050512] border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:border-purple-500 transition-all outline-none text-white resize-none"
              />
            </div>
          </section>

          {/* Interests Section */}
          <section className="bg-white/5 rounded-2xl p-8 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="w-6 h-1 bg-purple-500 rounded-full" />
              Interests ({selectedInterests.length}/5)
            </h2>
            <div className="flex flex-wrap gap-3">
              {INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-full border text-sm transition-all ${
                      isSelected
                        ? 'bg-purple-500 border-purple-400 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Preferences Section */}
          <section className="bg-white/5 rounded-2xl p-8 space-y-8">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="w-6 h-1 bg-purple-500 rounded-full" />
              Dating Preferences
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-xs font-bold text-gray-500">Interested In</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Men', 'Women', 'Everyone'].map((option) => {
                    const isSelected = preferences.interestedIn === option.toLowerCase();
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPreferences({ ...preferences, interestedIn: option.toLowerCase() })}
                        className={`py-3 rounded-2xl font-bold transition-all border ${
                          isSelected
                            ? 'bg-purple-500 text-white border-purple-400'
                            : 'bg-[#050512] text-gray-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500">Age Range</label>
                    <span className="text-purple-400 font-bold">{preferences.ageRange[0]} - {preferences.ageRange[1]}</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="80"
                    value={preferences.ageRange[1]}
                    onChange={(e) => setPreferences({ ...preferences, ageRange: [18, parseInt(e.target.value)] })}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500">Max Distance</label>
                    <span className="text-purple-400 font-bold">{preferences.maxDistance} km</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="200"
                    value={preferences.maxDistance}
                    onChange={(e) => setPreferences({ ...preferences, maxDistance: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Media Section */}
          <section className="bg-white/5 rounded-2xl p-8 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="w-6 h-1 bg-purple-500 rounded-full" />
              Media (Photos & Video)
            </h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {mediaItems.map((item, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden group border border-white/10 bg-[#050512]">
                    {item.type === 'image' ? (
                      <img src={item.preview} alt={`Media ${index}`} className="w-full h-full object-cover" />
                    ) : (
                      <video src={item.preview} className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {item.type === 'video' && (
                      <div className="absolute bottom-2 left-2 p-1 bg-purple-500 rounded text-[10px] font-bold">Video</div>
                    )}
                  </div>
                ))}
                
                <label className="aspect-square bg-[#050512] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/50 transition-all group">
                  <Camera className="w-6 h-6 text-gray-500 group-hover:text-purple-500 transition-colors" />
                  <span className="text-[10px] font-bold text-gray-500 mt-2">Add Photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>

                <label className="aspect-square bg-[#050512] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/50 transition-all group">
                  <Video className="w-6 h-6 text-gray-500 group-hover:text-purple-500 transition-colors" />
                  <span className="text-[10px] font-bold text-gray-500 mt-2">Add Video</span>
                  <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                </label>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-4">
            <button 
              type="button"
              onClick={() => navigate('/profile')}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all font-bold"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-12 py-4 bg-purple-600 hover:bg-purple-700 rounded-2xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
