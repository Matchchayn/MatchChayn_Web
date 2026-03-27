import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAlert } from '../hooks/useAlert';
import { 
  getNotifications, 
  markNotificationsRead, 
  deleteNotification as deleteNotifRecord, 
  clearAllNotifications,
  Notification 
} from '../utils/notificationService';
import { Trash2, Bell, X, Loader2 } from 'lucide-react';

interface NotificationModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
    const { showAlert, showConfirm } = useAlert()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let unsubscribe = () => {};
        
        if (isOpen) {
            setLoading(true);
            unsubscribe = getNotifications((data) => {
                setNotifications(data);
                setLoading(false);
                
                // Mark all as read when opening the modal
                if (data.some(n => !n.isRead)) {
                    markNotificationsRead();
                }
            });
        }

        return () => unsubscribe();
    }, [isOpen]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteNotifRecord(id);
        } catch (err: any) {
            showAlert(`Failed to delete: ${err.message}`, 'error');
        }
    }

    const handleClearAll = async () => {
        const confirmed = await showConfirm(
            'Clear all notifications?', 
            'This action cannot be undone.', 
            'Clear All'
        );
        if (!confirmed) return;
        
        try {
            await clearAllNotifications();
            showAlert('All notifications cleared', 'success');
        } catch (err: any) {
            console.error('Error clearing notifications:', err);
            showAlert(`Failed to clear: ${err.message}`, 'error');
        }
    }

    if (!isOpen) return null

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 w-[calc(100vw-2rem)] sm:w-[400px] z-[160] bg-[#0d0d1f] rounded-2xl overflow-hidden animate-in slide-in-from-right-8 fade-in duration-500"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                            <Bell className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-none">Notifications</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Real-time alerts</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {notifications.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                className="text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-widest bg-purple-500/10 px-3 py-1.5 rounded-xl transition-all active:scale-95 border border-purple-500/20"
                            >
                                Clear All
                            </button>
                        )}
                        <button onClick={onClose} className="p-2.5 hover:bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all active:scale-90">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    {loading && notifications.length === 0 ? (
                        <div className="p-20 flex flex-col items-center justify-center text-center">
                            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                            <p className="text-gray-400 text-sm font-medium">Syncing your feed...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-20 text-center flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-purple-500/5 rounded-full flex items-center justify-center mb-6">
                                <Bell className="w-10 h-10 text-purple-500/20" />
                            </div>
                            <h4 className="text-white font-bold mb-2">Staying Quiet</h4>
                            <p className="text-gray-500 text-xs max-w-[200px] mx-auto leading-relaxed">
                                No new activities found. We'll ping you as soon as something happens!
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {notifications.map((notif) => (
                                <div 
                                    key={notif._id} 
                                    className={`p-5 flex items-start gap-4 hover:bg-white/[0.03] transition-all group relative ${!notif.isRead ? 'bg-purple-500/[0.03]' : ''}`}
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-purple-500/20 border border-white/10 ring-2 ring-transparent group-hover:ring-purple-500/30 transition-all">
                                            {(() => {
                                                const pfp = notif.sender.avatarUrl || 
                                                           notif.sender.media?.find(m => m.type === 'image')?.url || 
                                                           notif.sender.media?.[0]?.url ||
                                                           `https://picsum.photos/seed/${notif.sender.uid || notif.sender.firstName || 'user'}/100/100`;
                                                
                                                return (
                                                    <img 
                                                        src={pfp} 
                                                        alt="" 
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${notif.sender.firstName}&background=a855f7&color=fff`;
                                                        }}
                                                    />
                                                );
                                            })()}
                                        </div>
                                        {!notif.isRead && (
                                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-purple-500 rounded-full border-2 border-[#0d0d1f] shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 pr-8">
                                                <p className="text-white text-sm leading-snug">
                                                    <span className="font-bold text-purple-400">{notif.sender.firstName}</span>
                                                    <span className="text-gray-300">
                                                        {notif.type === 'like' && ' liked your profile.'}
                                                        {notif.type === 'match' && " matched with you! Start a chat. "}
                                                        {notif.type === 'message' && ' sent you a new message.'}
                                                    </span>
                                                </p>
                                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mt-2.5 flex items-center gap-2">
                                                    {notif.createdAt?.toDate 
                                                        ? notif.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                        : 'Just now'}
                                                    <span className="w-1 h-1 bg-gray-800 rounded-full"></span>
                                                    {notif.createdAt?.toDate 
                                                        ? notif.createdAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })
                                                        : ''}
                                                </p>
                                            </div>
                                            
                                            <button
                                                onClick={(e) => handleDelete(notif._id, e)}
                                                className="absolute top-5 right-5 p-2 bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-xl transition-all active:scale-90 opacity-60 group-hover:opacity-100 shadow-lg"
                                                title="Delete notification"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/5 bg-[#0d0d1f]">
                    <button 
                        onClick={onClose} 
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                    >
                        Dismiss Modal <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                    </button>
                </div>
            </div>
        </>,
        document.body
    )
}
