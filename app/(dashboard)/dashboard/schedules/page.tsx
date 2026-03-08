"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Calendar, Search, Filter, ChevronRight } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";

interface InviteRow {
    invite: {
        id: string;
        status: string;
        interview_type: string;
        created_at: string;
        expires_at: string;
    };
    candidate: { id: string; full_name: string; email: string; current_role?: string | null };
    job: { id: string; title: string };
}

interface Session {
    id: string;
    candidate_name: string;
    overall_score?: number | null;
    communication_score?: number | null;
    technical_score?: number | null;
    strengths?: string[] | null;
    concerns?: string[] | null;
    ai_summary?: string | null;
    ai_recommendation?: string | null;
    key_highlights?: string[] | null;
    transcript?: Array<{ role: string; text: string; timestamp: string }> | null;
    completed_at?: string | null;
    questions_answered: number;
    total_questions: number;
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    completed: "bg-green-500/10 text-green-400 border border-green-500/20",
    expired: "bg-[#1e1e2e] text-[#8b8b9e]",
    accepted: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
};

const recoColors: Record<string, string> = {
    strong_yes: "bg-green-500/10 text-green-400 border border-green-500/20",
    yes: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    maybe: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    no: "bg-red-500/10 text-red-400 border border-red-500/20",
};

const recoLabels: Record<string, string> = {
    strong_yes: "Strong Yes ✨",
    yes: "Yes ✓",
    maybe: "Maybe ⚡",
    no: "No ✗",
};

function ScoreGauge({ value, label, color }: { value: number; label: string; color: string }) {
    return (
        <div className="text-center">
            <div className="relative w-24 h-24 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={8} data={[{ value, fill: color }]} startAngle={90} endAngle={-270}>
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar background={{ fill: "#1e1e2e" }} dataKey="value" cornerRadius={4} />
                    </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">{value}</span>
                </div>
            </div>
            <p className="text-xs text-[#8b8b9e] mt-1">{label}</p>
        </div>
    );
}

