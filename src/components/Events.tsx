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
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icons in React
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface LocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

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
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    imageUrl: ''
  });
  
  // Location Autocomplete State
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [forceHideDropdown, setForceHideDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(`Location: ${profile?.city || 'Lagos'}`);
  const filterRef = useRef<HTMLDivElement>(null);
  
  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.location.toLowerCase().includes(searchQuery.toLowerCase())
  );


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

  const handleLocationSearch = (query: string) => {
    setForceHideDropdown(false);
    setNewEvent(prev => ({ 
      ...prev, 
      location: query,
      // Only reset coordinates if the input is completely cleared
      ...(query.trim() === '' ? { lat: undefined, lng: undefined } : {}) 
    }));
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (!query.trim()) {
      setLocationResults([]);
      return;
    }

    setIsSearchingLocation(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`);
        const data = await response.json();
        setLocationResults(data);
      } catch (err) {
        console.error('Error fetching locations:', err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 500);
  };

  const selectLocation = (result: LocationResult) => {
    setNewEvent(prev => ({
      ...prev,
      location: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    }));
    setLocationResults([]);
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
        lat: newEvent.lat || null,
        lng: newEvent.lng || null,
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
      
      setNewEvent({ title: '', description: '', startTime: '', endTime: '', location: '', lat: undefined, lng: undefined, imageUrl: '' });
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
      lat: event.lat,
      lng: event.lng,
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
    setNewEvent({ title: '', description: '', startTime: '', endTime: '', location: '', lat: undefined, lng: undefined, imageUrl: '' });
  };

  return (
    <MainLayout profile={profile}>
      <div className="flex flex-col h-full bg-[#090a1e] overflow-y-auto custom-scrollbar">
        {/* Top Control Bar */}
        <div 
          className="p-4 sm:p-8 shrink-0 relative z-30 border-b border-white/5"
          style={{ background: 'linear-gradient(180deg, #0A0A1A 0%, #190033 100%)' }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 max-w-[1400px] mx-auto w-full">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              {/* Search Box */}
              <div className="relative w-full max-w-full md:max-w-[400px] lg:max-w-[500px] group">
                <input 
                  type="text"
                  placeholder="Search events"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#130628] border border-white/20 rounded-full pl-6 pr-12 py-3 sm:py-4 text-white hover:border-white/40 focus:outline-none focus:border-purple-500/50 transition-all text-sm font-medium"
                />
                <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
              </div>

              {/* Mobile Filter Button */}
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="md:hidden w-12 h-12 shrink-0 flex items-center justify-center bg-[#130628] border border-white/20 rounded-full text-white hover:bg-white/5 active:scale-95 transition-all"
              >
                <div className="flex flex-col gap-1 items-end w-4">
                  <span className="w-full h-[1.5px] bg-gray-400 rounded-full"></span>
                  <span className="w-3/4 h-[1.5px] bg-gray-400 rounded-full"></span>
                  <span className="w-1/2 h-[1.5px] bg-gray-400 rounded-full"></span>
                </div>
              </button>
            </div>

            {/* Desktop Controls */}
            <div className="hidden md:flex items-center gap-4 lg:gap-8">
              {/* Filter Control */}
              <div className="relative" ref={filterRef}>
                <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="w-auto flex items-center justify-center gap-2 px-8 py-4 bg-[#130628] border border-white/5 rounded-full hover:border-purple-500/30 transition-all group whitespace-nowrap"
                >
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-gray-300">Filter By : Location</span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isFilterOpen ? 'rotate-90' : 'md:rotate-0'}`} />
                </button>

                {/* Filter Dropdown Menu */}
                {isFilterOpen && (
                  <div className="absolute top-full mt-2 left-0 lg:left-auto lg:right-0 w-full lg:w-64 bg-[#130628] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {[
                      { icon: MapPin, label: 'Filter by location' },
                      { icon: Users, label: 'Filter by price' },
                      { icon: Users, label: 'Filter by category' },
                      { icon: Calendar, label: 'Filter by Date' }
                    ].map((item, idx) => (
                      <button 
                        key={idx}
                        className={`w-full flex items-center gap-3 px-6 py-4 transition-all text-[13px] font-bold ${
                          idx === 0 ? 'text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                        style={idx === 0 ? { background: 'linear-gradient(90deg, #9700FF 0%, #B95AFB 65.87%)' } : {}}
                      >
                        <item.icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                        {idx === 0 && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Post Event Button (Desktop Only) */}
              {!showForm && profile?.isPro && (
                <button 
                  onClick={() => setShowForm(true)}
                  className="hidden md:flex items-center justify-center gap-2 px-10 py-4 text-white rounded-full font-bold text-[14px] transition-all active:scale-95 whitespace-nowrap"
                  style={{ background: 'linear-gradient(90deg, #9700FF 0%, #B95AFB 65.87%)' }}
                >
                  Post an event
                </button>
              )}
            </div>
          </div>

          {/* Active Filters Row */}
          {activeFilter && (
            <div className="max-w-[1400px] mx-auto w-full flex flex-wrap gap-2 px-1 mt-6">
              <div className="bg-[#1a0b2e] border border-purple-500/30 px-3 py-1.5 rounded-full flex items-center gap-2">
                <span className="text-[11px] font-bold text-white">{activeFilter}</span>
                <button 
                  onClick={() => setActiveFilter('')} 
                  className="text-purple-400 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 px-4 sm:px-8 pt-6 sm:pt-10 pb-32">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
              <p className="text-gray-500 font-bold tracking-widest text-xs uppercase">Gathering Events...</p>
            </div>
          ) : showForm ? (
            <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4">
              {/* Reuse existing form logic */}
              <div className="border border-white/5 rounded-3xl p-8 sm:p-12 space-y-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight text-white">
                      {editingEventId ? 'Refine Event' : 'Host Event'}
                    </h2>
                    <p className="text-gray-500 font-medium">Broadcast your community experience.</p>
                  </div>
                  <button onClick={cancelEdit} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all">
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-sm font-semibold text-gray-400 px-1">Visual Preview</label>
                      <div className="aspect-[4/3] w-full bg-white/5 border-2 border-dashed border-white/10 rounded-3xl overflow-hidden relative group cursor-pointer hover:border-purple-500/50 transition-all">
                        {previewUrl ? (
                          <>
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button type="button" onClick={() => { setImageFile(null); setPreviewUrl(null); }} className="p-4 bg-rose-500 rounded-2xl text-white shadow-xl">
                                <Trash2 className="w-6 h-6" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <label className="absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer">
                            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-500">
                              <Upload className="w-7 h-7" />
                            </div>
                            <span className="text-sm font-medium text-gray-400 text-center px-6">Tap to upload captivating artwork</span>
                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                          </label>
                        )}
                      </div>
                      <input 
                        type="url" 
                        placeholder="Or provide a direct image link..."
                        value={newEvent.imageUrl}
                        onChange={(e) => setNewEvent({ ...newEvent, imageUrl: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-sm font-semibold text-gray-400 px-1">Event Essence</label>
                      <input 
                        required
                        type="text" 
                        placeholder="What's the name?"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none"
                      />
                      <textarea 
                        required
                        placeholder="Paint a picture for the attendees..."
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none h-40 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <label className="text-sm font-semibold text-gray-400 px-1">Commences</label>
                        <div className="flex gap-2">
                          <input 
                            required
                            type="date" 
                            value={newEvent.startTime.split('T')[0] || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              const t = newEvent.startTime.split('T')[1]?.slice(0,5) || '12:00';
                              setNewEvent({ ...newEvent, startTime: v ? `${v}T${t}` : '' });
                            }}
                            className="w-1/2 bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-xs hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none"
                          />
                          <input 
                            required
                            type="time" 
                            value={newEvent.startTime.split('T')[1]?.slice(0,5) || ''}
                            onChange={(e) => {
                              const t = e.target.value;
                              const v = newEvent.startTime.split('T')[0] || new Date().toISOString().split('T')[0];
                              setNewEvent({ ...newEvent, startTime: t ? `${v}T${t}` : '' });
                            }}
                            className="w-1/2 bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-xs hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-sm font-semibold text-gray-400 px-1">Concludes</label>
                        <div className="flex gap-2">
                          <input 
                            required
                            type="date" 
                            value={newEvent.endTime.split('T')[0] || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              const t = newEvent.endTime.split('T')[1]?.slice(0,5) || '14:00';
                              setNewEvent({ ...newEvent, endTime: v ? `${v}T${t}` : '' });
                            }}
                            className="w-1/2 bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-xs hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none"
                          />
                          <input 
                            required
                            type="time" 
                            value={newEvent.endTime.split('T')[1]?.slice(0,5) || ''}
                            onChange={(e) => {
                              const t = e.target.value;
                              const v = newEvent.endTime.split('T')[0] || new Date().toISOString().split('T')[0];
                              setNewEvent({ ...newEvent, endTime: t ? `${v}T${t}` : '' });
                            }}
                            className="w-1/2 bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-xs hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 relative">
                      <label className="text-sm font-semibold text-gray-400 px-1">Venue</label>
                      <div className="relative">
                        <input 
                          required
                          type="text" 
                          placeholder="Search for a location..."
                          value={newEvent.location}
                          onChange={(e) => handleLocationSearch(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white hover:bg-white/10 focus:border-purple-500/50 transition-all outline-none"
                        />
                        {isSearchingLocation && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Autocomplete Dropdown */}
                      {!forceHideDropdown && (locationResults.length > 0 || (newEvent.location.trim() && !isSearchingLocation && locationResults.length === 0)) && (
                        <div className="absolute top-[88px] left-0 w-full bg-[#130628] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-60 overflow-y-auto">
                          {locationResults.length > 0 ? (
                            locationResults.map((result) => (
                              <button
                                key={result.place_id}
                                type="button"
                                onClick={() => {
                                  selectLocation(result);
                                  setForceHideDropdown(true);
                                }}
                                className="w-full text-left px-6 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                              >
                                <div className="flex items-start gap-3">
                                  <MapPin className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0" />
                                  <span className="text-sm text-gray-300 line-clamp-2">{result.display_name}</span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-6 py-4 text-sm text-gray-400">
                              <span className="block font-medium text-white mb-2">No exact match for "{newEvent.location}"</span>
                              <p className="mb-4">You can still use this location without a map. Or, to drop a pin, search for your city first, click it, and then edit this text.</p>
                              <button 
                                type="button"
                                onClick={() => setForceHideDropdown(true)}
                                className="w-full py-2.5 bg-purple-500/10 text-purple-400 font-bold rounded-xl hover:bg-purple-500/20 transition-colors border border-purple-500/20"
                              >
                                Use "{newEvent.location}" Anyway
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Map Preview */}
                      {newEvent.lat && newEvent.lng && (
                        <div className="h-48 w-full rounded-2xl overflow-hidden border border-white/10 relative z-0 mt-4 animate-in fade-in slide-in-from-bottom-2">
                          <MapContainer 
                            center={[newEvent.lat, newEvent.lng]} 
                            zoom={14} 
                            style={{ height: '100%', width: '100%' }}
                            key={`${newEvent.lat}-${newEvent.lng}`}
                          >
                            <TileLayer
                              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                            />
                            <Marker position={[newEvent.lat, newEvent.lng]} />
                          </MapContainer>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex gap-4">
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-5 bg-gradient-to-r from-[#9700FF] to-[#B95AFB] text-white rounded-2xl font-bold transition-all text-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingEventId ? 'Update Event' : 'Launch Event'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 max-w-[1400px] mx-auto gap-4 sm:gap-8 pb-20">
              {filteredEvents.map((event) => (
                <div key={event.id} className="flex flex-col rounded-none overflow-hidden bg-[#222222] group hover:border-purple-500/20 transition-all duration-500 border border-transparent">
                  {/* Event Image */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {event.imageUrl ? (
                      <img 
                        src={event.imageUrl} 
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-900/60 to-indigo-900/60 flex items-center justify-center">
                        <Calendar className="w-12 h-12 text-white/10" />
                      </div>
                    )}
                    
                    {/* Admin Actions Overlay */}
                    {auth.currentUser?.uid === event.creatorId && (
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(event)}
                          className="p-2.5 bg-black/40 backdrop-blur-md rounded-xl hover:bg-purple-600 transition-all text-white border border-white/10"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2.5 bg-black/40 backdrop-blur-md rounded-xl hover:bg-rose-600 transition-all text-white border border-white/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Event Info */}
                  <div className="p-3 sm:p-5 flex flex-col flex-1">
                    <div className="space-y-1 sm:space-y-2">
                      <h3 className="text-[10px] sm:text-base font-bold text-white tracking-tight line-clamp-1">{event.title}</h3>
                      <p className="text-[8px] sm:text-sm text-gray-400 font-medium leading-relaxed line-clamp-3 sm:line-clamp-2">
                        {event.description}
                      </p>
                    </div>

                    <div className="mt-auto pt-3 sm:pt-4 space-y-3 sm:space-y-5">
                      <div className="text-[8px] sm:text-xs font-medium text-gray-400 tracking-wide flex items-center gap-1.5 sm:gap-2">
                        <span>{event.startTime?.toDate ? event.startTime.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(event.startTime).toDateString()}</span>
                        <span className="opacity-30">|</span>
                        <span>{event.startTime?.toDate ? event.startTime.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(' ', '')}</span>
                      </div>

                      {event.lat && event.lng && (
                        <div className="h-32 w-full rounded-2xl overflow-hidden mt-2 relative z-0 border border-white/5">
                          <MapContainer 
                            center={[event.lat, event.lng]} 
                            zoom={13} 
                            style={{ height: '100%', width: '100%' }}
                            dragging={false} zoomControl={false} scrollWheelZoom={false} doubleClickZoom={false}
                          >
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                            <Marker position={[event.lat, event.lng]} />
                          </MapContainer>
                        </div>
                      )}

                      <div className="flex items-center">
                        <button 
                          onClick={() => handleJoinEvent(event.id)}
                          disabled={event.attendees?.includes(auth.currentUser?.uid || '')}
                          className={`px-4 sm:px-8 py-1.5 sm:py-3 rounded-full text-[8px] sm:text-xs font-semibold transition-all active:scale-[0.98] border ${
                            event.attendees?.includes(auth.currentUser?.uid || '')
                            ? 'border-green-500/50 text-green-400 bg-green-500/5 cursor-default'
                            : 'border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white'
                          }`}
                        >
                          {event.attendees?.includes(auth.currentUser?.uid || '') ? 'Registered' : 'Register for event'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Button (Mobile Only) */}
        {!showForm && profile?.isPro && (
          <button 
            onClick={() => setShowForm(true)}
            className="md:hidden fixed bottom-24 right-6 px-6 py-3.5 bg-gradient-to-r from-[#9700FF] to-[#B95AFB] text-white rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/40 active:scale-90 transition-transform z-40 font-bold text-sm tracking-wide"
          >
            Create an event
          </button>
        )}
      </div>
    </MainLayout>
  );
}

