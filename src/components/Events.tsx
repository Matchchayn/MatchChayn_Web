import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Plus, 
  Search, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Clock,
  ChevronRight,
  Edit2,
  Trash2,
  X,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, arrayUnion, arrayRemove, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Event } from '../types';
import MainLayout from './MainLayout';

interface EventsProps {
  profile: UserProfile | null;
}

export default function Events({ profile }: EventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    imageUrl: ''
  });
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      const path = 'events';
      try {
        const snapshot = await getDocs(collection(db, path));
        const eventsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Event));
        // Sort events by startTime
        eventsList.sort((a, b) => {
          const getTime = (val: any) => {
            if (!val) return 0;
            if (val.seconds) return val.seconds;
            const d = new Date(val);
            return isNaN(d.getTime()) ? 0 : d.getTime();
          };
          return getTime(a.startTime) - getTime(b.startTime);
        });
        setEvents(eventsList);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowForm(true);
    }
  }, [searchParams]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    const path = 'events';
    
    try {
      let finalImageUrl = newEvent.imageUrl;

      // Handle file upload if present
      if (imageFile) {
        const fileRef = ref(storage, `event-images/${auth.currentUser.uid}/${Date.now()}_${imageFile.name}`);
        await uploadBytes(fileRef, imageFile);
        finalImageUrl = await getDownloadURL(fileRef);
      }

      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        startTime: Timestamp.fromDate(new Date(newEvent.startTime)),
        endTime: Timestamp.fromDate(new Date(newEvent.endTime)),
        location: newEvent.location,
        imageUrl: finalImageUrl || '',
        creatorId: auth.currentUser.uid,
        updatedAt: serverTimestamp()
      };

      if (editingEventId) {
        const eventRef = doc(db, 'events', editingEventId);
        await updateDoc(eventRef, eventData);
        setEvents(prev => prev.map(e => e.id === editingEventId ? { ...e, ...eventData } as Event : e));
        setEditingEventId(null);
      } else {
        const docRef = await addDoc(collection(db, path), {
          ...eventData,
          attendees: [auth.currentUser.uid],
          createdAt: serverTimestamp()
        });
        const createdEvent = { 
          id: docRef.id, 
          ...eventData, 
          attendees: [auth.currentUser.uid], 
          createdAt: new Date() 
        } as Event;
        setEvents(prev => [createdEvent, ...prev]);
      }
      
      setNewEvent({ title: '', description: '', startTime: '', endTime: '', location: '', imageUrl: '' });
      setImageFile(null);
      setPreviewUrl(null);
      setShowForm(false);
    } catch (err) {
      handleFirestoreError(err, editingEventId ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (event: Event) => {
    setEditingEventId(event.id);
    const start = event.startTime?.toDate ? event.startTime.toDate() : new Date(event.startTime);
    const end = event.endTime?.toDate ? event.endTime.toDate() : new Date(event.endTime);
    
    const formatDateForInput = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    setNewEvent({
      title: event.title,
      description: event.description,
      startTime: formatDateForInput(start),
      endTime: formatDateForInput(end),
      location: event.location,
      imageUrl: event.imageUrl || ''
    });
    setPreviewUrl(event.imageUrl || null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    const path = `events/${eventId}`;
    try {
      await deleteDoc(doc(db, 'events', eventId));
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!auth.currentUser) return;
    const path = `events/${eventId}`;
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        attendees: arrayUnion(auth.currentUser.uid)
      });
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, attendees: [...e.attendees, auth.currentUser!.uid] } : e));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!auth.currentUser) return;
    const path = `events/${eventId}`;
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        attendees: arrayRemove(auth.currentUser.uid)
      });
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, attendees: e.attendees.filter(id => id !== auth.currentUser!.uid) } : e));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const cancelEdit = () => {
    setEditingEventId(null);
    setShowForm(false);
    setImageFile(null);
    setPreviewUrl(null);
    setNewEvent({ title: '', description: '', startTime: '', endTime: '', location: '', imageUrl: '' });
  };

  return (
    <MainLayout profile={profile}>
      <div className="max-w-7xl mx-auto p-8 space-y-12 h-full flex flex-col">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-4">
              {showForm ? (
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/5 rounded-full transition-all text-gray-400">
                  <ChevronRight className="w-8 h-8 rotate-180" />
                </button>
              ) : (
                <Calendar className="w-10 h-10 text-purple-500" />
              )}
              {showForm ? (editingEventId ? 'Edit Event' : 'New Event') : 'Events'}
            </h1>
            <p className="text-gray-500 font-medium tracking-tight">
              {showForm ? 'Post a fresh event on the community wall.' : 'Discover and join events in your community.'}
            </p>
          </div>
          {!showForm && profile?.isPro && (
            <button 
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Event
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            {showForm ? (
              <div className="max-w-4xl mx-auto h-full overflow-y-auto pb-12">
                <div className="space-y-10 p-2">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-white/90">
                      {editingEventId ? 'Refine Event' : 'Host Event'}
                    </h2>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">
                      Fill in the details below to broadcast your experience.
                    </p>
                  </div>

                  <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Visual Preview</label>
                        <div className="aspect-video w-full bg-white/5 border-2 border-dashed border-white/10 rounded-3xl overflow-hidden relative group cursor-pointer hover:border-purple-500/50 transition-all">
                          {previewUrl ? (
                            <>
                              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button type="button" onClick={() => { setImageFile(null); setPreviewUrl(null); }} className="p-3 bg-rose-500 rounded-2xl text-white">
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <label className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer">
                              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-purple-500">
                                <Upload className="w-6 h-6" />
                              </div>
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Click to upload image</span>
                              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                          )}
                        </div>
                        <input 
                          type="url" 
                          placeholder="Or paste external Image URL..."
                          value={newEvent.imageUrl}
                          onChange={(e) => setNewEvent({ ...newEvent, imageUrl: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none"
                        />
                      </div>

                      <div className="space-y-4 pt-4">
                        <div className="flex gap-4">
                          <button 
                            type="button"
                            onClick={cancelEdit}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl font-bold transition-all active:scale-[0.98]"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingEventId ? 'Update Event' : 'Create Event'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Details</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Event Title..."
                          value={newEvent.title}
                          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none"
                        />
                        <textarea 
                          required
                          placeholder="Event Description..."
                          value={newEvent.description}
                          onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none h-44 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Start Time</label>
                          <input 
                            required
                            type="datetime-local" 
                            value={newEvent.startTime}
                            onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">End Time</label>
                          <input 
                            required
                            type="datetime-local" 
                            value={newEvent.endTime}
                            onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Location</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Where is the event?..."
                          value={newEvent.location}
                          onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none"
                        />
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
                {events.map((event) => (
                  <div key={event.id} className="bg-white/5 border border-transparent rounded-2xl overflow-hidden group hover:border-purple-500/30 transition-all flex flex-col h-full relative">
                    {/* Admin Actions */}
                    {auth.currentUser?.uid === event.creatorId && (
                      <div className="absolute top-6 left-6 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(event)}
                          className="p-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-purple-600 transition-all border border-white/10 text-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-rose-600 transition-all border border-white/10 text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="h-56 relative overflow-hidden">
                      {event.imageUrl ? (
                        <img 
                          src={event.imageUrl} 
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-indigo-900/40" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      
                      <div className="absolute top-6 right-6 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 flex items-center gap-2 text-xs font-bold leading-none text-white">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        {event.attendees?.length || 0} members
                      </div>
                      
                      <div className="absolute bottom-6 left-6 right-6">
                        <h3 className="text-2xl font-bold tracking-tight leading-tight text-white">{event.title}</h3>
                      </div>
                    </div>
                    
                    <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                      <p className="text-gray-400 text-sm line-clamp-3 font-medium leading-relaxed">
                        {event.description}
                      </p>
                      
                      <div className="space-y-4">
                        <div className="space-y-3 px-1">
                          <div className="flex items-center gap-3.5 text-xs text-gray-500 font-semibold tracking-wide uppercase">
                            <Clock className="w-4 h-4 text-purple-500 shrink-0" />
                            <div className="flex flex-col">
                              <span>{event.startTime?.toDate ? event.startTime.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date(event.startTime).toLocaleString()}</span>
                              <span className="opacity-40 text-[10px]">to {event.endTime?.toDate ? event.endTime.toDate().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date(event.endTime).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3.5 text-xs text-gray-500 font-semibold tracking-wide uppercase">
                            <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                            {event.location}
                          </div>
                        </div>

                        {auth.currentUser && (event.attendees?.includes(auth.currentUser.uid)) ? (
                          <button 
                            onClick={() => handleLeaveEvent(event.id)}
                            className="w-full py-4.5 bg-white/5 hover:bg-rose-500/10 text-gray-400 hover:text-rose-500 rounded-2xl font-bold transition-all border border-white/5 hover:border-rose-500/20 active:scale-[0.98]"
                          >
                            Leave Event
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleJoinEvent(event.id)}
                            className="w-full py-4.5 bg-purple-600 hover:bg-purple-700 rounded-2xl font-bold transition-all active:scale-[0.98] text-white"
                          >
                            Join Event
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

