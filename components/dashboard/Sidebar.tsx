"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard, Briefcase, Users, Calendar, Settings,
    ChevronLeft, ChevronRight, LogOut, Zap, CreditCard,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

const navItems = [
    { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
    { icon: Briefcase, label: "Jobs", href: "/dashboard/jobs" },
    { icon: Users, label: "Candidates", href: "/dashboard/candidates" },
    { icon: Calendar, label: "Schedules", href: "/dashboard/schedules" },
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        toast.success("Signed out");
        router.push("/sign-in");
    };

    return (
        <aside
            className={cn(
                "flex flex-col h-full bg-[#111118] border-r border-[#1e1e2e] transition-all duration-300",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo */}
            <div className={cn("h-16 flex items-center border-b border-[#1e1e2e] px-4", collapsed ? "justify-center" : "gap-3")}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                {!collapsed && <span className="font-bold text-white text-sm">HireFlow AI</span>}
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map(item => {
                    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                collapsed ? "justify-center" : "",
                                active
                                    ? "bg-[#6c47ff]/15 text-[#6c47ff] border border-[#6c47ff]/20"
                                    : "text-[#8b8b9e] hover:text-white hover:bg-[#1e1e2e]"
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            {!collapsed && item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Upgrade (expanded only) */}
            {!collapsed && (
                <div className="px-3 pb-2">
                    <div className="rounded-lg bg-gradient-to-br from-[#6c47ff]/10 to-purple-600/5 border border-[#6c47ff]/20 p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="w-4 h-4 text-[#6c47ff]" />
                            <span className="text-xs font-semibold text-white">Free Plan</span>
                        </div>
                        <p className="text-xs text-[#8b8b9e] mb-3">Upgrade to Pro for unlimited interviews</p>
                        <button className="w-full py-1.5 rounded-md bg-gradient-to-r from-[#6c47ff] to-purple-600 text-xs font-semibold text-white hover:opacity-90 transition-opacity">
                            Upgrade Plan
                        </button>
                    </div>
                </div>
            )}

            {/* User footer */}
            <div className={cn("border-t border-[#1e1e2e] p-3", collapsed ? "flex justify-center" : "")}>
                {collapsed ? (
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg text-[#8b8b9e] hover:text-red-400 hover:bg-[#1e1e2e] transition-colors"
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {user ? getInitials(user.full_name) : "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                            <p className="text-xs text-[#8b8b9e] truncate">{user?.email}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-1.5 rounded-md text-[#8b8b9e] hover:text-red-400 hover:bg-[#1e1e2e] transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Collapse toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute bottom-20 -right-3 w-6 h-6 rounded-full bg-[#111118] border border-[#1e1e2e] flex items-center justify-center text-[#8b8b9e] hover:text-white transition-colors z-10"
            >
                {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
        </aside>
    );
}
