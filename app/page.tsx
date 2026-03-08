import Link from "next/link";
import {
    Zap, Brain, Mic, FileText, Mail, Star, Check,
    ArrowRight, Play, Users, TrendingUp, Clock, Globe,
    ChevronRight, Briefcase, Target, Send, BarChart3, Settings
} from "lucide-react";

const features = [
    { icon: Brain, title: "AI Job Description Generator", desc: "Generate comprehensive, SEO-optimized job descriptions in seconds with a single job title." },
    { icon: Target, title: "Smart Candidate Matching", desc: "AI scans resumes and ranks candidates by fit score with detailed reasoning." },
    { icon: Mic, title: "Real-Time Voice Interviews", desc: "Murf Falcon AI conducts professional voice interviews 24/7 at scale." },
    { icon: FileText, title: "Auto Transcription & Scoring", desc: "Every word is captured and scored automatically. No manual note-taking." },
    { icon: BarChart3, title: "Structured Interview Reports", desc: "Get detailed performance reports with scores, strengths, concerns, and AI recommendations." },
    { icon: Mail, title: "Email Invite Automation", desc: "One-click personalized interview invitations sent directly to candidates." },
];

const steps = [
    { icon: Briefcase, step: "01", title: "Post a Job", desc: "Enter a job title and AI generates a complete, professional job description." },
    { icon: Target, step: "02", title: "Find Matches", desc: "AI scans your candidate pool and ranks matches by fit score with reasoning." },
    { icon: Send, step: "03", title: "Send Invites", desc: "One-click invitations with personalized emails and unique interview links." },
    { icon: Mic, step: "04", title: "AI Conducts Interview", desc: "Murf Falcon voice agent interviews candidates in real-time, 24/7." },
    { icon: BarChart3, step: "05", title: "Review & Decide", desc: "Receive structured reports with scores, transcripts, and hiring recommendations." },
];

const testimonials = [
    { name: "Sarah Chen", role: "Head of Talent", company: "NovaTech", quote: "HireFlow AI cut our time-to-hire by 60%. The AI interviews are indistinguishable from real ones." },
    { name: "Marcus Rodriguez", role: "HR Director", company: "ScaleUp Labs", quote: "We're interviewing 10x more candidates with the same team. The match scores are incredibly accurate." },
    { name: "Priya Patel", role: "Recruiting Lead", company: "Foundry AI", quote: "The interview reports are better than what our human interviewers produce. Truly remarkable technology." },
];

