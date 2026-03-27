import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Loader2, Send } from 'lucide-react';
import { uploadMedia } from '../../utils/storageService';
import { createStatus } from '../../utils/statusService';
import { useAlert } from '../../hooks/useAlert';

interface StatusUploadModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StatusUploadModal({ userId, onClose, onSuccess }: StatusUploadModalProps) {
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showAlert('Please upload an image file', 'error');
        return;
      }
      const preview = URL.createObjectURL(file);
      setImage({ file, preview });
    }
  };

  const handleUpload = async () => {
    if (!image) return;

    setIsLoading(true);
    try {
      const imageUrl = await uploadMedia(userId, image.file, 'image');
      await createStatus(userId, imageUrl, text);
      showAlert('Status uploaded successfully!', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showAlert(error.message || 'Failed to upload status', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-[#0a0a1e] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Share a Status</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div 
            onClick={() => !image && fileInputRef.current?.click()}
            className={`relative aspect-[9/16] max-h-[400px] mx-auto bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden transition-all ${!image ? 'hover:border-purple-500/50 cursor-pointer' : ''}`}
          >
            {image ? (
              <>
                <img src={image.preview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto border border-purple-500/20">
                  <Camera className="w-8 h-8 text-purple-500" />
                </div>
                <p className="text-sm text-gray-400 font-medium">Click to upload image</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-purple-400 uppercase tracking-widest px-1">Caption (Optional)</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 transition-all resize-none h-24"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={isLoading || !image}
            className="premium-button w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Post Status
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
