import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Video, Plus, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { updateUserProfile } from '../../utils/userProfileService';
import { uploadMedia } from '../../utils/storageService';
import { useAlert } from '../../hooks/useAlert';
import { apiFetch } from '../../utils/apiFetch';

interface MediaUploadProps {
  user: any;
  onComplete: () => void;
}

interface MediaItem {
  file: File | Blob;
  preview: string;
}

export default function MediaUpload({ user, onComplete }: MediaUploadProps) {
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [video, setVideo] = useState<MediaItem | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (photos.length >= 6) {
        showAlert('You can upload up to 6 photos', 'info');
        return;
      }
      const preview = URL.createObjectURL(file);
      setPhotos([...photos, { file, preview }]);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setVideo({ file, preview });
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const handleComplete = async () => {
    if (photos.length < 2) {
      showAlert('Please upload at least 2 photos', 'info');
      return;
    }

    setIsLoading(true);
    try {
      const uploadPromises = [
        ...photos.map(p => uploadMedia(user.uid, p.file, 'image')),
        ...(video ? [uploadMedia(user.uid, video.file, 'video')] : [])
      ];

      const urls = await Promise.all(uploadPromises);
      
      const media = [
        ...urls.slice(0, photos.length).map(url => ({ type: 'image' as const, url })),
        ...(video ? [{ type: 'video' as const, url: urls[urls.length - 1] }] : [])
      ];

      await updateUserProfile(user.uid, { media });
      
      // Trigger Welcome Email
      try {
        await apiFetch('/api/auth/welcome', {
          method: 'POST',
          body: JSON.stringify({ 
            email: user.email, 
            firstName: user.displayName?.split(' ')[0] || 'Founder' 
          }),
        });
      } catch (err) {
        console.error('Failed to trigger welcome email:', err);
      }

      onComplete();
    } catch (error: any) {
      showAlert(error.message || 'Failed to save media', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="block text-xs font-bold text-gray-500 tracking-widest ml-1">Intro Video (Optional)</label>
            <div className="relative aspect-[9/16] bg-white/5 rounded-3xl overflow-hidden border border-dashed border-white/10 flex flex-col items-center justify-center group cursor-pointer hover:border-purple-500/30 transition-colors max-w-[200px] mx-auto sm:mx-0">
              {video ? (
                <video src={video.preview} className="w-full h-full object-cover" controls />
              ) : (
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Video className="w-6 h-6 text-gray-500" />
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold tracking-tighter">Add Intro</p>
                </div>
              )}
              <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              {video && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideo(null);
                  }} 
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold text-gray-500 tracking-widest ml-1">Photos ({photos.length}/6)</label>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden group border border-white/5">
                  <img src={photo.preview} alt={`Upload ${index}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <label className="aspect-square bg-white/5 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-purple-500/30 transition-all group">
                  <Plus className="w-6 h-6 text-gray-600 group-hover:text-purple-500 transition-colors" />
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8">
        <button
          onClick={handleComplete}
          disabled={isLoading || photos.length < 2}
          className="premium-button w-full h-12 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Finish Profile'}
        </button>
      </div>
    </div>
  );
}
