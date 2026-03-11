"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Plus, Briefcase, MapPin, DollarSign, Clock, Search,
    Pencil, Trash2, Sparkles, Users, ChevronDown, X
} from "lucide-react";
import { formatSalary, formatDate, cn } from "@/lib/utils";

interface Job {
    id: string;
    title: string;
    type: string;
    location: string;
    salary_min?: number | null;
    salary_max?: number | null;
    description: string;
    responsibilities?: string | null;
    requirements?: string | null;
    status: string;
    created_at: string;
}

interface MatchedCandidate {
    candidate_id: string;
    match_score: number;
    match_reason: string;
    candidate?: {
        id: string;
        full_name: string;
        current_role?: string | null;
        skills?: string[] | null;
        email: string;
    };
}

const statusColors: Record<string, string> = {
    draft: "bg-[#1e1e2e] text-[#8b8b9e]",
    active: "bg-green-500/10 text-green-400 border border-green-500/20",
    expired: "bg-red-500/10 text-red-400 border border-red-500/20",
};

function JobCard({ job, onDelete, onStatusChange, onFindMatches, onEdit }: {
    job: Job;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: string) => void;
    onFindMatches: (job: Job) => void;
    onEdit: (job: Job) => void;
}) {
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [deleting, setDeleting] = useState(false);

    return (
        <div className="card hover:border-[#6c47ff]/20 transition-all group">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-base truncate">{job.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#8b8b9e]">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.type}</span>
                    </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusColors[job.status]}`}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
            </div>

            {(job.salary_min || job.salary_max) && (
                <div className="flex items-center gap-1 text-xs text-[#8b8b9e] mb-3">
                    <DollarSign className="w-3 h-3" />
                    {formatSalary(job.salary_min, job.salary_max)}
                </div>
            )}

            <p className="text-xs text-[#8b8b9e] line-clamp-2 mb-4">{job.description}</p>

            <div className="flex items-center gap-2 text-xs text-[#8b8b9e] mb-4">
                <Clock className="w-3 h-3" />
                Posted {formatDate(job.created_at)}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-[#1e1e2e]">
                <button
                    onClick={() => onFindMatches(job)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6c47ff]/10 text-[#6c47ff] text-xs font-medium hover:bg-[#6c47ff]/20 transition-colors flex-1"
                >
                    <Users className="w-3.5 h-3.5" /> Find Matches
                </button>

                {/* Status dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${job.status === "active" ? "border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20" :
                            job.status === "expired" ? "border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20" :
                                "border-[#1e1e2e] text-[#8b8b9e] bg-[#1e1e2e]/50 hover:bg-[#1e1e2e]"
                            } text-xs font-medium`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${job.status === "active" ? "bg-green-400" :
                            job.status === "expired" ? "bg-red-400" :
                                "bg-[#8b8b9e]"
                            }`} />
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
                    </button>
                    {showStatusMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
                            <div className="absolute bottom-[calc(100%+0.5rem)] left-0 bg-[#16161f] border border-[#1e1e2e] rounded-xl shadow-2xl z-20 p-1 w-36 overflow-hidden">
                                {["draft", "active", "expired"].map(s => (
                                    <button key={s} onClick={() => { onStatusChange(job.id, s); setShowStatusMenu(false); }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${job.status === s
                                            ? s === 'active' ? "bg-green-500/10 text-green-400 font-semibold" :
                                                s === 'expired' ? "bg-red-500/10 text-red-400 font-semibold" :
                                                    "bg-[#1e1e2e] text-white font-semibold"
                                            : "text-[#8b8b9e] hover:bg-[#1e1e2e] hover:text-white"
                                            }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${s === "active" ? "bg-green-400" :
                                            s === "expired" ? "bg-red-400" :
                                                "bg-[#8b8b9e]"
                                            }`} />
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <button onClick={() => onEdit(job)}
                    className="p-1.5 rounded-lg border border-[#1e1e2e] text-[#8b8b9e] hover:text-white hover:bg-[#1e1e2e] transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={async () => {
                        if (!confirm("Delete this job?")) return;
                        setDeleting(true);
                        await onDelete(job.id);
                        setDeleting(false);
                    }}
                    disabled={deleting}
                    className="p-1.5 rounded-lg border border-[#1e1e2e] text-[#8b8b9e] hover:text-red-400 hover:border-red-500/30 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

