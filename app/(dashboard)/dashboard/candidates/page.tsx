"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Plus, Search, Users, LayoutGrid, List, Trash2, Eye,
    Upload, X, Tag, Briefcase, MapPin, Link as LinkIcon
} from "lucide-react";
import { getInitials } from "@/lib/utils";

interface Candidate {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    location?: string | null;
    current_role?: string | null;
    years_experience?: number | null;
    skills?: string[] | null;
    resume_url?: string | null;
    linkedin_url?: string | null;
    notes?: string | null;
    created_at: string;
}

const COLORS = ["from-purple-500 to-indigo-600", "from-pink-500 to-rose-600", "from-green-500 to-teal-600", "from-orange-500 to-amber-600", "from-blue-500 to-cyan-600"];
const getColor = (name: string) => COLORS[name.charCodeAt(0) % COLORS.length];

function AddCandidateModal({ onClose, onSave }: { onClose: () => void; onSave: (c: Candidate) => void }) {
    const [tab, setTab] = useState<"upload" | "manual">("manual");
    const [parsing, setParsing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [skillInput, setSkillInput] = useState("");
    const [form, setForm] = useState({
        full_name: "", email: "", phone: "", location: "", current_role: "",
        years_experience: "", skills: [] as string[], linkedin_url: "", notes: "", resume_url: "",
    });
    const [resumeText, setResumeText] = useState("");

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setParsing(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/candidates/parse-resume", { method: "POST", body: fd });
            if (!res.ok) throw new Error();
            const data = await res.json();
            const p = data.profile;
            setForm(f => ({
                ...f,
                full_name: p.full_name || f.full_name,
                email: p.email || f.email,
                phone: p.phone || f.phone,
                location: p.location || f.location,
                current_role: p.current_role || f.current_role,
                years_experience: String(p.years_experience || f.years_experience),
                skills: p.skills || f.skills,
                linkedin_url: p.linkedin_url || f.linkedin_url,
            }));
            setResumeText(data.resume_text || "");
            toast.success("Resume parsed! Review and edit below.");
        } catch {
            toast.error("Failed to parse resume");
        } finally {
            setParsing(false);
        }
    };

    const addSkill = () => {
        const s = skillInput.trim();
        if (s && !form.skills.includes(s)) {
            setForm(f => ({ ...f, skills: [...f.skills, s] }));
        }
        setSkillInput("");
    };

    const handleSave = async () => {
        if (!form.full_name || !form.email) { toast.error("Name and email required"); return; }
        setSaving(true);
        try {
            const res = await fetch("/api/candidates", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, years_experience: form.years_experience ? Number(form.years_experience) : null, resume_text: resumeText }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            toast.success("Candidate saved!");
            onSave(data.candidate);
        } catch {
            toast.error("Failed to save candidate");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-[#111118] border border-[#1e1e2e] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-[#1e1e2e]">
                    <h2 className="font-bold text-white">Add Candidate</h2>
                    <button onClick={onClose} className="p-2 hover:bg-[#1e1e2e] rounded-lg text-[#8b8b9e]"><X className="w-5 h-5" /></button>
                </div>

                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                    <div className="flex rounded-lg border border-[#1e1e2e] p-1">
                        {[["upload", "Upload Resume", Upload], ["manual", "Fill Manually", Users]].map(([m, label, Icon]) => (
                            <button key={m as string} onClick={() => setTab(m as "upload" | "manual")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${tab === m ? "bg-[#6c47ff] text-white" : "text-[#8b8b9e] hover:text-white"}`}>
                                <Icon className="w-4 h-4" /> {label as string}
                            </button>
                        ))}
                    </div>

                    {tab === "upload" && (
                        <label className="border-2 border-dashed border-[#1e1e2e] rounded-xl p-8 text-center cursor-pointer hover:border-[#6c47ff]/40 transition-colors block">
                            <Upload className="w-8 h-8 text-[#8b8b9e] mx-auto mb-2" />
                            <p className="text-sm text-[#e2e2ef] font-medium mb-1">Drag & drop or click to upload</p>
                            <p className="text-xs text-[#8b8b9e]">PDF files only</p>
                            {parsing && <p className="text-xs text-[#6c47ff] mt-2 animate-pulse">Parsing resume with AI...</p>}
                            <input type="file" accept=".pdf" onChange={handleFile} className="hidden" />
                        </label>
                    )}

                    {/* Form */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2"><label className="block text-xs font-medium text-[#e2e2ef] mb-1">Full Name *</label><input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="input-field" /></div>
                        <div className="col-span-2"><label className="block text-xs font-medium text-[#e2e2ef] mb-1">Email *</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
                        <div><label className="block text-xs font-medium text-[#e2e2ef] mb-1">Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" /></div>
                        <div><label className="block text-xs font-medium text-[#e2e2ef] mb-1">Location</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input-field" /></div>
                        <div><label className="block text-xs font-medium text-[#e2e2ef] mb-1">Current Role</label><input value={form.current_role} onChange={e => setForm({ ...form, current_role: e.target.value })} className="input-field" /></div>
                        <div><label className="block text-xs font-medium text-[#e2e2ef] mb-1">Years Experience</label><input type="number" value={form.years_experience} onChange={e => setForm({ ...form, years_experience: e.target.value })} className="input-field" /></div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-[#e2e2ef] mb-1">Skills (press Enter)</label>
                            <div className="flex gap-2 mb-2">
                                <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())}
                                    className="input-field flex-1 text-sm" placeholder="e.g. React" />
                                <button onClick={addSkill} className="px-3 py-2 rounded-lg bg-[#6c47ff]/10 text-[#6c47ff] text-sm hover:bg-[#6c47ff]/20 transition-colors"><Plus className="w-4 h-4" /></button>
                            </div>
                            {form.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {form.skills.map(s => (
                                        <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#6c47ff]/10 text-[#6c47ff] text-xs">
                                            {s}<button onClick={() => setForm(f => ({ ...f, skills: f.skills.filter(x => x !== s) }))} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="col-span-2"><label className="block text-xs font-medium text-[#e2e2ef] mb-1">LinkedIn URL</label><input value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} className="input-field" placeholder="https://linkedin.com/in/..." /></div>
                        <div className="col-span-2"><label className="block text-xs font-medium text-[#e2e2ef] mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field min-h-[60px]" /></div>
                    </div>
                </div>

                <div className="p-5 border-t border-[#1e1e2e] flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#1e1e2e] text-sm text-[#8b8b9e] hover:bg-[#1e1e2e] transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary text-sm disabled:opacity-60">{saving ? "Saving..." : "Save Candidate"}</button>
                </div>
            </div>
        </div>
    );
}

export default function CandidatesPage() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [view, setView] = useState<"grid" | "list">("grid");
    const [showAdd, setShowAdd] = useState(false);
    const [selected, setSelected] = useState<Candidate | null>(null);

    const fetchCandidates = async (q = "") => {
        const res = await fetch(`/api/candidates${q ? `?search=${q}` : ""}`);
        const data = await res.json();
        setCandidates(data.candidates || []);
        setLoading(false);
    };

    useEffect(() => { fetchCandidates(); }, []);
    useEffect(() => {
        const t = setTimeout(() => fetchCandidates(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this candidate?")) return;
        const res = await fetch(`/api/candidates/${id}`, { method: "DELETE" });
        if (res.ok) { setCandidates(p => p.filter(c => c.id !== id)); toast.success("Deleted"); }
        else toast.error("Failed to delete");
    };

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Candidates</h2>
                    <p className="text-sm text-[#8b8b9e] mt-0.5">{candidates.length} total candidates</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Candidate
                </button>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8b9e]" />
                    <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search candidates..." />
                </div>
                <div className="flex items-center gap-1 p-1 rounded-lg border border-[#1e1e2e]">
                    <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-[#6c47ff] text-white" : "text-[#8b8b9e]"}`}><LayoutGrid className="w-4 h-4" /></button>
                    <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-[#6c47ff] text-white" : "text-[#8b8b9e]"}`}><List className="w-4 h-4" /></button>
                </div>
            </div>

            {loading ? (
                <div className={view === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-2"}>
                    {[...Array(8)].map((_, i) => <div key={i} className="card animate-pulse h-36" />)}
                </div>
            ) : candidates.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-2xl bg-[#1e1e2e] flex items-center justify-center mx-auto mb-4">
                        <Users className="w-10 h-10 text-[#8b8b9e]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{search ? "No candidates found" : "No candidates yet"}</h3>
                    <p className="text-sm text-[#8b8b9e] mb-4">{search ? "Try a different search term" : "Add your first candidate to start matching with jobs"}</p>
                    {!search && <button onClick={() => setShowAdd(true)} className="btn-primary">Add First Candidate</button>}
                </div>
            ) : view === "grid" ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {candidates.map(c => (
                        <div key={c.id} className="card hover:border-[#6c47ff]/20 transition-all group">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getColor(c.full_name)} flex items-center justify-center text-white font-bold`}>
                                    {getInitials(c.full_name)}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setSelected(c)} className="p-1.5 rounded-lg hover:bg-[#1e1e2e] text-[#8b8b9e] hover:text-white transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-[#1e1e2e] text-[#8b8b9e] hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                            <h3 className="font-semibold text-white text-sm">{c.full_name}</h3>
                            {c.current_role && <p className="text-xs text-[#8b8b9e] mt-0.5">{c.current_role}</p>}
                            {c.location && <p className="text-xs text-[#8b8b9e] flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{c.location}</p>}
                            {c.years_experience && <p className="text-xs text-[#8b8b9e] mt-1"><Briefcase className="w-3 h-3 inline mr-1" />{c.years_experience}y exp</p>}
                            {c.skills && c.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {c.skills.slice(0, 3).map(s => <span key={s} className="px-1.5 py-0.5 rounded-full bg-[#1e1e2e] text-xs text-[#8b8b9e]">{s}</span>)}
                                    {c.skills.length > 3 && <span className="px-1.5 py-0.5 rounded-full bg-[#1e1e2e] text-xs text-[#8b8b9e]">+{c.skills.length - 3}</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card p-0 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b border-[#1e1e2e] bg-[#0a0a0f]">
                            <tr>
                                {["Name", "Email", "Role", "Skills", "Exp", "Actions"].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#8b8b9e]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e1e2e]">
                            {candidates.map(c => (
                                <tr key={c.id} className="hover:bg-[#1e1e2e]/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getColor(c.full_name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{getInitials(c.full_name)}</div>
                                            <span className="font-medium text-white">{c.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[#8b8b9e]">{c.email}</td>
                                    <td className="px-4 py-3 text-[#8b8b9e]">{c.current_role || "—"}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {c.skills?.slice(0, 2).map(s => <span key={s} className="px-1.5 py-0.5 rounded-full bg-[#1e1e2e] text-xs text-[#8b8b9e]">{s}</span>)}
                                            {(c.skills?.length || 0) > 2 && <span className="text-xs text-[#8b8b9e]">+{(c.skills?.length || 0) - 2}</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[#8b8b9e]">{c.years_experience ? `${c.years_experience}y` : "—"}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setSelected(c)} className="p-1.5 rounded-lg hover:bg-[#1e1e2e] text-[#8b8b9e] hover:text-white transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-[#1e1e2e] text-[#8b8b9e] hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showAdd && <AddCandidateModal onClose={() => setShowAdd(false)} onSave={c => { setCandidates(p => [c, ...p]); setShowAdd(false); }} />}

            {/* Candidate detail modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
                    <div className="relative w-full max-w-md bg-[#111118] border border-[#1e1e2e] rounded-2xl shadow-2xl p-6">
                        <button onClick={() => setSelected(null)} className="absolute top-4 right-4 p-2 hover:bg-[#1e1e2e] rounded-lg text-[#8b8b9e]"><X className="w-5 h-5" /></button>
                        <div className="flex items-center gap-4 mb-5">
                            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getColor(selected.full_name)} flex items-center justify-center text-white text-xl font-bold`}>{getInitials(selected.full_name)}</div>
                            <div>
                                <h2 className="text-lg font-bold text-white">{selected.full_name}</h2>
                                {selected.current_role && <p className="text-sm text-[#8b8b9e]">{selected.current_role}</p>}
                            </div>
                        </div>
                        <div className="space-y-3">
                            {[["Email", selected.email], ["Phone", selected.phone], ["Location", selected.location], ["Experience", selected.years_experience ? `${selected.years_experience} years` : null]].map(([l, v]) => v && (
                                <div key={l as string} className="flex items-center justify-between text-sm">
                                    <span className="text-[#8b8b9e]">{l}</span>
                                    <span className="text-white">{v}</span>
                                </div>
                            ))}
                            {selected.skills && selected.skills.length > 0 && (
                                <div>
                                    <p className="text-sm text-[#8b8b9e] mb-2">Skills</p>
                                    <div className="flex flex-wrap gap-1">
                                        {selected.skills.map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-[#6c47ff]/10 text-[#6c47ff] text-xs">{s}</span>)}
                                    </div>
                                </div>
                            )}
                            {selected.linkedin_url && (
                                <a href={selected.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[#6c47ff] hover:text-purple-400">
                                    <LinkIcon className="w-4 h-4" /> LinkedIn Profile
                                </a>
                            )}
                            {selected.notes && <div><p className="text-xs text-[#8b8b9e] mb-1">Notes</p><p className="text-sm text-[#e2e2ef] bg-[#0a0a0f] rounded-lg p-3">{selected.notes}</p></div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
