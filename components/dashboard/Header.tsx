"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Bell, Settings, LogOut, User } from "lucide-react";
import { getInitials, timeAgo } from "@/lib/utils";
import { useState, useEffect } from "react";

interface Notification {
    id: string | number;
    title: string;
    desc: string;
    time: string;
    read: boolean;
}

const pageTitles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/dashboard/jobs": "Job Postings",
    "/dashboard/candidates": "Candidates",
    "/dashboard/schedules": "Schedules & Interviews",
    "/dashboard/settings": "Settings",
};

export function Header() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!user) return;
        fetch("/api/invites")
            .then(res => res.json())
            .then(data => {
                const invites = data.invites || [];
                // Sort by newest first
                invites.sort((a: any, b: any) => new Date(b.invite.created_at).getTime() - new Date(a.invite.created_at).getTime());

                const recents = invites.slice(0, 5).map((i: any) => ({
                    id: i.invite.id,
                    title: `Invite ${i.invite.status}`,
                    desc: `${i.candidate.full_name} - ${i.job.title}`,
                    time: i.invite.created_at,
                    read: i.invite.status === "completed"
                }));
                setNotifications(recents);
            })
            .catch(err => console.error("Failed to fetch notifications:", err));
    }, [user]);

    const unreadCount = notifications.filter((n: Notification) => !n.read).length;

    const markAllRead = () => {
        setNotifications(notifications.map((n: Notification) => ({ ...n, read: true })));
    };

    const title = pageTitles[pathname] || "Dashboard";

    return (
        <header className="h-16 flex items-center justify-between px-6 border-b border-[#1e1e2e] bg-[#111118]">
            <h1 className="text-lg font-bold text-white">{title}</h1>

            <div className="flex items-center gap-3">
                {/* Notification bell */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setNotificationsOpen(!notificationsOpen);
                            if (menuOpen) setMenuOpen(false);
                        }}
                        className="relative p-2 rounded-lg text-[#8b8b9e] hover:text-white hover:bg-[#1e1e2e] transition-colors"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6c47ff]" />}
                    </button>

                    {notificationsOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setNotificationsOpen(false)} />
                            <div className="absolute right-0 top-12 w-80 bg-[#111118] border border-[#1e1e2e] rounded-xl shadow-xl z-20 overflow-hidden flex flex-col max-h-[400px]">
                                <div className="px-4 py-3 border-b border-[#1e1e2e] flex items-center justify-between bg-[#0a0a0f]">
                                    <p className="text-sm font-bold text-white">Notifications</p>
                                    {unreadCount > 0 && (
                                        <button onClick={markAllRead} className="text-xs text-[#6c47ff] hover:text-purple-400 transition-colors">
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                    {notifications.length === 0 ? (
                                        <div className="text-center py-6 text-[#8b8b9e]">
                                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">No notifications</p>
                                        </div>
                                    ) : (
                                        notifications.map((n: Notification) => (
                                            <div key={n.id} className={`p-3 rounded-lg flex flex-col gap-1 transition-colors ${n.read ? "bg-transparent hover:bg-[#1e1e2e]/50" : "bg-[#6c47ff]/5 border border-[#6c47ff]/10 hover:bg-[#6c47ff]/10"}`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={`text-sm font-medium ${n.read ? "text-[#e2e2ef]" : "text-white"}`}>{n.title}</p>
                                                    <span className="text-[10px] text-[#8b8b9e] whitespace-nowrap">{timeAgo(n.time)}</span>
                                                </div>
                                                <p className="text-xs text-[#8b8b9e] leading-relaxed">{n.desc}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* User avatar + dropdown */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setMenuOpen(!menuOpen);
                            if (notificationsOpen) setNotificationsOpen(false);
                        }}
                        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-[#1e1e2e] transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {user ? getInitials(user.full_name) : "?"}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-medium text-white leading-tight">{user?.full_name}</p>
                            <p className="text-xs text-[#8b8b9e]">{user?.role}</p>
                        </div>
                    </button>

                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                            <div className="absolute right-0 top-12 w-52 bg-[#111118] border border-[#1e1e2e] rounded-xl shadow-xl z-20 py-1">
                                <div className="px-4 py-3 border-b border-[#1e1e2e]">
                                    <p className="text-sm font-medium text-white">{user?.full_name}</p>
                                    <p className="text-xs text-[#8b8b9e] truncate">{user?.email}</p>
                                </div>
                                <a href="/dashboard/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#8b8b9e] hover:text-white hover:bg-[#1e1e2e] transition-colors">
                                    <User className="w-4 h-4" /> Profile
                                </a>
                                <a href="/dashboard/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#8b8b9e] hover:text-white hover:bg-[#1e1e2e] transition-colors">
                                    <Settings className="w-4 h-4" /> Settings
                                </a>
                                <div className="border-t border-[#1e1e2e] mt-1 pt-1">
                                    <button
                                        onClick={async () => { await logout(); window.location.href = "/sign-in"; }}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-[#1e1e2e] transition-colors w-full"
                                    >
                                        <LogOut className="w-4 h-4" /> Sign Out
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
