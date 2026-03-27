import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  User as UserIcon, 
  ChevronLeft,
  MoreVertical,
  Phone,
  Video,
  Plus,
  Image as ImageIcon,
  Mic,
  Smile,
  X,
  Play,
  Pause,
  Trash2,
  StopCircle,
  AlertCircle,
  Clock,
  Edit2,
  Download,
  CheckCheck
} from 'lucide-react';
import { sendNotification } from '../utils/notificationService';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  getDoc,
  getDocs,
  limit,
  deleteDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { uploadFile } from '../utils/uploadService';
import { UserProfile } from '../types';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from './MainLayout';
import { motion, AnimatePresence } from 'motion/react';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { useAlert } from '../hooks/useAlert';
import Swal from 'sweetalert2';

interface Message {
  id: string;
  senderId: string;
  text?: string;
  type: 'text' | 'image' | 'audio';
  mediaUrl?: string;
  createdAt: any;
  editedAt?: any;
  isRead?: boolean;
}

interface MessagesProps {
  profile: UserProfile | null;
}

// Sub-component for a functional Audio Player
const AudioPlayer = ({ url, isMe }: { url: string; isMe: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [url]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="p-4 min-w-[240px] flex items-center gap-3">
      <button 
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 ${
          isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-purple-500 hover:bg-purple-600'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-white" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 ml-0.5 text-white" fill="currentColor" />
        )}
      </button>
      <div className="flex-1 space-y-1.5">
        <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group">
          <div 
            className={`absolute top-0 left-0 h-full transition-all duration-100 ${isMe ? 'bg-white' : 'bg-purple-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center px-0.5">
          <p className="text-[9px] font-bold opacity-60 italic text-white">Voice Note</p>
          <p className="text-[9px] font-mono opacity-60">
            {Math.floor((isPlaying ? audioRef.current?.currentTime || 0 : duration) / 60)}:
            {Math.floor((isPlaying ? audioRef.current?.currentTime || 0 : duration) % 60).toString().padStart(2, '0')}
          </p>
        </div>
      </div>
    </div>
  );
};

const compressImage = (file: File | Blob): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(file); // fallback to original
        }, 'image/jpeg', 0.7); // compress to 70% quality JPEG
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function Messages({ profile }: MessagesProps) {
  const { matchId: paramMatchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [matches, setMatches] = useState<UserProfile[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  
  // Media States
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isMediaMenuOpen, setIsMediaMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [stagedMedia, setStagedMedia] = useState<{ type: 'image' | 'audio', file: File | Blob, url: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadMatches = async () => {
      if (!auth.currentUser) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'matches'),
          where('users', 'array-contains', auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const matchUserIds = snapshot.docs.map(d => {
          const users = d.data().users as string[];
          return users.find(id => id !== auth.currentUser!.uid);
        }).filter(Boolean) as string[];

        const matchProfiles = await Promise.all(matchUserIds.map(async (id) => {
          const userDoc = await getDoc(doc(db, 'users', id));
          return userDoc.exists() ? { uid: userDoc.id, id: userDoc.id, ...userDoc.data() } as UserProfile : null;
        }));

        const filtered = matchProfiles.filter(Boolean) as UserProfile[];
        setMatches(filtered);

        if (paramMatchId) {
          const match = filtered.find(m => (m.id || m.uid) === paramMatchId);
          if (match) setSelectedMatch(match);
        }

        // Setup real-time listeners for last messages
        filtered.forEach(match => {
          const chatId = [auth.currentUser!.uid, match.uid].sort().join('_');
          const lastMsgQuery = query(
            collection(db, 'messages'),
            where('chatId', '==', chatId),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          onSnapshot(lastMsgQuery, (snap) => {
            if (!snap.empty) {
              setLastMessages(prev => ({
                ...prev,
                [chatId]: { id: snap.docs[0].id, ...snap.docs[0].data() } as Message
              }));
            }
          });
        });

      } catch (err) {
        console.error('Error loading matches:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMatches();
  }, [paramMatchId]);

  useEffect(() => {
    if (!selectedMatch || !auth.currentUser) return;

    const chatId = [auth.currentUser.uid, selectedMatch.uid].sort().join('_');
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
    }, (err) => {
      console.error('Firestore Snapshot Error:', err);
      showAlert('Connection lost. Real-time updates may be delayed.', 'info');
    });

    return () => unsubscribe();
  }, [selectedMatch]);

  // Read Receipts logic
  useEffect(() => {
    if (!messages.length || !auth.currentUser) return;
    const unreadIds = messages.filter(m => m.senderId !== auth.currentUser!.uid && !m.isRead).map(m => m.id);
    if (unreadIds.length > 0) {
      const markAsRead = async () => {
        try {
          const batch = writeBatch(db);
          unreadIds.forEach(id => {
            batch.update(doc(db, 'messages', id), { isRead: true });
          });
          await batch.commit();
        } catch (err) {
          console.error('Mark as read failed:', err);
        }
      };
      markAsRead();
    }
  }, [messages]);

  const handleDeleteMessage = async (msgId: string) => {
    const result = await Swal.fire({
      title: 'Delete message?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#a855f7',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!',
      background: '#11112b',
      color: '#ffffff',
      backdrop: 'rgba(0, 0, 0, 0.8)'
    });

    if (!result.isConfirmed) return;

    try {
      await deleteDoc(doc(db, 'messages', msgId));
      showAlert('Message deleted.', 'success');
    } catch (err) {
      console.error('Delete error', err);
      showAlert('Failed to delete message.', 'error');
    }
  };

  const handleDownloadImage = async (url: string, filename: string = 'image.jpg') => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !stagedMedia && !auth.currentUser) return;
    if (!selectedMatch || !auth.currentUser) return;

    if (mediaLoading) return;

    if (editingMessageId && newMessage.trim()) {
      try {
        await updateDoc(doc(db, 'messages', editingMessageId), {
          text: newMessage.trim(),
          editedAt: serverTimestamp()
        });
        setEditingMessageId(null);
        setNewMessage('');
        setIsEmojiOpen(false);
      } catch (err) {
        console.error('Edit error:', err);
        showAlert('Failed to edit message.', 'error');
      }
      return;
    }

    const chatId = [auth.currentUser.uid, selectedMatch.uid].sort().join('_');
    const textSnapshot = newMessage;
    let finalMediaData: { type: 'image' | 'audio', url: string } | null = null;

    if (stagedMedia) {
      setMediaLoading(true);
      try {
        const fileExt = stagedMedia.type === 'audio' ? 'webm' : 'jpg';
        const rawFileName = (stagedMedia.file as File).name || `media.${fileExt}`;
        const filename = `chat_${Date.now()}_${rawFileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        
        let fileToUpload: Blob | File = stagedMedia.file;
        let finalFileType = stagedMedia.type === 'audio' ? 'audio/webm' : 'image/jpeg';
        
        if (stagedMedia.type === 'image') {
          fileToUpload = await compressImage(stagedMedia.file);
          finalFileType = fileToUpload.type || 'image/jpeg';
        } else if (stagedMedia.type === 'audio') {
          // Coerce untyped iOS blobs to an audio mime-type before upload
          if (!fileToUpload.type) {
            fileToUpload = new Blob([fileToUpload], { type: 'audio/webm' });
          }
          finalFileType = fileToUpload.type || 'audio/webm';
        }

        const url = await uploadFile(fileToUpload, filename);
        finalMediaData = { type: stagedMedia.type, url };
        URL.revokeObjectURL(stagedMedia.url);
        setStagedMedia(null);
      } catch (err) {
        console.error('Media upload failed:', err);
        showAlert('Failed to upload media.', 'error');
        setMediaLoading(false);
        return;
      }
    }

    setNewMessage('');
    setIsEmojiOpen(false);

    try {
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: auth.currentUser.uid,
        text: textSnapshot || '',
        type: finalMediaData ? finalMediaData.type : 'text',
        mediaUrl: finalMediaData ? finalMediaData.url : null,
        createdAt: serverTimestamp()
      });

      if (profile) {
        await sendNotification(selectedMatch.uid || (selectedMatch as any).id, 'message', profile);
      }
    } catch (err) {
      console.error('Firebase Save Failed:', err);
      showAlert('Message failed to save to Firebase.', 'error');
    } finally {
      setMediaLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsMediaMenuOpen(false);
    setStagedMedia({
      type: 'image',
      file,
      url: URL.createObjectURL(file)
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Let the browser pick its best supported codec natively rather than hardcoding webm 
        // which sometimes fails on iOS depending on the implementation
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        
        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current);
          setStagedMedia({
            type: 'audio',
            file: audioBlob,
            url: URL.createObjectURL(audioBlob)
          });
          stream.getTracks().forEach(track => track.stop());
        };
        
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordingTime(0);
        recordingTimerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
      } catch (err) {
        showAlert('Microphone access denied or not supported.', 'error');
      }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const getFormatRelativeTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <MainLayout profile={profile} noScroll={true}>
      <div className="flex h-full font-sans overflow-hidden bg-[#090a1e]">
        {/* Matches List */}
        <aside className={`w-80 border-r border-white/5 flex flex-col bg-[#090a1e]/60 backdrop-blur-xl ${selectedMatch ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-8 border-b border-white/5">
            <h2 className="text-2xl font-bold tracking-tight text-white">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : matches.length > 0 ? (
              matches.map((match) => {
                const chatId = [auth.currentUser?.uid, match.uid].sort().join('_');
                const lastMsg = lastMessages[chatId];
                const isActive = selectedMatch?.uid === match.uid;

                return (
                  <button
                    key={match.uid}
                    onClick={() => {
                      setSelectedMatch(match);
                      navigate(`/messages/${match.uid}`);
                    }}
                    className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all group border-2 ${
                      isActive 
                        ? 'bg-purple-500/10 border-purple-500' 
                        : 'hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                      <img 
                        src={match.media?.[0]?.url || `https://picsum.photos/seed/${match.uid}/100/100`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-baseline gap-2 mb-1">
                        <h3 className={`font-bold truncate text-sm ${isActive ? 'text-white' : 'text-gray-200'}`}>
                          {match.firstName} {match.lastName}
                        </h3>
                        {lastMsg && (
                          <span className="text-[9px] font-bold text-gray-500 whitespace-nowrap">
                            {getFormatRelativeTime(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate font-medium flex items-center gap-1.5 ${isActive ? 'text-purple-300' : 'text-gray-500'}`}>
                        {lastMsg ? (
                          <>
                            {lastMsg.type === 'image' && <ImageIcon className="w-3 h-3" />}
                            {lastMsg.type === 'audio' && <Mic className="w-3 h-3" />}
                            {lastMsg.type === 'text' ? lastMsg.text : (lastMsg.type === 'image' ? 'Sent a photo' : 'Voice note')}
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-green-500">Active now</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-10 space-y-4 opacity-20">
                <MessageCircle className="w-12 h-12 mx-auto" />
                <p className="text-sm font-bold">No connections yet</p>
              </div>
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <main className={`flex-1 flex flex-col min-w-0 relative ${!selectedMatch ? 'hidden md:flex' : 'flex'}`}>
          {/* Ambient Background Glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-900/10 rounded-full blur-[100px]" />
          </div>

          {selectedMatch ? (
            <>
              {/* Chat Header */}
              <header className="relative z-20 h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#090a1e]/60 backdrop-blur-xl sticky top-0">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedMatch(null)}
                    className="md:hidden p-2 hover:bg-white/5 rounded-full text-gray-400"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0">
                    <img 
                      src={selectedMatch.media?.[0]?.url || `https://picsum.photos/seed/${selectedMatch.uid}/100/100`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{selectedMatch.firstName} {selectedMatch.lastName}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-bold text-green-500">Online</span>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <button className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all font-bold"><Phone className="w-5 h-5" /></button>
                  <button className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all font-bold"><Video className="w-5 h-5" /></button>
                  <button className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all font-bold"><MoreVertical className="w-5 h-5" /></button>
                </div>
              </header>

              {/* Messages List */}
              <div className="relative z-10 flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {messages.map((msg, index) => {
                  const isMe = msg.senderId === auth.currentUser?.uid;
                  const messageDate = msg.createdAt ? new Date(msg.createdAt.seconds * 1000) : new Date();
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const prevDate = prevMsg?.createdAt ? new Date(prevMsg.createdAt.seconds * 1000) : null;
                  const isNewDay = !prevDate || messageDate.toDateString() !== prevDate.toDateString();

                  return (
                    <React.Fragment key={msg.id || index}>
                      {isNewDay && (
                        <div className="flex justify-center my-8">
                          <span className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-bold text-gray-400 backdrop-blur-md">
                            {new Date(messageDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                      
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}>
                        <div className={`flex items-start gap-2 max-w-full ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                          {isMe && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-2 shrink-0">
                              {msg.type === 'text' && (
                                <button 
                                  onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setNewMessage(msg.text || '');
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          <div className={`max-w-[75%] rounded-[24px] overflow-hidden relative ${
                            isMe ? 'bg-purple-600 rounded-tr-none text-white' : 'bg-white/10 border border-white/10 rounded-tl-none text-gray-200'
                          }`}>
                            {msg.type === 'text' && (
                              <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.text}
                              </div>
                            )}
                            
                            {msg.type === 'image' && (
                              <div className="p-1 relative group/img">
                                <img 
                                  src={msg.mediaUrl} 
                                  alt="Media" 
                                  className="rounded-2xl w-full max-h-[400px] object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" 
                                  onClick={() => window.open(msg.mediaUrl, '_blank')}
                                />
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadImage(msg.mediaUrl!, `matchchayn_image_${msg.id}.jpg`);
                                  }}
                                  className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-md"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            {msg.type === 'audio' && (
                              <AudioPlayer url={msg.mediaUrl!} isMe={isMe} />
                            )}
                          </div>
                        </div>
                        
                        <div className={`mt-1.5 mx-2 flex items-center gap-1.5 text-[9px] font-bold opacity-40 ${isMe ? 'justify-end text-gray-300' : 'justify-start text-purple-300'}`}>
                          {msg.editedAt && <span>(edited)</span>}
                          <span>
                            {msg.createdAt 
                              ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Sending...'}
                          </span>
                          {isMe && msg.isRead && (
                            <span className="flex items-center gap-0.5 text-green-400 ml-1">
                              <CheckCheck className="w-3 h-3" /> Seen
                            </span>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Container */}
              <div className="relative z-20 px-8 pb-8 pt-4 border-t border-white/5 bg-[#090a1e]/60 backdrop-blur-xl">
                
                {editingMessageId && (
                  <div className="absolute -top-10 left-8 right-8 flex items-center justify-between bg-purple-600/20 border border-purple-500/30 rounded-t-xl px-4 py-2 text-xs font-bold text-purple-200 backdrop-blur-md">
                    <span className="flex flex-row items-center gap-2"><Edit2 className="w-3.5 h-3.5" /> Editing message...</span>
                    <button 
                      onClick={() => {
                        setEditingMessageId(null);
                        setNewMessage('');
                      }}
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                
                {/* Staged Media Preview Area */}
                <AnimatePresence>
                  {stagedMedia && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-[calc(100%+1rem)] left-8 p-3 rounded-2xl bg-[#090a1e]/90 backdrop-blur-3xl border border-white/10 shadow-2xl z-40 origin-bottom-left flex flex-col items-center"
                    >
                      <button 
                        onClick={() => {
                          URL.revokeObjectURL(stagedMedia.url);
                          setStagedMedia(null);
                        }}
                        className="absolute -top-3 -right-3 p-1.5 bg-red-500 hover:bg-red-400 text-white rounded-full transition-all hover:scale-110 shadow-xl z-50 animate-bounce-in"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      
                      {stagedMedia.type === 'image' && (
                        <div className="w-40 h-40 rounded-xl overflow-hidden bg-black/50 ring-2 ring-purple-500/30">
                          <img src={stagedMedia.url} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                      )}
                      
                      {stagedMedia.type === 'audio' && (
                        <div className="bg-purple-900/40 rounded-xl overflow-hidden border border-purple-500/20 max-w-[280px]">
                          <AudioPlayer url={stagedMedia.url} isMe={true} />
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Emoji Picker */}
                <AnimatePresence>
                  {isEmojiOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-[calc(100%-1rem)] left-8 mb-4 z-30"
                    >
                      <EmojiPicker 
                        theme={Theme.DARK}
                        onEmojiClick={handleEmojiClick}
                        emojiStyle={EmojiStyle.APPLE}
                        lazyLoadEmojis={true}
                        searchPlaceholder="Search emojis..."
                        width={350}
                        height={400}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Media Menu */}
                <AnimatePresence>
                  {isMediaMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -10, scale: 0.95 }}
                      className="absolute bottom-[calc(100%-1rem)] left-8 mb-4 flex flex-col gap-2 z-30"
                    >
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white hover:bg-purple-500 transition-all active:scale-95 group"
                      >
                        <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={startRecording}
                        className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white hover:bg-indigo-500 transition-all active:scale-95 group"
                      >
                        <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageSelect}
                />

                <div className="relative flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setIsMediaMenuOpen(!isMediaMenuOpen);
                      setIsEmojiOpen(false);
                    }}
                    className={`p-3.5 rounded-2xl transition-all active:scale-95 ${
                      isMediaMenuOpen ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Plus className={`w-6 h-6 transition-transform duration-300 ${isMediaMenuOpen ? 'rotate-45' : ''}`} />
                  </button>

                  <div className="flex-1 relative group">
                    {isRecording ? (
                      <div className="w-full bg-purple-600/20 border border-purple-500/30 rounded-2xl px-6 py-4 flex items-center justify-between text-white animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                          <span className="font-bold text-[10px]">Recording</span>
                          <span className="font-mono text-xs">{formatTime(recordingTime)}</span>
                        </div>
                        <button onClick={stopRecording} className="text-white hover:text-red-400 transition-colors">
                          <StopCircle className="w-6 h-6" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input 
                          type="text" 
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onFocus={() => {
                            setIsEmojiOpen(false);
                            setIsMediaMenuOpen(false);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pr-16 text-sm focus:border-purple-500 transition-all outline-none font-sans text-gray-100 placeholder:text-gray-600"
                        />
                        <button 
                          onClick={() => {
                            setIsEmojiOpen(!isEmojiOpen);
                            setIsMediaMenuOpen(false);
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-400 transition-colors p-1"
                        >
                          <Smile className="w-6 h-6" />
                        </button>
                      </>
                    )}
                  </div>

                  {!isRecording && (
                    <button 
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={(!newMessage.trim() && !stagedMedia) || mediaLoading}
                      className="p-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-2xl transition-all active:scale-95 shrink-0 flex items-center justify-center relative overflow-hidden"
                    >
                      {mediaLoading ? (
                        <>
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                          <Loader2 className="w-6 h-6 animate-spin relative z-10" />
                        </>
                      ) : (
                        <Send className="w-6 h-6" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 opacity-30">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center">
                <MessageCircle className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tight">Your Conversations</h3>
                <p className="text-sm font-medium">Select a connection to start messaging.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </MainLayout>
  );
}
