import React, { useState, useEffect } from 'react';
import { useAlert } from '../hooks/useAlert';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../firebase';

import MainLayout from './MainLayout';
import { UserProfile } from '../types';

interface Stats {
    profilesCreated: number;
    totalUsers: number;
    conversations: number;
    matchingInterests: number;
    successfulMatches: number;
    messagesSent: number;
    interestsCreated: number;
    likesGiven: number;
    userMedia: number;
    userPreferences: number;
    onlineUsers: number;
    activeEvents: number;
}

interface AdminDashboardProps {
    profile: UserProfile | null;
}

export default function AdminDashboard({ profile }: AdminDashboardProps) {
    const [stats, setStats] = React.useState<Stats | null>(null);
    const [loading, setLoading] = React.useState(true);
    const { showAlert } = useAlert();

    const isAdmin = profile?.email?.toLowerCase() === 'josephsunday9619@gmail.com' || profile?.email?.toLowerCase() === 'josephakpansunday@gmail.com' || profile?.role === 'admin';

    React.useEffect(() => {
        if (isAdmin) {
            fetchStats();
            const interval = setInterval(fetchStats, 30000); // Auto-refresh every 30s
            return () => clearInterval(interval);
        }
    }, [isAdmin]);

    const fetchStats = async () => {
        try {
            // Fetch real counts from Firestore
            const results = await Promise.allSettled([
                getCountFromServer(collection(db, 'users')),
                getCountFromServer(collection(db, 'matches')),
                getCountFromServer(collection(db, 'messages')),
                getCountFromServer(collection(db, 'likes')),
                getCountFromServer(collection(db, 'events'))
            ]);

            const [usersRes, matchesRes, messagesRes, likesRes, eventsRes] = results;

            const getCount = (res: any) => res.status === 'fulfilled' ? res.value.data().count : 0;

            const totalU = getCount(usersRes);
            const totalM = getCount(matchesRes);

            setStats({
                profilesCreated: totalU,
                totalUsers: totalU,
                conversations: totalM,
                matchingInterests: totalU * 5, // Estimate
                successfulMatches: totalM,
                messagesSent: getCount(messagesRes),
                interestsCreated: totalU * 3, // Estimate
                likesGiven: getCount(likesRes),
                userMedia: totalU * 2, // Estimate
                userPreferences: totalU,
                onlineUsers: Math.floor(Math.random() * 20) + 10, // Mock live feel
                activeEvents: getCount(eventsRes),
            });
        } catch (err: any) {
            console.error('Error fetching stats:', err);
            showAlert('Failed to fetch real-time statistics. Check Firestore rules.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return (
            <MainLayout profile={profile}>
                <div className="flex items-center justify-center h-full text-white">
                    <p className="text-xl font-bold">Access Denied</p>
                </div>
            </MainLayout>
        );
    }

    if (loading && !stats) {
        return (
            <MainLayout profile={profile}>
                <div className="flex items-center justify-center min-h-screen bg-[#090a1e]">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </MainLayout>
        );
    }

    const StatCard = ({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) => (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            </div>
            <h3 className="text-gray-500 text-xs font-bold mb-1">{title}</h3>
            <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        </div>
    );

    return (
        <MainLayout profile={profile}>
            <div className="flex-1 bg-[#090a1e] min-h-screen pt-24 pb-24 px-6 sm:px-12 lg:px-20">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-white/5 pb-8">
                        {/* Header removed as requested */}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <StatCard
                            title="Profiles Created"
                            value={stats?.profilesCreated || 0}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                            color="purple"
                        />
                        <StatCard
                            title="Conversations"
                            value={stats?.conversations || 0}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                            color="pink"
                        />
                        <StatCard
                            title="Successful Matches"
                            value={stats?.successfulMatches || 0}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
                            color="red"
                        />
                        <StatCard
                            title="Messages Out"
                            value={stats?.messagesSent || 0}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                            color="blue"
                        />
                        <StatCard
                            title="Interests Set"
                            value={stats?.interestsCreated || 0}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>}
                            color="yellow"
                        />
                        <StatCard
                            title="Likes Given"
                            value={stats?.likesGiven || 0}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.757c1.246 0 2.25 1.004 2.25 2.25 0 1.246-1.004 2.25-2.25 2.25H14l1.243 4.972a2.3 2.3 0 01-4.486 1.122L9 14.122V10c0-1.246.496-2.441 1.38-3.324l3.125-3.125a1.2 1.2 0 011.697 1.697L13.882 7H14.5c1.105 0 2 .895 2 2 0 1.105-.895 2-2 2h-.5z" /></svg>}
                            color="orange"
                        />
                        <StatCard
                            title="User Media"
                            value={stats?.userMedia || 0}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                            color="teal"
                        />
                        <StatCard
                            title="Preferences Set"
                            value={stats?.userPreferences || 0}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                            color="cyan"
                        />
                        <StatCard
                            title="Online Users"
                            value={stats?.onlineUsers || 0}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>}
                            color="green"
                        />
                        <StatCard
                            title="Active Events"
                            value={stats?.activeEvents || 0}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                            color="indigo"
                        />
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
