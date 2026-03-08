"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Bell, Settings, LogOut, User } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useState } from "react";

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

    const title = pageTitles[pathname] || "Dashboard";

    return (
        <header className="h-16 flex items-center justify-between px-6 border-b border-[#1e1e2e] bg-[#111118]">
            <h1 className="text-lg font-bold text-white">{title}</h1>

            <div className="flex items-center gap-3">
                {/* Notification bell */}
                <button className="relative p-2 rounded-lg text-[#8b8b9e] hover:text-white hover:bg-[#1e1e2e] transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6c47ff]" />
                </button>

                {/* User avatar + dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
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