const plans = [
    { name: "Free", price: "0", period: "/month", desc: "Perfect for small teams getting started", features: ["5 active jobs", "50 AI interviews/month", "Basic reports", "Email support"], cta: "Get Started Free", primary: false },
    { name: "Pro", price: "49", period: "/month", desc: "For growing recruiting teams", features: ["Unlimited jobs", "500 AI interviews/month", "Advanced reports + transcripts", "Priority support", "Custom AI prompts"], cta: "Start Pro Trial", primary: true },
    { name: "Enterprise", price: "Custom", period: "", desc: "For large organizations at scale", features: ["Unlimited everything", "Custom voice personas", "SSO / SAML", "Dedicated success manager", "SLA guarantee", "API access"], cta: "Contact Sales", primary: false },
];

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-[#e2e2ef]">
            {/* ─── NAVBAR ─────────────────────────────────────────────────── */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0f]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-white">HireFlow AI</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm text-[#8b8b9e]">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/sign-in" className="text-sm text-[#8b8b9e] hover:text-white transition-colors px-3 py-2">Sign In</Link>
                        <Link href="/sign-up" className="btn-primary text-sm py-2 px-4">Get Started Free</Link>
                    </div>
                </div>
            </nav>

            {/* ─── HERO ────────────────────────────────────────────────────── */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-radial from-[#6c47ff]/15 via-transparent to-transparent" />
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-700/8 rounded-full blur-3xl" />
                <div className="absolute top-40 right-20 w-64 h-64 bg-indigo-600/8 rounded-full blur-3xl" />

                <div className="max-w-7xl mx-auto relative">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6c47ff]/10 border border-[#6c47ff]/20 text-sm text-[#a78bfa] mb-6">
                            <Zap className="w-4 h-4" />
                            <span>Powered by Gemini AI + Murf Falcon TTS</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
                            AI-Powered Recruiting,{" "}
                            <span className="gradient-text">From Sourcing to Hire.</span>
                        </h1>

                        <p className="text-xl text-[#8b8b9e] mb-10 max-w-2xl mx-auto leading-relaxed">
                            Automate your entire hiring pipeline. Post jobs, match candidates with AI, conduct voice interviews, and receive structured reports — all in one platform.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/sign-up"
                                className="btn-primary flex items-center gap-2 text-base px-8 py-4 rounded-xl">
                                Start Hiring Free <ArrowRight className="w-5 h-5" />
                            </Link>
                            <button className="flex items-center gap-2 px-8 py-4 rounded-xl border border-[#1e1e2e] bg-[#111118] hover:bg-[#1e1e2e] transition-colors text-base font-semibold">
                                <Play className="w-5 h-5 text-[#6c47ff]" />
                                Watch Demo
                            </button>
                        </div>
                    </div>

                    {/* Mock dashboard preview */}
                    <div className="mt-16 relative max-w-5xl mx-auto">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent z-10 pointer-events-none h-32 bottom-0 top-auto" />
                        <div className="rounded-2xl border border-[#1e1e2e] bg-[#111118] overflow-hidden shadow-2xl shadow-[#6c47ff]/10">
                            <div className="bg-[#0a0a0f] px-4 py-3 flex items-center gap-2 border-b border-[#1e1e2e]">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <div className="flex-1 mx-4 h-6 rounded-md bg-[#1e1e2e] flex items-center px-3">
                                    <span className="text-xs text-[#8b8b9e]">app.hireflow.ai/dashboard</span>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-4 gap-4">
                                {[{ label: "Active Jobs", val: "24", color: "text-[#6c47ff]" }, { label: "Candidates", val: "1,842", color: "text-purple-400" }, { label: "Interviews Sent", val: "386", color: "text-indigo-400" }, { label: "Screening Rate", val: "73%", color: "text-green-400" }].map(s => (
                                    <div key={s.label} className="card p-4">
                                        <p className="text-xs text-[#8b8b9e] mb-1">{s.label}</p>
                                        <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="px-6 pb-6">
                                <div className="rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-4 h-32 flex items-center justify-center">
                                    <p className="text-sm text-[#8b8b9e]">📊 Live interview activity feed</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── STATS BAR ───────────────────────────────────────────────── */}
            <section className="py-12 border-y border-[#1e1e2e] bg-[#111118]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            { icon: Users, val: "10,000+", label: "Interviews Conducted" },
                            { icon: TrendingUp, val: "95%", label: "Recruiter Satisfaction" },
                            { icon: Clock, val: "130ms", label: "Voice Latency" },
                            { icon: Globe, val: "35+", label: "Languages Supported" },
                        ].map(s => (
                            <div key={s.label} className="flex flex-col items-center gap-2">
                                <s.icon className="w-6 h-6 text-[#6c47ff]" />
                                <p className="text-3xl font-bold text-white">{s.val}</p>
                                <p className="text-sm text-[#8b8b9e]">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── HOW IT WORKS ────────────────────────────────────────────── */}
            <section id="how-it-works" className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">How It Works</p>
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Hire smarter in 5 steps</h2>
                        <p className="text-[#8b8b9e] text-lg max-w-2xl mx-auto">From posting a job to making a hiring decision — fully automated.</p>
                    </div>

                    <div className="grid md:grid-cols-5 gap-6">
                        {steps.map((step, i) => (
                            <div key={step.step} className="relative">
                                {i < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-8 left-1/2 w-full h-px bg-gradient-to-r from-[#6c47ff]/50 to-transparent z-0" />
                                )}
                                <div className="card relative z-10 text-center p-6 hover:border-[#6c47ff]/30 transition-colors">
                                    <div className="text-xs font-bold text-[#6c47ff] mb-3">{step.step}</div>
                                    <div className="w-12 h-12 rounded-xl bg-[#6c47ff]/10 flex items-center justify-center mx-auto mb-4">
                                        <step.icon className="w-6 h-6 text-[#6c47ff]" />
                                    </div>
                                    <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                                    <p className="text-sm text-[#8b8b9e] leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── FEATURES ────────────────────────────────────────────────── */}
            <section id="features" className="py-24 px-6 bg-[#111118]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">Features</p>
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Everything you need to hire at scale</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {features.map(f => (
                            <div key={f.title} className="card group hover:border-[#6c47ff]/30 transition-all hover:-translate-y-1 duration-300">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6c47ff]/20 to-purple-600/10 flex items-center justify-center mb-4 group-hover:from-[#6c47ff]/30 transition-colors">
                                    <f.icon className="w-6 h-6 text-[#6c47ff]" />
                                </div>
                                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                                <p className="text-sm text-[#8b8b9e] leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── TESTIMONIALS ────────────────────────────────────────────── */}
            <section className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">Testimonials</p>
                        <h2 className="text-4xl font-bold text-white mb-4">Loved by recruiting teams</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {testimonials.map(t => (
                            <div key={t.name} className="card hover:border-[#6c47ff]/20 transition-colors">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#eab308] text-[#eab308]" />)}
                                </div>
                                <p className="text-[#8b8b9e] text-sm leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                        {t.name.split(" ").map(n => n[0]).join("")}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white text-sm">{t.name}</p>
                                        <p className="text-xs text-[#8b8b9e]">{t.role} at {t.company}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── PRICING ─────────────────────────────────────────────────── */}
            <section id="pricing" className="py-24 px-6 bg-[#111118]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">Pricing</p>
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Simple, transparent pricing</h2>
                        <p className="text-[#8b8b9e] text-lg">Start free, scale as you grow.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {plans.map(plan => (
                            <div key={plan.name} className={`card relative flex flex-col ${plan.primary ? "border-[#6c47ff]/50 bg-gradient-to-b from-[#6c47ff]/5 to-transparent" : ""}`}>
                                {plan.primary && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-[#6c47ff] to-purple-600 text-white">MOST POPULAR</span>
                                    </div>
                                )}
                                <p className="font-semibold text-white mb-1">{plan.name}</p>
                                <div className="mb-2">
                                    <span className="text-4xl font-black text-white">{plan.price === "Custom" ? "" : "$"}{plan.price}</span>
                                    <span className="text-[#8b8b9e] text-sm">{plan.period}</span>
                                </div>
                                <p className="text-sm text-[#8b8b9e] mb-6">{plan.desc}</p>
                                <ul className="space-y-3 mb-8 flex-1">
                                    {plan.features.map(f => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-[#e2e2ef]">
                                            <Check className="w-4 h-4 text-[#6c47ff] shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/sign-up"
                                    className={`text-center py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${plan.primary ? "btn-primary" : "border border-[#1e1e2e] hover:bg-[#1e1e2e] text-[#e2e2ef]"}`}>
                                    {plan.cta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── FOOTER ──────────────────────────────────────────────────── */}
            <footer className="py-12 px-6 border-t border-[#1e1e2e]">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-10">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold text-white">HireFlow AI</span>
                            </div>
                            <p className="text-sm text-[#8b8b9e] leading-relaxed">The AI recruiting platform that automates your entire hiring pipeline.</p>
                        </div>
                        {[
                            { title: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
                            { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
                            { title: "Legal", links: ["Privacy", "Terms", "Cookies", "Security"] },
                        ].map(col => (
                            <div key={col.title}>
                                <p className="font-semibold text-white mb-3 text-sm">{col.title}</p>
                                <ul className="space-y-2">
                                    {col.links.map(l => (
                                        <li key={l}><a href="#" className="text-sm text-[#8b8b9e] hover:text-white transition-colors">{l}</a></li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-[#1e1e2e]">
                        <p className="text-sm text-[#8b8b9e]">© 2025 HireFlow AI. All rights reserved.</p>
                        <div className="flex items-center gap-4 mt-4 md:mt-0">
                            {["Twitter", "LinkedIn", "GitHub"].map(s => (
                                <a key={s} href="#" className="text-sm text-[#8b8b9e] hover:text-white transition-colors">{s}</a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
