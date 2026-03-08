"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { Save, Building, Brain, Mail, Bell, User, Trash2 } from "lucide-react";

interface Settings {
    company_name?: string | null;
    company_logo_url?: string | null;
    ai_interviewer_name?: string | null;
    ai_voice_id?: string | null;
    interview_tone?: string | null;
    evaluation_strictness?: string | null;
    screening_question_count?: number | null;
    technical_question_count?: number | null;
    hr_question_count?: number | null;
    silence_timeout_seconds?: number | null;
    custom_ai_prompt?: string | null;
    invite_expiry_days?: number | null;
    reply_to_email?: string | null;
    custom_email_intro?: string | null;
    email_notifications_enabled?: boolean | null;
}

const tabs = [
    { id: "company", label: "Company", icon: Building },
    { id: "ai", label: "AI Interview", icon: Brain },
    { id: "email", label: "Email Invites", icon: Mail },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "account", label: "Account", icon: User },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("company");
    const [settings, setSettings] = useState<Settings>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        fetch("/api/settings").then(r => r.json()).then(d => {
            setSettings(d.settings || {});
            setLoading(false);
        });
    }, []);

    const save = async (updates: Partial<Settings>) => {
        const merged = { ...settings, ...updates };
        setSaving(true);
        try {
            const res = await fetch("/api/settings", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setSettings(data.settings || merged);
            toast.success("Settings saved!");
        } catch {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse space-y-4 max-w-2xl">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#1e1e2e] rounded-xl" />)}</div>;
    }

    return (
        <div className="max-w-3xl space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <p className="text-sm text-[#8b8b9e] mt-0.5">Configure your HireFlow AI workspace</p>
            </div>

            <div className="flex gap-1 border-b border-[#1e1e2e] overflow-x-auto">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? "border-[#6c47ff] text-[#6c47ff]" : "border-transparent text-[#8b8b9e] hover:text-white"}`}>
                        <tab.icon className="w-4 h-4" />{tab.label}
                    </button>
                ))}
            </div>

            {/* Tab: Company */}
            {activeTab === "company" && (
                <div className="card space-y-4">
                    <h3 className="font-semibold text-white">Company Profile</h3>
                    <div>
                        <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Company Name</label>
                        <input value={settings.company_name || ""} onChange={e => setSettings(s => ({ ...s, company_name: e.target.value }))} className="input-field" placeholder="Acme Corp" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Company Logo URL</label>
                        <input value={settings.company_logo_url || ""} onChange={e => setSettings(s => ({ ...s, company_logo_url: e.target.value }))} className="input-field" placeholder="https://..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Reply-to Email</label>
                        <input type="email" value={settings.reply_to_email || ""} onChange={e => setSettings(s => ({ ...s, reply_to_email: e.target.value }))} className="input-field" placeholder="hr@company.com" />
                    </div>
                    <button onClick={() => save({ company_name: settings.company_name, company_logo_url: settings.company_logo_url, reply_to_email: settings.reply_to_email })}
                        disabled={saving} className="btn-primary flex items-center gap-2 text-sm"><Save className="w-4 h-4" />{saving ? "Saving..." : "Save"}</button>
                </div>
            )}

            {/* Tab: AI Interview */}
            {activeTab === "ai" && (
                <div className="card space-y-5">
                    <h3 className="font-semibold text-white">AI Interview Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">AI Interviewer Name</label>
                            <input value={settings.ai_interviewer_name || "Alex"} onChange={e => setSettings(s => ({ ...s, ai_interviewer_name: e.target.value }))} className="input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Murf Voice ID</label>
                            <input value={settings.ai_voice_id || "en-US-Neural2-F"} onChange={e => setSettings(s => ({ ...s, ai_voice_id: e.target.value }))} className="input-field" placeholder="en-US-Neural2-F" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#e2e2ef] mb-2">Interview Tone</label>
                        <div className="grid grid-cols-3 gap-2">
                            {["professional", "friendly", "strict"].map(tone => (
                                <button key={tone} onClick={() => setSettings(s => ({ ...s, interview_tone: tone }))}
                                    className={`py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors ${settings.interview_tone === tone ? "border-[#6c47ff]/50 bg-[#6c47ff]/10 text-[#6c47ff]" : "border-[#1e1e2e] text-[#8b8b9e] hover:border-[#6c47ff]/30"}`}>
                                    {tone}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#e2e2ef] mb-2">Evaluation Strictness</label>
                        <div className="grid grid-cols-3 gap-2">
                            {["lenient", "balanced", "strict"].map(level => (
                                <button key={level} onClick={() => setSettings(s => ({ ...s, evaluation_strictness: level }))}
                                    className={`py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors ${settings.evaluation_strictness === level ? "border-[#6c47ff]/50 bg-[#6c47ff]/10 text-[#6c47ff]" : "border-[#1e1e2e] text-[#8b8b9e] hover:border-[#6c47ff]/30"}`}>
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {[["Screening Questions", "screening_question_count"], ["Technical Questions", "technical_question_count"], ["HR Questions", "hr_question_count"]].map(([label, key]) => (
                            <div key={key}>
                                <label className="block text-xs font-medium text-[#e2e2ef] mb-1.5">{label}</label>
                                <input type="number" min={1} max={10}
                                    value={String((settings as Record<string, unknown>)[key] || "")}
                                    onChange={e => setSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
                                    className="input-field" />
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">
                            Silence Timeout: {settings.silence_timeout_seconds || 3}s
                        </label>
                        <input type="range" min={1} max={8}
                            value={settings.silence_timeout_seconds || 3}
                            onChange={e => setSettings(s => ({ ...s, silence_timeout_seconds: Number(e.target.value) }))}
                            className="w-full accent-[#6c47ff]" />
                        <div className="flex justify-between text-xs text-[#8b8b9e] mt-1"><span>1s</span><span>8s</span></div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Custom AI System Prompt</label>
                        <textarea value={settings.custom_ai_prompt || ""} onChange={e => setSettings(s => ({ ...s, custom_ai_prompt: e.target.value }))}
                            className="input-field min-h-[80px]" placeholder="Optional: Append custom instructions to Gemini..." />
                    </div>

                    <button onClick={() => save({
                        ai_interviewer_name: settings.ai_interviewer_name, ai_voice_id: settings.ai_voice_id,
                        interview_tone: settings.interview_tone, evaluation_strictness: settings.evaluation_strictness,
                        screening_question_count: settings.screening_question_count, technical_question_count: settings.technical_question_count,
                        hr_question_count: settings.hr_question_count, silence_timeout_seconds: settings.silence_timeout_seconds,
                        custom_ai_prompt: settings.custom_ai_prompt,
                    })} disabled={saving} className="btn-primary flex items-center gap-2 text-sm"><Save className="w-4 h-4" />{saving ? "Saving..." : "Save"}</button>
                </div>
            )}

            {/* Tab: Email Invites */}
            {activeTab === "email" && (
                <div className="card space-y-4">
                    <h3 className="font-semibold text-white">Email Invite Settings</h3>
                    <div>
                        <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Invite Expiry (days)</label>
                        <input type="number" min={1} max={30} value={settings.invite_expiry_days || 7}
                            onChange={e => setSettings(s => ({ ...s, invite_expiry_days: Number(e.target.value) }))} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Custom Email Intro</label>
                        <textarea value={settings.custom_email_intro || ""} onChange={e => setSettings(s => ({ ...s, custom_email_intro: e.target.value }))}
                            className="input-field min-h-[80px]" placeholder="e.g. We were impressed by your profile and would like to invite you..." />
                    </div>
                    {/* Live preview */}
                    {settings.custom_email_intro && (
                        <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#1e1e2e]">
                            <p className="text-xs text-[#8b8b9e] mb-2">Preview</p>
                            <p className="text-sm text-[#e2e2ef]">{settings.custom_email_intro}</p>
                        </div>
                    )}
                    <button onClick={() => save({ invite_expiry_days: settings.invite_expiry_days, custom_email_intro: settings.custom_email_intro })}
                        disabled={saving} className="btn-primary flex items-center gap-2 text-sm"><Save className="w-4 h-4" />{saving ? "Saving..." : "Save"}</button>
                </div>
            )}

            {/* Tab: Notifications */}
            {activeTab === "notifications" && (
                <div className="card space-y-4">
                    <h3 className="font-semibold text-white">Notification Preferences</h3>
                    {[
                        { key: "email_notifications_enabled", label: "Email me when candidate completes interview" },
                    ].map(({ key, label }) => (
                        <label key={key} className="flex items-center justify-between p-4 rounded-xl bg-[#0a0a0f] border border-[#1e1e2e] cursor-pointer">
                            <span className="text-sm text-[#e2e2ef]">{label}</span>
                            <div className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${(settings as Record<string, unknown>)[key] ? "bg-[#6c47ff]" : "bg-[#1e1e2e]"}`}
                                onClick={() => setSettings(s => ({ ...s, [key]: !(s as Record<string, unknown>)[key] }))}>
                                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${(settings as Record<string, unknown>)[key] ? "translate-x-4" : ""}`} />
                            </div>
                        </label>
                    ))}
                    <button onClick={() => save({ email_notifications_enabled: settings.email_notifications_enabled })}
                        disabled={saving} className="btn-primary flex items-center gap-2 text-sm"><Save className="w-4 h-4" />{saving ? "Saving..." : "Save"}</button>
                </div>
            )}

            {/* Tab: Account */}
            {activeTab === "account" && (
                <div className="space-y-4">
                    <div className="card space-y-4">
                        <h3 className="font-semibold text-white">Account Details</h3>
                        <div>
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Full Name</label>
                            <input defaultValue={user?.full_name} className="input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Email</label>
                            <input defaultValue={user?.email} type="email" className="input-field" />
                        </div>
                        <button className="btn-primary flex items-center gap-2 text-sm"><Save className="w-4 h-4" /> Update Profile</button>
                    </div>

                    <div className="card space-y-4">
                        <h3 className="font-semibold text-white">Change Password</h3>
                        <div><label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Current Password</label><input type="password" className="input-field" /></div>
                        <div><label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">New Password</label><input type="password" className="input-field" /></div>
                        <div><label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Confirm New Password</label><input type="password" className="input-field" /></div>
                        <button className="btn-primary flex items-center gap-2 text-sm"><Save className="w-4 h-4" /> Change Password</button>
                    </div>

                    <div className="card border-red-500/20">
                        <h3 className="font-semibold text-red-400 mb-2">Danger Zone</h3>
                        <p className="text-sm text-[#8b8b9e] mb-4">Permanently delete your account and all data. This action cannot be undone.</p>
                        <button
                            onClick={() => { if (confirm("Are you sure? This will DELETE your account forever.")) toast.error("Account deletion not yet implemented in this demo."); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-4 h-4" /> Delete Account
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