function JobFormModal({ job, onClose, onSave }: { job?: Job; onClose: () => void; onSave: (job: Job) => void }) {
    const [mode, setMode] = useState<"ai" | "manual">(job ? "manual" : "ai");
    const [aiTitle, setAiTitle] = useState("");
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showTypeMenu, setShowTypeMenu] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [form, setForm] = useState({
        title: job?.title || "", type: job?.type || "Full-time", location: job?.location || "",
        salary_min: job?.salary_min ? String(job.salary_min) : "",
        salary_max: job?.salary_max ? String(job.salary_max) : "",
        description: job?.description || "", responsibilities: job?.responsibilities || "",
        requirements: job?.requirements || "", status: job?.status || "draft"
    });

    const generateWithAI = async () => {
        if (!aiTitle.trim()) { toast.error("Enter a job title"); return; }
        setGenerating(true);
        try {
            const res = await fetch("/api/jobs/generate", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: aiTitle }),
            });
            if (!res.ok) throw new Error("Generation failed");
            const data = await res.json();
            setForm({
                title: data.job.title, type: data.job.type, location: data.job.location,
                salary_min: String(data.job.salary_min || ""), salary_max: String(data.job.salary_max || ""),
                description: data.job.description, responsibilities: data.job.responsibilities,
                requirements: data.job.requirements, status: "draft"
            });
            toast.success("Job description generated!");
        } catch {
            toast.error("Failed to generate. Try again.");
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!form.title || !form.type || !form.location || !form.description) {
            toast.error("Please fill in required fields"); return;
        }
        setSaving(true);
        try {
            const res = await fetch(job ? `/api/jobs/${job.id}` : "/api/jobs", {
                method: job ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, salary_min: form.salary_min ? Number(form.salary_min) : null, salary_max: form.salary_max ? Number(form.salary_max) : null }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            toast.success(job ? "Job updated!" : "Job saved!");
            onSave(data.job);
        } catch {
            toast.error("Failed to save job");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-[#111118] border border-[#1e1e2e] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-[#1e1e2e]">
                    <h2 className="text-lg font-bold text-white">{job ? "Edit Job" : "Add New Job"}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#1e1e2e] transition-colors text-[#8b8b9e]"><X className="w-5 h-5" /></button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-5">
                    {/* Mode tabs */}
                    <div className="flex rounded-lg border border-[#1e1e2e] p-1">
                        {[["ai", "Generate with AI", Sparkles], ["manual", "Fill Manually", Briefcase]].map(([m, label, Icon]) => (
                            <button key={m as string} onClick={() => setMode(m as "ai" | "manual")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${mode === m ? "bg-[#6c47ff] text-white" : "text-[#8b8b9e] hover:text-white"}`}>
                                <Icon className="w-4 h-4" /> {label as string}
                            </button>
                        ))}
                    </div>

                    {mode === "ai" && (
                        <div className="flex gap-2">
                            <input value={aiTitle} onChange={e => setAiTitle(e.target.value)} placeholder="e.g. Senior Frontend Engineer"
                                className="input-field flex-1" onKeyDown={e => e.key === "Enter" && generateWithAI()} />
                            <button onClick={generateWithAI} disabled={generating}
                                className="btn-primary flex items-center gap-2 whitespace-nowrap disabled:opacity-60">
                                {generating ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <Sparkles className="w-4 h-4" />}
                                Generate
                            </button>
                        </div>
                    )}

                    {/* Form fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Job Title *</label>
                            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Senior Frontend Engineer" />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Type *</label>
                            <button
                                onClick={() => setShowTypeMenu(!showTypeMenu)}
                                className="w-full flex items-center justify-between input-field hover:border-[#6c47ff]/50 transition-colors"
                            >
                                <span className={form.type ? "text-white" : "text-[#8b8b9e]"}>{form.type || "Select Type"}</span>
                                <ChevronDown className={`w-4 h-4 text-[#8b8b9e] transition-transform ${showTypeMenu ? "rotate-180" : ""}`} />
                            </button>
                            {showTypeMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowTypeMenu(false)} />
                                    <div className="absolute top-[calc(100%+0.5rem)] left-0 w-full bg-[#16161f] border border-[#1e1e2e] rounded-xl shadow-2xl z-20 p-1 overflow-hidden">
                                        {["Full-time", "Part-time", "Contract", "Remote"].map(t => (
                                            <button key={t} onClick={() => { setForm({ ...form, type: t }); setShowTypeMenu(false); }}
                                                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${form.type === t ? "bg-[#6c47ff]/10 text-[#6c47ff] font-medium" : "text-[#8b8b9e] hover:bg-[#1e1e2e] hover:text-white"}`}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Location *</label>
                            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input-field" placeholder="San Francisco, CA" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Salary Min</label>
                            <input type="number" value={form.salary_min} onChange={e => setForm({ ...form, salary_min: e.target.value })} className="input-field" placeholder="80000" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Salary Max</label>
                            <input type="number" value={form.salary_max} onChange={e => setForm({ ...form, salary_max: e.target.value })} className="input-field" placeholder="120000" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Description *</label>
                            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field min-h-[120px]" placeholder="Full job description..." />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Responsibilities</label>
                            <textarea value={form.responsibilities} onChange={e => setForm({ ...form, responsibilities: e.target.value })} className="input-field min-h-[80px]" placeholder="Key responsibilities..." />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Requirements</label>
                            <textarea value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} className="input-field min-h-[80px]" placeholder="Required qualifications..." />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Status</label>
                            <button
                                onClick={() => setShowStatusMenu(!showStatusMenu)}
                                className="w-full flex items-center justify-between input-field hover:border-[#6c47ff]/50 transition-colors"
                            >
                                <span className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${form.status === "active" ? "bg-green-400" : "bg-[#8b8b9e]"}`} />
                                    {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-[#8b8b9e] transition-transform ${showStatusMenu ? "rotate-180" : ""}`} />
                            </button>
                            {showStatusMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
                                    <div className="absolute bottom-[calc(100%+0.5rem)] left-0 w-full bg-[#16161f] border border-[#1e1e2e] rounded-xl shadow-2xl z-20 p-1 overflow-hidden">
                                        <button onClick={() => { setForm({ ...form, status: "draft" }); setShowStatusMenu(false); }}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${form.status === "draft" ? "bg-[#1e1e2e] text-white font-medium" : "text-[#8b8b9e] hover:bg-[#1e1e2e] hover:text-white"}`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#8b8b9e]" /> Draft
                                        </button>
                                        <button onClick={() => { setForm({ ...form, status: "active" }); setShowStatusMenu(false); }}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${form.status === "active" ? "bg-green-500/10 text-green-400 font-medium" : "text-[#8b8b9e] hover:bg-[#1e1e2e] hover:text-white"}`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Active
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-[#1e1e2e] flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#1e1e2e] text-sm text-[#8b8b9e] hover:bg-[#1e1e2e] transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary text-sm disabled:opacity-60">
                        {saving ? "Saving..." : job ? "Update Job" : "Save Job"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function MatchDialog({ job, onClose, recruiterId }: { job: Job; onClose: () => void; recruiterId?: string }) {
    const [loading, setLoading] = useState(false);
    const [matches, setMatches] = useState<MatchedCandidate[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [step, setStep] = useState<"match" | "invite">("match");
    const [inviteType, setInviteType] = useState("screening");
    const [sending, setSending] = useState(false);

    useEffect(() => { runMatch(); }, []);

    const runMatch = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/jobs/${job.id}/match`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMatches(data.matches || []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Matching failed");
        } finally {
            setLoading(false);
        }
    };

    const sendInvites = async () => {
        if (selected.length === 0) return;
        setSending(true);
        try {
            const res = await fetch("/api/invites/send", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobId: job.id,
                    candidateIds: selected,
                    interviewType: inviteType,
                }),
            });
            if (!res.ok) throw new Error();
            toast.success(`Invites sent to ${selected.length} candidate(s)!`);
            onClose();
        } catch {
            toast.error("Failed to send invites");
        } finally {
            setSending(false);
        }
    };

    const scoreColor = (score: number) => score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-[#111118] border border-[#1e1e2e] rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-[#1e1e2e]">
                    <div>
                        <h2 className="font-bold text-white">{step === "match" ? "Find Matches" : "Send Interview Invites"}</h2>
                        <p className="text-xs text-[#8b8b9e] mt-0.5">{job.title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#1e1e2e] rounded-lg transition-colors text-[#8b8b9e]"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    {step === "match" && (
                        <>
                            {loading ? (
                                <div className="space-y-3">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="p-3 rounded-lg border border-[#1e1e2e] animate-pulse flex gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#1e1e2e] shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-[#1e1e2e] rounded w-1/2" />
                                                <div className="h-3 bg-[#1e1e2e] rounded w-3/4" />
                                            </div>
                                        </div>
                                    ))}
                                    <p className="text-center text-sm text-[#8b8b9e]">AI is matching candidates...</p>
                                </div>
                            ) : matches.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 text-[#8b8b9e] mx-auto mb-3" />
                                    <p className="text-[#8b8b9e]">No candidates to match. Add candidates first.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm text-[#8b8b9e]">{matches.length} candidates ranked by AI</p>
                                        <label className="flex items-center gap-2 text-sm text-[#8b8b9e] cursor-pointer">
                                            <input type="checkbox"
                                                checked={selected.length === matches.length}
                                                onChange={e => setSelected(e.target.checked ? matches.map(m => m.candidate_id) : [])}
                                                className="accent-[#6c47ff]" />
                                            Select All
                                        </label>
                                    </div>
                                    <div className="space-y-2">
                                        {matches.map(m => (
                                            <div key={m.candidate_id}
                                                className={`p-3 rounded-xl border transition-colors cursor-pointer ${selected.includes(m.candidate_id) ? "border-[#6c47ff]/40 bg-[#6c47ff]/5" : "border-[#1e1e2e] hover:border-[#6c47ff]/20"}`}
                                                onClick={() => setSelected(p => p.includes(m.candidate_id) ? p.filter(x => x !== m.candidate_id) : [...p, m.candidate_id])}>
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selected.includes(m.candidate_id)} 
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            setSelected(p => p.includes(m.candidate_id) ? p.filter(x => x !== m.candidate_id) : [...p, m.candidate_id]);
                                                        }}
                                                        className="accent-[#6c47ff] cursor-pointer" 
                                                    />
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                        {m.candidate?.full_name?.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white">{m.candidate?.full_name}</p>
                                                        <p className="text-xs text-[#8b8b9e]">{m.candidate?.current_role}</p>
                                                    </div>
                                                    <div className={`text-xl font-bold ${scoreColor(m.match_score)}`}>{m.match_score}</div>
                                                </div>
                                                <p className="text-xs text-[#8b8b9e] mt-2 ml-12">{m.match_reason}</p>
                                                {m.candidate?.skills && (
                                                    <div className="flex flex-wrap gap-1 mt-2 ml-12">
                                                        {m.candidate.skills.slice(0, 4).map(s => (
                                                            <span key={s} className="px-2 py-0.5 rounded-full bg-[#1e1e2e] text-xs text-[#8b8b9e]">{s}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {step === "invite" && (
                        <div className="space-y-4">
                            <p className="text-sm text-[#8b8b9e]">Sending invites to <span className="text-white font-medium">{selected.length}</span> candidates</p>
                            <div>
                                <p className="text-sm font-medium text-white mb-3">Interview Type</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { key: "screening", label: "Screening Round", icon: "🎯" },
                                        { key: "technical", label: "Technical Round", icon: "⚙️" },
                                        { key: "hr_final", label: "HR Final Round", icon: "🤝" },
                                    ].map(t => (
                                        <button key={t.key} onClick={() => setInviteType(t.key)}
                                            className={`p-3 rounded-xl border text-center transition-colors ${inviteType === t.key ? "border-[#6c47ff]/40 bg-[#6c47ff]/10" : "border-[#1e1e2e] hover:border-[#6c47ff]/20"}`}>
                                            <div className="text-2xl mb-1">{t.icon}</div>
                                            <p className="text-xs font-medium text-white">{t.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-[#1e1e2e] flex justify-between items-center">
                    {step === "match" ? (
                        <>
                            <button onClick={runMatch} disabled={loading} className="text-sm text-[#6c47ff] hover:text-purple-400 transition-colors disabled:opacity-50">
                                Re-run Matching
                            </button>
                            <button
                                onClick={() => setStep("invite")}
                                disabled={selected.length === 0}
                                className="btn-primary text-sm disabled:opacity-50 disabled:transform-none flex items-center gap-2">
                                Send Invite → ({selected.length})
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setStep("match")} className="text-sm text-[#8b8b9e] hover:text-white transition-colors">
                                ← Back
                            </button>
                            <button onClick={sendInvites} disabled={sending} className="btn-primary text-sm disabled:opacity-60">
                                {sending ? "Sending..." : `Send ${selected.length} Invite${selected.length !== 1 ? "s" : ""}`}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [matchJob, setMatchJob] = useState<Job | null>(null);
    const [editJob, setEditJob] = useState<Job | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetch("/api/jobs").then(r => r.json()).then(d => { setJobs(d.jobs || []); setLoading(false); });
    }, []);

    const filtered = jobs.filter(j =>
        j.title.toLowerCase().includes(search.toLowerCase()) ||
        j.location.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total: jobs.length,
        active: jobs.filter(j => j.status === "active").length,
        draft: jobs.filter(j => j.status === "draft").length,
        expired: jobs.filter(j => j.status === "expired").length,
    };

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
        if (res.ok) { setJobs(p => p.filter(j => j.id !== id)); toast.success("Job deleted"); }
        else toast.error("Failed to delete");
    };

    const handleStatusChange = async (id: string, status: string) => {
        const res = await fetch(`/api/jobs/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        if (res.ok) { setJobs(p => p.map(j => j.id === id ? { ...j, status } : j)); toast.success("Status updated"); }
        else toast.error("Failed to update");
    };

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Job Postings</h2>
                    <p className="text-sm text-[#8b8b9e] mt-0.5">Manage your active and draft job listings</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> Add New Job
                </button>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-4">
                {[
                    { label: "Total", val: stats.total, color: "text-white" },
                    { label: "Active", val: stats.active, color: "text-green-400" },
                    { label: "Draft", val: stats.draft, color: "text-[#8b8b9e]" },
                    { label: "Expired", val: stats.expired, color: "text-red-400" },
                ].map(s => (
                    <div key={s.label} className="card py-2 px-4 flex items-center gap-2">
                        <span className={`text-xl font-bold ${s.color}`}>{s.val}</span>
                        <span className="text-xs text-[#8b8b9e]">{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8b9e]" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    className="input-field pl-9" placeholder="Search jobs..." />
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <div key={i} className="card animate-pulse h-52" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-2xl bg-[#1e1e2e] flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-10 h-10 text-[#8b8b9e]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{search ? "No jobs found" : "No jobs yet"}</h3>
                    <p className="text-sm text-[#8b8b9e] mb-4">{search ? "Try a different search term" : "Post your first job and let AI find the perfect candidates"}</p>
                    {!search && <button onClick={() => setShowAddModal(true)} className="btn-primary">Post Your First Job</button>}
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(job => (
                        <JobCard key={job.id} job={job}
                            onDelete={handleDelete}
                            onStatusChange={handleStatusChange}
                            onFindMatches={setMatchJob}
                            onEdit={setEditJob}
                        />
                    ))}
                </div>
            )}

            {showAddModal && <JobFormModal onClose={() => setShowAddModal(false)} onSave={job => { setJobs(p => [job, ...p]); setShowAddModal(false); }} />}
            {editJob && <JobFormModal job={editJob} onClose={() => setEditJob(null)} onSave={job => { setJobs(p => p.map(j => j.id === job.id ? job : j)); setEditJob(null); }} />}
            {matchJob && <MatchDialog job={matchJob} onClose={() => setMatchJob(null)} />}
        </div>
    );
}
