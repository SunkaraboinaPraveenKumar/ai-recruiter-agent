"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Users, Calendar, TrendingUp, Plus, ArrowRight, Zap, CheckCircle, UserPlus, Clock } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface Stats {
    activeJobs: number;
    totalCandidates: number;
    interviewsSent: number;
    screeningRate: number;
}

interface ActivityEvent {
    id: string;
    type: "job_created" | "candidate_added" | "invite_sent" | "interview_completed";
    description: string;
    timestamp: string;
}

const activityIcons = {
    job_created: Briefcase,
    candidate_added: UserPlus,
    invite_sent: Calendar,
    interview_completed: CheckCircle,
};

const activityColors = {
    job_created: "text-blue-400 bg-blue-400/10",
    candidate_added: "text-purple-400 bg-purple-400/10",
    invite_sent: "text-yellow-400 bg-yellow-400/10",
    interview_completed: "text-green-400 bg-green-400/10",
};

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [activity, setActivity] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, activityRes] = await Promise.all([
                    fetch("/api/dashboard/stats"),
                    fetch("/api/dashboard/activity"),
                ]);
                if (statsRes.ok) setStats(await statsRes.json());
                if (activityRes.ok) {
                    const data = await activityRes.json();
                    setActivity(data.events || []);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const statCards = [
        { label: "Active Jobs", value: stats?.activeJobs ?? 0, icon: Briefcase, color: "text-[#6c47ff]", bg: "bg-[#6c47ff]/10" },
        { label: "Total Candidates", value: stats?.totalCandidates ?? 0, icon: Users, color: "text-purple-400", bg: "bg-purple-400/10" },
        { label: "Interviews Sent", value: stats?.interviewsSent ?? 0, icon: Calendar, color: "text-indigo-400", bg: "bg-indigo-400/10" },
        { label: "Screening Rate", value: `${stats?.screeningRate ?? 0}%`, icon: TrendingUp, color: "text-green-400", bg: "bg-green-400/10" },
    ];

    return (
        <div className="space-y-8 max-w-7xl">
            {/* Welcome */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Welcome back! 👋</h2>
                    <p className="text-[#8b8b9e] text-sm mt-1">Here&apos;s what&apos;s happening with your recruiting pipeline.</p>
                </div>
                <div className="hidden md:flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-400/10 border border-green-400/20">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-green-400 font-medium">AI Active</span>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(card => (
                    <div key={card.label} className="card">
                        {loading ? (
                            <div className="animate-pulse space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-[#1e1e2e]" />
                                <div className="h-8 w-16 bg-[#1e1e2e] rounded" />
                                <div className="h-4 w-24 bg-[#1e1e2e] rounded" />
                            </div>
                        ) : (
                            <>
                                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                                    <card.icon className={`w-5 h-5 ${card.color}`} />
                                </div>
                                <p className="text-3xl font-bold text-white">{card.value}</p>
                                <p className="text-sm text-[#8b8b9e] mt-1">{card.label}</p>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Activity Feed */}
                <div className="lg:col-span-2">
                    <div className="card">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-semibold text-white">Recent Activity</h3>
                            <Clock className="w-4 h-4 text-[#8b8b9e]" />
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 animate-pulse">
                                        <div className="w-9 h-9 rounded-xl bg-[#1e1e2e] shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-4 bg-[#1e1e2e] rounded w-3/4" />
                                            <div className="h-3 bg-[#1e1e2e] rounded w-1/3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : activity.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-2xl bg-[#1e1e2e] flex items-center justify-center mx-auto mb-4">
                                    <Zap className="w-8 h-8 text-[#8b8b9e]" />
                                </div>
                                <p className="text-[#8b8b9e] text-sm">No activity yet. Start by posting a job!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activity.map(event => {
                                    const Icon = activityIcons[event.type];
                                    const colorClass = activityColors[event.type];
                                    return (
                                        <div key={event.id} className="flex items-start gap-3">
                                            <div className={`w-9 h-9 rounded-xl ${colorClass} flex items-center justify-center shrink-0`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-[#e2e2ef]">{event.description}</p>
                                                <p className="text-xs text-[#8b8b9e] mt-0.5">{timeAgo(event.timestamp)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <div className="card">
                        <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <Link href="/dashboard/jobs"
                                className="flex items-center gap-3 p-3 rounded-lg border border-[#1e1e2e] hover:border-[#6c47ff]/30 hover:bg-[#6c47ff]/5 transition-all group">
                                <div className="w-9 h-9 rounded-lg bg-[#6c47ff]/10 flex items-center justify-center">
                                    <Plus className="w-5 h-5 text-[#6c47ff]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white">Post New Job</p>
                                    <p className="text-xs text-[#8b8b9e]">AI generates description</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-[#8b8b9e] group-hover:text-[#6c47ff] transition-colors" />
                            </Link>

                            <Link href="/dashboard/candidates"
                                className="flex items-center gap-3 p-3 rounded-lg border border-[#1e1e2e] hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group">
                                <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <UserPlus className="w-5 h-5 text-purple-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white">Add Candidate</p>
                                    <p className="text-xs text-[#8b8b9e]">Upload resume or manual entry</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-[#8b8b9e] group-hover:text-purple-400 transition-colors" />
                            </Link>

                            <Link href="/dashboard/schedules"
                                className="flex items-center gap-3 p-3 rounded-lg border border-[#1e1e2e] hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group">
                                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white">View Schedules</p>
                                    <p className="text-xs text-[#8b8b9e]">See all interviews</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-[#8b8b9e] group-hover:text-indigo-400 transition-colors" />
                            </Link>
                        </div>
                    </div>

                    {/* AI tip card */}
                    <div className="card bg-gradient-to-br from-[#6c47ff]/10 to-purple-600/5 border-[#6c47ff]/20">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-[#6c47ff]" />
                            <span className="text-xs font-semibold text-[#6c47ff]">AI TIP</span>
                        </div>
                        <p className="text-sm text-[#e2e2ef] mb-3">
                            Upload candidate resumes and let AI extract structured profiles automatically.
                        </p>
                        <Link href="/dashboard/candidates" className="text-xs text-[#6c47ff] hover:text-purple-400 font-medium transition-colors flex items-center gap-1">
                            Try Resume Parser <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
