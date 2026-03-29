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
import attachIcon from '../assets/attach-circle.png';
import sendIcon from '../assets/Vector.png';

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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [blockDocId, setBlockDocId] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<{ blockDocId: string; profile: UserProfile }[]>([]);
  const [showBlocked, setShowBlocked] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [stagedMedia, setStagedMedia] = useState<{ type: 'image' | 'audio', file: File | Blob, url: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load blocked users for sidebar
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, 'blocks'), where('blockedBy', '==', uid));
    const unsub = onSnapshot(q, async (snap) => {
      const entries = await Promise.all(
        snap.docs.map(async (d) => {
          const blockedUid = d.data().blockedUser as string;
          try {
            const userSnap = await getDoc(doc(db, 'users', blockedUid));
            if (userSnap.exists()) {
              return { blockDocId: d.id, profile: userSnap.data() as UserProfile };
            }
          } catch { /* ignore */ }
          return null;
        })
      );
      setBlockedUsers(entries.filter(Boolean) as { blockDocId: string; profile: UserProfile }[]);
    });
    return () => unsub();
  }, []);

  // Check whether currently selected match is blocked by us
  useEffect(() => {
    setBlockDocId(null);
    if (!selectedMatch || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(
      collection(db, 'blocks'),
      where('blockedBy', '==', uid),
      where('blockedUser', '==', selectedMatch.uid)
    );
    getDocs(q).then(snap => {
      if (!snap.empty) setBlockDocId(snap.docs[0].id);
      else setBlockDocId(null);
    });
  }, [selectedMatch]);

  // ── Dropdown Actions ────────────────────────────────────────────
  const handleViewProfile = () => {
    setIsMoreMenuOpen(false);
    if (selectedMatch) navigate(`/profile/${selectedMatch.uid}`);
  };

  const handleUnmatch = async () => {
    setIsMoreMenuOpen(false);
    if (!selectedMatch || !auth.currentUser) return;

    const result = await Swal.fire({
      title: 'Unmatch?',
      text: `Are you sure you want to unmatch with ${selectedMatch.firstName}? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#a855f7',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Yes, unmatch',
      cancelButtonText: 'Cancel',
      background: '#130628',
      color: '#fff',
    });

    if (!result.isConfirmed) return;

    try {
      const uid = auth.currentUser.uid;
      const otherId = selectedMatch.uid;
      // Find and delete the match document
      const q = query(collection(db, 'matches'), where('users', 'array-contains', uid));
      const snap = await getDocs(q);
      const matchDoc = snap.docs.find(d => {
        const users = d.data().users as string[];
        return users.includes(otherId);
      });
      if (matchDoc) await deleteDoc(matchDoc.ref);

      // Also delete the like that created it
      const likeQ1 = query(collection(db, 'likes'), where('fromUserId', '==', uid), where('toUserId', '==', otherId));
      const likeQ2 = query(collection(db, 'likes'), where('fromUserId', '==', otherId), where('toUserId', '==', uid));
      const [s1, s2] = await Promise.all([getDocs(likeQ1), getDocs(likeQ2)]);
      await Promise.all([...s1.docs, ...s2.docs].map(d => deleteDoc(d.ref)));

      setSelectedMatch(null);
      setMatches(prev => prev.filter(m => m.uid !== otherId));
      showAlert('Unmatched successfully.', 'success');
      navigate('/messages');
    } catch (err) {
      console.error(err);
      showAlert('Failed to unmatch. Please try again.', 'error');
    }
  };

  const handleBlock = async () => {
    setIsMoreMenuOpen(false);
    if (!selectedMatch || !auth.currentUser) return;

    const result = await Swal.fire({
      title: 'Block User?',
      text: `${selectedMatch.firstName} won't be able to message you. You can unblock them anytime from this chat.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Block',
      cancelButtonText: 'Cancel',
      background: '#130628',
      color: '#fff',
    });

    if (!result.isConfirmed) return;

    try {
      const uid = auth.currentUser.uid;
      const otherId = selectedMatch.uid;

      // Write block record
      const blockRef = await addDoc(collection(db, 'blocks'), {
        blockedBy: uid,
        blockedUser: otherId,
        createdAt: serverTimestamp(),
      });

      // Update local state — user stays in chat, dropdown now shows Unblock
      setBlockDocId(blockRef.id);
      showAlert(`${selectedMatch.firstName} has been blocked.`, 'success');
    } catch (err) {
      console.error(err);
      showAlert('Failed to block user. Please try again.', 'error');
    }
  };

  const handleUnblock = async () => {
    setIsMoreMenuOpen(false);
    if (!blockDocId || !selectedMatch || !auth.currentUser) return;
    try {
      const uid = auth.currentUser.uid;
      const otherId = selectedMatch.uid;

      await deleteDoc(doc(db, 'blocks', blockDocId));
      setBlockDocId(null);

      // Recreate match if missing
      const matchQ = query(collection(db, 'matches'), where('users', 'array-contains', uid));
      const mSnap = await getDocs(matchQ);
      const existingMatch = mSnap.docs.find(d => (d.data().users as string[]).includes(otherId));

      if (!existingMatch) {
        await addDoc(collection(db, 'matches'), {
          users: [uid, otherId],
          createdAt: serverTimestamp()
        });
      }

      showAlert(`${selectedMatch.firstName} has been unblocked.`, 'success');
    } catch (err) {
      console.error(err);
      showAlert('Failed to unblock user. Please try again.', 'error');
    }
  };

  const handleReport = async () => {
    setIsMoreMenuOpen(false);
    if (!selectedMatch || !auth.currentUser) return;

    const { value: reason } = await Swal.fire({
      title: 'Report User',
      input: 'select',
      inputOptions: {
        'harassment': 'Harassment or bullying',
        'inappropriate': 'Inappropriate content',
        'fake_profile': 'Fake profile',
        'spam': 'Spam',
        'other': 'Other',
      },
      inputPlaceholder: 'Select a reason',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Submit Report',
      cancelButtonText: 'Cancel',
      background: '#130628',
      color: '#fff',
      inputValidator: (v) => !v ? 'Please select a reason' : null,
    });

    if (!reason) return;

    try {
      await addDoc(collection(db, 'reports'), {
        reportedBy: auth.currentUser.uid,
        reportedUser: selectedMatch.uid,
        reason,
        createdAt: serverTimestamp(),
      });
      showAlert('Report submitted. Thank you for keeping the community safe.', 'success');
    } catch (err) {
      console.error(err);
      showAlert('Failed to submit report. Please try again.', 'error');
    }
  };
  // ────────────────────────────────────────────────────────────────

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    const q = query(
      collection(db, 'matches'),
      where('users', 'array-contains', auth.currentUser.uid)
    );

    const unsubscribeMatches = onSnapshot(q, async (snapshot) => {
      try {
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
        console.error('Error loading matches snapshot:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribeMatches();
  }, [auth.currentUser?.uid, paramMatchId]);

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
        <aside className={`w-full md:w-80 border-r border-white/5 flex flex-col bg-[#090a1e]/60 backdrop-blur-xl ${selectedMatch ? 'hidden md:flex' : 'flex'}`}>
          <div className="px-4 sm:px-8 py-5 sm:py-8 border-b border-white/5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : matches.length > 0 ? (
              matches.map((match) => {
                const chatId = [auth.currentUser?.uid, match.uid].sort().join('_');
                const lastMsg = lastMessages[chatId];
                const isActive = selectedMatch?.uid === match.uid;
                const isUnread = lastMsg && lastMsg.senderId !== auth.currentUser?.uid && !lastMsg.isRead;

                return (
                  <button
                    key={match.uid}
                    onClick={() => {
                      setSelectedMatch(match);
                      navigate(`/messages/${match.uid}`);
                    }}
                    className="w-full px-4 py-4 flex items-center gap-3 transition-all relative border-b border-white/5 hover:bg-white/5"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-white/10 shrink-0 relative">
                      <img 
                        src={match.media?.[0]?.url || `https://picsum.photos/seed/${match.uid}/100/100`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0 pr-2">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold truncate text-sm sm:text-base text-white flex items-center gap-2">
                          {match.firstName} {match.lastName}
                          {/* Green dot next to name from design */}
                          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full"></div>
                        </h3>
                        {lastMsg && (
                          <span className="text-[10px] sm:text-xs font-bold text-gray-400 whitespace-nowrap ml-2">
                            {getFormatRelativeTime(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs sm:text-sm truncate font-medium flex items-center gap-1.5 text-gray-400 flex-1">
                          {lastMsg ? (
                            <>
                              {lastMsg.senderId === auth.currentUser?.uid && "You : "}
                              {lastMsg.type === 'text' ? lastMsg.text : (lastMsg.type === 'image' ? 'Sent a photo' : 'Sent a voice note')}
                            </>
                          ) : (
                            <span>Start a conversation</span>
                          )}
                        </p>
                        {lastMsg && (
                          <div className="flex-shrink-0 ml-2">
                            {lastMsg.senderId === auth.currentUser?.uid ? (
                              <CheckCheck className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${lastMsg.isRead ? 'text-purple-500' : 'text-gray-500'}`} />
                            ) : isUnread ? (
                              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-purple-600 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white">1</div>
                            ) : null}
                          </div>
                        )}
                      </div>
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

          {/* Blocked Users section */}
          {blockedUsers.length > 0 && (
            <div className="border-t border-white/5">
              <button
                onClick={() => setShowBlocked(p => !p)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors"
              >
                <span>BLOCKED ({blockedUsers.length})</span>
                <span className="text-lg leading-none">{showBlocked ? '−' : '+'}</span>
              </button>
              {showBlocked && blockedUsers.map(({ blockDocId: bdId, profile: bp }) => (
                <div key={bdId} className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                    <img
                      src={bp.media?.[0]?.url || `https://picsum.photos/seed/${bp.uid}/100/100`}
                      alt="Avatar"
                      className="w-full h-full object-cover opacity-50"
                    />
                  </div>
                  <p className="flex-1 text-sm font-medium text-gray-400 truncate">
                    {bp.firstName} {bp.lastName}
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const uid = auth.currentUser!.uid;
                        const otherId = bp.uid;

                        await deleteDoc(doc(db, 'blocks', bdId));
                        if (blockDocId === bdId) setBlockDocId(null);
                        
                        // Recreate match if missing
                        const matchQ = query(collection(db, 'matches'), where('users', 'array-contains', uid));
                        const mSnap = await getDocs(matchQ);
                        const existingMatch = mSnap.docs.find(d => (d.data().users as string[]).includes(otherId));

                        if (!existingMatch) {
                          await addDoc(collection(db, 'matches'), {
                            users: [uid, otherId],
                            createdAt: serverTimestamp()
                          });
                        }
                        
                        showAlert(`${bp.firstName} has been unblocked.`, 'success');
                      } catch {
                        showAlert('Failed to unblock. Please try again.', 'error');
                      }
                    }}
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 whitespace-nowrap transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Chat Area */}
        <main className={`flex-1 flex flex-col min-w-0 relative border-l border-white/5 ${!selectedMatch ? 'hidden md:flex' : 'flex'}`}>
          {/* Ambient Background Glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-900/10 rounded-full blur-[100px]" />
          </div>

          {selectedMatch ? (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Chat Header */}
              <header className="relative z-20 h-16 sm:h-20 border-b border-white/5 flex items-center justify-between px-3 sm:px-8 bg-[#130628] sticky top-0">
                <div className="flex items-center gap-3 sm:gap-4">
                  <button 
                    onClick={() => setSelectedMatch(null)}
                    className="md:hidden p-1 bg-white rounded-full text-black hover:bg-gray-200"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0 border border-white/10">
                    <img 
                      src={selectedMatch.media?.[0]?.url || `https://picsum.photos/seed/${selectedMatch.uid}/100/100`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#130628]"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg text-white font-bold">{selectedMatch.firstName} {selectedMatch.lastName}</h3>
                    {selectedMatch.isPro && (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#a855f7] rounded-full flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-300 hover:text-white border border-gray-600 rounded-full hover:bg-white/5 transition-all">
                    <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-300 hover:text-white border border-gray-600 rounded-full hover:bg-white/5 transition-all">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  {/* More menu */}
                  <div ref={moreMenuRef} className="relative">
                    <button
                      onClick={() => setIsMoreMenuOpen(prev => !prev)}
                      className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border rounded-full transition-all ${
                        isMoreMenuOpen
                          ? 'bg-white/10 border-white/30 text-white'
                          : 'text-gray-300 hover:text-white border-gray-600 hover:bg-white/5'
                      }`}
                    >
                      <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {/* Dropdown */}
                    {isMoreMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl overflow-hidden z-50">
                        <button
                          onClick={handleViewProfile}
                          className="w-full px-4 py-3.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-100"
                        >
                          View User Profile
                        </button>
                        <button
                          onClick={handleUnmatch}
                          className="w-full px-4 py-3.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-100"
                        >
                          Unmatch
                        </button>
                        <button
                          onClick={blockDocId ? handleUnblock : handleBlock}
                          className={`w-full px-4 py-3.5 text-left text-sm font-semibold transition-colors border-b border-gray-100 ${
                            blockDocId
                              ? 'text-gray-800 hover:bg-gray-50'
                              : 'text-red-500 hover:bg-red-50'
                          }`}
                        >
                          {blockDocId ? 'Unblock' : 'Block'}
                        </button>
                        <button
                          onClick={handleReport}
                          className="w-full px-4 py-3.5 text-left text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                        >
                          Report User Profile
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {/* Messages List */}
              <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:p-8 space-y-3 sm:space-y-6 custom-scrollbar bg-[#090a1e]">
                {messages.map((msg, index) => {
                  const isMe = msg.senderId === auth.currentUser?.uid;
                  const messageDate = msg.createdAt ? new Date(msg.createdAt.seconds * 1000) : new Date();
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const prevDate = prevMsg?.createdAt ? new Date(prevMsg.createdAt.seconds * 1000) : null;
                  const isNewDay = !prevDate || messageDate.toDateString() !== prevDate.toDateString();

                  return (
                    <React.Fragment key={msg.id || index}>
                      {isNewDay && (
                        <div className="flex justify-center my-6">
                          <span className="bg-white px-3 py-1 rounded text-xs font-semibold text-gray-800 shadow-sm">
                            {messageDate.toLocaleDateString() === new Date().toLocaleDateString() ? 'Today' : messageDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                      
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}>
                        <div className={`flex flex-col max-w-[82%] sm:max-w-[70%] lg:max-w-[60%] relative`}>
                          {isMe && (
                            <div className="absolute top-1/2 -translate-y-1/2 -left-14 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                               {msg.type === 'text' && (
                                <button 
                                  onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setNewMessage(msg.text || '');
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-full"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors bg-white/5 rounded-full"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {/* Bubble */}
                          <div className={`relative overflow-hidden shadow-sm min-w-[160px] ${
                            isMe
                              ? 'bg-[#f8edfe] text-gray-800 rounded-md rounded-tr-sm'
                              : 'bg-white text-gray-800 rounded-md rounded-tl-sm'
                          }`}>
                            {msg.type === 'text' && (
                              <div className="px-3.5 py-2.5 pb-6 text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.text}
                              </div>
                            )}
                            
                            {msg.type === 'image' && (
                              <div className={`p-1 pb-6 relative group/img ${isMe ? 'bg-[#f8edfe]' : 'bg-white'}`}>
                                <img 
                                  src={msg.mediaUrl} 
                                  alt="Media" 
                                  className="rounded-xl w-full max-h-[320px] sm:max-h-[400px] object-cover" 
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
                              <div className={`pb-6 ${isMe ? 'bg-[#f8edfe]' : 'bg-white'}`}>
                                <AudioPlayer url={msg.mediaUrl!} isMe={isMe} />
                              </div>
                            )}

                            {/* Timestamp + read receipt inside bubble */}
                            <div className={`absolute bottom-1.5 flex items-center gap-0.5 text-[9px] font-medium text-gray-400 ${isMe ? 'right-2' : 'left-2'}`}>
                              {msg.editedAt && <span className="mr-0.5">(edited)</span>}
                              <span>
                                {msg.createdAt 
                                  ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                                  : ''}
                              </span>
                              {isMe && (
                                <CheckCheck className={`w-3 h-3 ml-0.5 ${msg.isRead ? 'text-[#a855f7]' : 'text-gray-400'}`} />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Container */}
              <div className="relative z-20 px-3 sm:px-6 py-3 sm:py-4 border-t border-white/10 bg-[#090a1e]/60 backdrop-blur-xl">
                
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
                      className="absolute bottom-[calc(100%+1rem)] left-4 sm:left-8 p-3 rounded-2xl bg-[#090a1e]/90 backdrop-blur-3xl border border-white/10 shadow-2xl z-40 origin-bottom-left flex flex-col items-center"
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
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden bg-black/50 ring-2 ring-purple-500/30">
                          <img src={stagedMedia.url} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                      )}
                      
                      {stagedMedia.type === 'audio' && (
                        <div className="bg-purple-900/40 rounded-xl overflow-hidden border border-purple-500/20 max-w-[240px] sm:max-w-[280px]">
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
                      className="absolute bottom-[calc(100%-1rem)] left-4 sm:left-8 mb-4 z-30"
                    >
                      <EmojiPicker 
                        theme={Theme.DARK}
                        onEmojiClick={handleEmojiClick}
                        emojiStyle={EmojiStyle.APPLE}
                        lazyLoadEmojis={true}
                        searchPlaceholder="Search emojis..."
                        width={300}
                        height={350}
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
                      className="absolute bottom-[calc(100%-1rem)] right-4 sm:right-8 mb-4 flex flex-col gap-2 z-30"
                    >
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white hover:bg-purple-500 transition-all active:scale-95 group shadow-lg"
                      >
                        <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={startRecording}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white hover:bg-indigo-500 transition-all active:scale-95 group shadow-lg"
                      >
                        <Mic className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
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

                {/* Single Row Input Bar */}
                <div className="flex items-center gap-2 border border-white/10 rounded-2xl px-3 sm:px-4 py-2 bg-white/5">
                  {isRecording ? (
                    <div className="flex-1 flex items-center justify-between text-white animate-pulse">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                        <span className="font-bold text-xs sm:text-sm">Recording...</span>
                        <span className="font-mono text-xs sm:text-sm">{formatTime(recordingTime)}</span>
                      </div>
                      <button onClick={stopRecording} className="text-white hover:text-red-400 transition-colors">
                        <StopCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Type your message here..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onFocus={() => {
                        setIsEmojiOpen(false);
                        setIsMediaMenuOpen(false);
                      }}
                      className="flex-1 bg-transparent border-none text-sm sm:text-base text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-0 min-w-0"
                    />
                  )}

                  {!isRecording && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        type="button"
                        onClick={() => {
                          setIsMediaMenuOpen(!isMediaMenuOpen);
                          setIsEmojiOpen(false);
                        }}
                        className="hover:opacity-100 opacity-60 transition-all shrink-0"
                        title="Attach Media"
                      >
                        <img src={attachIcon} alt="Attach" className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
                      </button>

                      <button 
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={(!newMessage.trim() && !stagedMedia) || mediaLoading}
                        className="hover:opacity-100 opacity-60 disabled:opacity-30 transition-all shrink-0"
                      >
                        {mediaLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        ) : (
                          <img src={sendIcon} alt="Send" className="w-[20px] h-[20px] object-contain" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