export default function SchedulesPage() {
    const [invites, setInvites] = useState<InviteRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selected, setSelected] = useState<InviteRow | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [sessionLoading, setSessionLoading] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);

    useEffect(() => {
        fetch("/api/invites").then(r => r.json()).then(d => {
            setInvites(d.invites || []);
            setLoading(false);
        });
    }, []);

    const handleSelectInvite = async (row: InviteRow) => {
        setSelected(row);
        setSession(null);
        if (row.invite.status !== "completed") return;
        setSessionLoading(true);
        try {
            const res = await fetch(`/api/interview/${row.invite.id}/session`);
            if (res.ok) {
                const data = await res.json();
                setSession(data.session);
            }
        } finally {
            setSessionLoading(false);
        }
    };

    const filtered = invites.filter(i => {
        const matchSearch = i.candidate.full_name.toLowerCase().includes(search.toLowerCase()) ||
            i.job.title.toLowerCase().includes(search.toLowerCase());
        const matchType = typeFilter === "all" || i.invite.interview_type === typeFilter;
        const matchStatus = statusFilter === "all" || i.invite.status === statusFilter;
        return matchSearch && matchType && matchStatus;
    });

    const stats = {
        total: invites.length,
        completed: invites.filter(i => i.invite.status === "completed").length,
        pending: invites.filter(i => i.invite.status === "pending").length,
        avgScore: (() => {
            // We don't have scores at this level easily, return 0
            return 0;
        })(),
    };

    return (
        <div className="space-y-5 max-w-7xl">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: "Total Invites", val: stats.total, color: "text-white" },
                    { label: "Completed", val: stats.completed, color: "text-green-400" },
                    { label: "Pending", val: stats.pending, color: "text-yellow-400" },
                    { label: "Completion Rate", val: stats.total ? `${Math.round((stats.completed / stats.total) * 100)}%` : "0%", color: "text-[#6c47ff]" },
                ].map(s => (
                    <div key={s.label} className="card py-3">
                        <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                        <p className="text-xs text-[#8b8b9e] mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-5 gap-5" style={{ minHeight: "60vh" }}>
                {/* Left: Invite List */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8b9e]" />
                        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search..." />
                    </div>

                    <div className="flex gap-2">
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field text-xs py-1.5 flex-1">
                            <option value="all">All Types</option>
                            <option value="screening">Screening</option>
                            <option value="technical">Technical</option>
                            <option value="hr_final">HR Final</option>
                        </select>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field text-xs py-1.5 flex-1">
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>

                    <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                        {loading ? (
                            [...Array(5)].map((_, i) => <div key={i} className="card animate-pulse h-20" />)
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-12">
                                <Calendar className="w-10 h-10 text-[#8b8b9e] mx-auto mb-2" />
                                <p className="text-sm text-[#8b8b9e]">No invites found</p>
                            </div>
                        ) : filtered.map(row => (
                            <div
                                key={row.invite.id}
                                onClick={() => handleSelectInvite(row)}
                                className={`card cursor-pointer transition-all hover:border-[#6c47ff]/30 ${selected?.invite.id === row.invite.id ? "border-[#6c47ff]/50 bg-[#6c47ff]/5" : ""}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {row.candidate.full_name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{row.candidate.full_name}</p>
                                        <p className="text-xs text-[#8b8b9e] truncate">{row.job.title}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[row.invite.status]}`}>{row.invite.status}</span>
                                        <p className="text-xs text-[#8b8b9e] mt-1">{timeAgo(row.invite.created_at)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Results Panel */}
                <div className="lg:col-span-3">
                    {!selected ? (
                        <div className="card h-full flex items-center justify-center text-center py-20">
                            <div>
                                <Calendar className="w-12 h-12 text-[#8b8b9e] mx-auto mb-3" />
                                <p className="text-[#8b8b9e] text-sm">Select an invite to view details</p>
                            </div>
                        </div>
                    ) : selected.invite.status !== "completed" ? (
                        <div className="card">
                            <h3 className="font-bold text-white mb-2">{selected.candidate.full_name}</h3>
                            <p className="text-sm text-[#8b8b9e]">{selected.job.title}</p>
                            <div className="mt-4 p-4 rounded-xl bg-[#0a0a0f]">
                                <p className="text-sm text-[#8b8b9e]">
                                    Status: <span className={`px-2 py-0.5 rounded-full text-xs ml-1 ${statusColors[selected.invite.status]}`}>{selected.invite.status}</span>
                                </p>
                                {selected.invite.status === "pending" && (
                                    <p className="text-xs text-[#8b8b9e] mt-2">
                                        Interview link expires: {new Date(selected.invite.expires_at).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : sessionLoading ? (
                        <div className="card animate-pulse space-y-4">
                            {[...Array(6)].map((_, i) => <div key={i} className="h-6 bg-[#1e1e2e] rounded" />)}
                        </div>
                    ) : session ? (
                        <div className="card space-y-6 overflow-y-auto max-h-[70vh]">
                            <div>
                                <h3 className="font-bold text-white text-lg">{session.candidate_name}</h3>
                                <p className="text-sm text-[#8b8b9e]">{selected.job.title}</p>
                            </div>

                            {/* Scores */}
                            <div className="flex justify-around">
                                <ScoreGauge value={session.overall_score || 0} label="Overall" color="#6c47ff" />
                                <ScoreGauge value={session.communication_score || 0} label="Communication" color="#a855f7" />
                                <ScoreGauge value={session.technical_score || 0} label="Technical" color="#3b82f6" />
                            </div>

                            {/* Recommendation */}
                            {session.ai_recommendation && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[#8b8b9e]">AI Recommendation</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${recoColors[session.ai_recommendation]}`}>
                                        {recoLabels[session.ai_recommendation] || session.ai_recommendation}
                                    </span>
                                </div>
                            )}

                            {/* Summary */}
                            {session.ai_summary && (
                                <div>
                                    <p className="text-xs text-[#8b8b9e] uppercase tracking-widest mb-2">AI Summary</p>
                                    <p className="text-sm text-[#e2e2ef] leading-relaxed">{session.ai_summary}</p>
                                </div>
                            )}

                            {/* Strengths & Concerns */}
                            <div className="grid grid-cols-2 gap-4">
                                {session.strengths && session.strengths.length > 0 && (
                                    <div>
                                        <p className="text-xs text-green-400 font-medium mb-2">✓ Strengths</p>
                                        <ul className="space-y-1">
                                            {session.strengths.map((s, i) => <li key={i} className="text-xs text-[#e2e2ef] flex gap-2"><span className="text-green-400 shrink-0">•</span>{s}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {session.concerns && session.concerns.length > 0 && (
                                    <div>
                                        <p className="text-xs text-red-400 font-medium mb-2">⚠ Concerns</p>
                                        <ul className="space-y-1">
                                            {session.concerns.map((c, i) => <li key={i} className="text-xs text-[#e2e2ef] flex gap-2"><span className="text-red-400 shrink-0">•</span>{c}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Transcript accordion */}
                            {session.transcript && session.transcript.length > 0 && (
                                <div>
                                    <button
                                        onClick={() => setShowTranscript(!showTranscript)}
                                        className="flex items-center gap-2 text-sm font-medium text-[#8b8b9e] hover:text-white transition-colors"
                                    >
                                        <ChevronRight className={`w-4 h-4 transition-transform ${showTranscript ? "rotate-90" : ""}`} />
                                        Full Transcript ({session.transcript.length} messages)
                                    </button>
                                    {showTranscript && (
                                        <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
                                            {session.transcript.map((t, i) => (
                                                <div key={i} className={`flex ${t.role === "candidate" ? "justify-end" : "justify-start"}`}>
                                                    <div className={`max-w-[80%] rounded-xl px-3 py-2 ${t.role === "candidate" ? "bg-[#6c47ff]/20 text-right" : "bg-[#1e1e2e]"}`}>
                                                        <p className="text-xs text-[#8b8b9e] mb-0.5">{t.role === "ai" ? "AI Interviewer" : "Candidate"}</p>
                                                        <p className="text-xs text-[#e2e2ef]">{t.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="card text-center py-10">
                            <p className="text-sm text-[#8b8b9e]">No session data found for this interview.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
