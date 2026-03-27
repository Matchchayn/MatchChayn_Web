import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchUserProfile, getCachedProfile, getUserProfile } from '../utils/userProfileService';
import { UserProfile } from '../types';
import { ArrowLeft, Edit3, MapPin, Mail, Calendar, User as UserIcon, Heart, Play, Share2, Loader2 } from 'lucide-react';
import MainLayout from './MainLayout';

interface ProfileProps {
  profile: UserProfile | null;
}

export default function Profile({ profile }: ProfileProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (!id) {
      try {
        return getCachedProfile();
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        if (id) {
          const data = await getUserProfile(id);
          setUser(data);
        } else {
          const data = await fetchUserProfile(true);
          if (data) setUser(data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [id]);

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return 'N/A';
    const date = dateStr.toDate ? dateStr.toDate() : new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  if (loading && !user) {
    return (
      <MainLayout profile={profile}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout profile={profile}>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Profile not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout profile={profile}>
      <div className="max-w-6xl mx-auto p-8 space-y-12">
        {/* Hero Section */}
        <section className="relative h-[500px] rounded-2xl overflow-hidden group">
          <img 
            src={user.media?.[0]?.url || "https://picsum.photos/seed/profile/1200/600"} 
            alt="Cover" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050512] via-transparent to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-12 flex items-end justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h1 className="text-6xl font-bold tracking-tight">
                  {user.firstName} {user.lastName}
                </h1>
                <span className="bg-purple-500/20 text-purple-400 px-4 py-1.5 rounded-full text-sm font-bold border border-purple-500/30 backdrop-blur-md">
                  {user.gender}
                </span>
              </div>
              <div className="flex items-center gap-6 text-gray-400 font-medium">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-500" />
                  {user.city}, {user.country}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  {user.dateOfBirth ? formatDate(user.dateOfBirth) : 'N/A'}
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-purple-500" />
                  {user.relationshipStatus?.replace('_', ' ')}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              {!id && (
                <button 
                  onClick={() => navigate('/settings')}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 transition-all font-bold flex items-center gap-2"
                >
                  <Edit3 className="w-5 h-5" /> Edit Profile
                </button>
              )}
              <button className="p-4 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 transition-all group">
                <Share2 className="w-6 h-6 group-hover:text-purple-500" />
              </button>
              {id && (
                <button className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-2xl font-semibold transition-all flex items-center gap-2">
                  Send Signal <Heart className="w-5 h-5 fill-white" />
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Bio & Interests */}
          <div className="lg:col-span-2 space-y-12">
            <section className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="w-8 h-1 bg-purple-500 rounded-full" />
                About
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed font-medium">
                {user.bio || "No bio provided yet."}
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="w-8 h-1 bg-purple-500 rounded-full" />
                Interests
              </h2>
              <div className="flex flex-wrap gap-3">
                {user.interests?.map((interest) => (
                  <span 
                    key={interest}
                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-gray-300 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-default"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </section>

            {/* Media Gallery */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="w-8 h-1 bg-purple-500 rounded-full" />
                Gallery
              </h2>
              <div className="grid grid-cols-2 gap-6">
                {user.media?.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`relative rounded-2xl overflow-hidden group cursor-pointer ${
                      idx === 0 ? 'col-span-2 aspect-video' : 'aspect-square'
                    }`}
                  >
                    {m.type === 'video' ? (
                      <video 
                        src={m.url} 
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : (
                      <img 
                        src={m.url} 
                        alt={`Gallery ${idx}`} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    )}
                    <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/10 transition-colors" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Stats & Info */}
          <div className="space-y-8">
            <div className="bg-white/5 rounded-2xl p-8 space-y-8 sticky top-28">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#050512] p-4 rounded-2xl border border-white/5">
                    <div className="text-2xl font-bold text-purple-500">124</div>
                    <div className="text-[10px] font-bold text-gray-500">Signals</div>
                  </div>
                  <div className="bg-[#050512] p-4 rounded-2xl border border-white/5">
                    <div className="text-2xl font-bold text-purple-500">89%</div>
                    <div className="text-[10px] font-bold text-gray-500">Match Rate</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500">Details</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 font-medium">Gender</span>
                    <span className="font-bold">{user.gender}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 font-medium">Status</span>
                    <span className="font-bold">{user.relationshipStatus?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 font-medium">Location</span>
                    <span className="font-bold">{user.city}</span>
                  </div>
                </div>
              </div>

              {!id ? (
                <button className="w-full py-5 bg-white text-black rounded-2xl font-bold tracking-tight hover:bg-purple-500 hover:text-white transition-all">
                  Share Profile
                </button>
              ) : (
                <button className="w-full py-5 bg-white text-black rounded-2xl font-bold uppercase tracking-wider hover:bg-purple-500 hover:text-white transition-all">
                  Report Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
