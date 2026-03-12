"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Mic, MicOff, PhoneOff, CheckCircle, Clock, Video, VideoOff, Settings, MonitorUp, Shield, Send, ChevronRight } from "lucide-react";

interface InterviewDetails {
    jobTitle: string;
    companyName: string;
    interviewType: string;
    candidateEmail: string;
    candidateFullName: string;
    estimatedDuration: string;
    questionCount: number;
    silenceTimeout: number;
    aiName: string;
    voiceId: string;
    inviteId: string;
}

interface TranscriptLine {
    role: "ai" | "candidate";
    text: string;
    timestamp: string;
}

type Step = "waiting" | "interview" | "complete";

export default function InterviewPage() {
    const { token } = useParams<{ token: string }>();
    const [step, setStep] = useState<Step>("waiting");
    const [details, setDetails] = useState<InterviewDetails | null>(null);
    const [error, setError] = useState("");
    const [candidateName, setCandidateName] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [currentQuestion, setCurrentQuestion] = useState("");
    const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
    const [listening, setListening] = useState(false);
    const [aiSpeaking, setAiSpeaking] = useState(false);
    const [interimText, setInterimText] = useState("");
    const [muted, setMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(true);
    const [startTime] = useState(Date.now());
    const [elapsed, setElapsed] = useState(0);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(5);
    const [voiceId, setVoiceId] = useState("natalie");
    const [completing, setCompleting] = useState(false);
    const [showEndDialog, setShowEndDialog] = useState(false);
    const [starting, setStarting] = useState(false);
    const [copilotInput, setCopilotInput] = useState("");
    const [copilotMessages, setCopilotMessages] = useState<{role: string; text: string}[]>([]);

    const transcriptRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const finalAnswerRef = useRef("");
    const audioContextRef = useRef<AudioContext | null>(null);
    const submitAnswerRef = useRef<((answer: string) => Promise<void>) | null>(null);
    const isSubmittingRef = useRef(false);

    useEffect(() => {
        fetch(`/api/interview/${token}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) { setError(d.error); return; }
                setDetails(d);
                setTotalQuestions(d.questionCount);
                setVoiceId(d.voiceId);
                if (d.candidateFullName) {
                    setCandidateName(d.candidateFullName);
                } else {
                    const emailName = d.candidateEmail.split("@")[0];
                    const formattedName = emailName.split('.').map((part: string) =>
                        part.charAt(0).toUpperCase() + part.slice(1)
                    ).join(' ');
                    setCandidateName(formattedName);
                }
            })
            .catch(() => setError("Failed to load interview details"));
    }, [token]);

    useEffect(() => {
        if (step !== "interview") return;
        const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
        return () => clearInterval(t);
    }, [step, startTime]);

    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcript, interimText]);

    const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    const speakText = useCallback((text: string) => {
        return new Promise<void>(async (resolve) => {
            setAiSpeaking(true);
            try {
                const res = await fetch("/api/murf/speak", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text, voiceId }),
                });
                if (!res.ok) throw new Error("Murf failed");
                const contentType = res.headers.get("content-type");
                if (contentType?.includes("application/json")) throw new Error("Murf returned fallback");
                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                const ctx = audioContextRef.current;
                if (ctx.state === 'suspended') await ctx.resume();
                const chunks: Uint8Array[] = [];
                const reader = res.body!.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                const audioData = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
                let offset = 0;
                for (const c of chunks) { audioData.set(c, offset); offset += c.length; }
                const decoded = await ctx.decodeAudioData(audioData.buffer);
                const source = ctx.createBufferSource();
                source.buffer = decoded;
                source.connect(ctx.destination);
                source.onended = () => { setAiSpeaking(false); resolve(); };
                source.start();
            } catch {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = "en-US";
                utterance.rate = 1.0;
                const voices = speechSynthesis.getVoices();
                const preferredVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Microsoft"))) || voices.find(v => v.lang.startsWith("en"));
                if (preferredVoice) utterance.voice = preferredVoice;
                utterance.onend = () => { setAiSpeaking(false); resolve(); };
                utterance.onerror = () => { setAiSpeaking(false); resolve(); };
                speechSynthesis.speak(utterance);
            }
        });
    }, [voiceId]);

    const submitAnswer = useCallback(async (answer: string) => {
        if (!answer.trim() || !sessionId || isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        const candidateEntry: TranscriptLine = { role: "candidate", text: answer, timestamp: new Date().toISOString() };
        setTranscript(p => [...p, candidateEntry]);
        setInterimText("");
        setListening(false);
        try {
            const res = await fetch(`/api/interview/${token}/answer`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, question: currentQuestion, answer }),
            });
            const data = await res.json();
            setQuestionsAnswered(data.questions_answered || questionsAnswered + 1);
            if (data.is_complete || !data.next_question) {
                setCompleting(true);
                await fetch(`/api/interview/${token}/complete`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId }),
                });
                setStep("complete");
            } else {
                const nextQ = data.next_question;
                setCurrentQuestion(nextQ);
                const aiEntry: TranscriptLine = { role: "ai", text: nextQ, timestamp: new Date().toISOString() };
                setTranscript(p => [...p, aiEntry]);
                await speakText(nextQ);
                startListening();
            }
        } catch (err) {
            console.error("Answer submit error:", err);
            toast.error("Failed to submit answer.");
        } finally {
            isSubmittingRef.current = false;
        }
    }, [sessionId, token, currentQuestion, questionsAnswered, speakText]);

    submitAnswerRef.current = submitAnswer;

    const startListening = useCallback(() => {
        if (muted || completing || showEndDialog) return;
        const w = window as any;
        const SpeechRecog = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!SpeechRecog) return;
        if (recognitionRef.current) recognitionRef.current.abort();
        const recognition = new SpeechRecog();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognitionRef.current = recognition;
        finalAnswerRef.current = "";
        isSubmittingRef.current = false;
        recognition.onresult = (event: any) => {
            let interim = "";
            let final = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const r = event.results[i];
                if (r.isFinal) { final += r[0].transcript + " "; }
                else { interim += r[0].transcript; }
            }
            if (final) finalAnswerRef.current += final;
            setInterimText(interim);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            const timeout = (details?.silenceTimeout || 3) * 1000;
            silenceTimerRef.current = setTimeout(() => {
                if (finalAnswerRef.current.trim() && !isSubmittingRef.current) {
                    recognition.stop();
                    submitAnswerRef.current?.(finalAnswerRef.current.trim());
                }
            }, timeout);
        };
        recognition.onend = () => {
            setListening(false);
            if (finalAnswerRef.current.trim() && !completing && !showEndDialog && !isSubmittingRef.current) {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                submitAnswerRef.current?.(finalAnswerRef.current.trim());
            }
        };
        recognition.start();
        setListening(true);
    }, [muted, completing, showEndDialog, details]);

    useEffect(() => {
        if (muted && recognitionRef.current) {
            recognitionRef.current.abort();
            setListening(false);
        } else if (!muted && step === "interview" && !aiSpeaking && !completing && !showEndDialog) {
            startListening();
        }
    }, [muted, step, aiSpeaking, completing, showEndDialog, startListening]);

    const startInterview = async () => {
        if (!candidateName.trim() || starting) return;
        setStarting(true);
        try {
            try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { toast.error("Microphone access recommended."); }
            const res = await fetch(`/api/interview/${token}/start`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ candidateName }),
            });
            const data = await res.json();
            if (!data.sessionId) { toast.error("Failed to start interview"); setStarting(false); return; }
            setSessionId(data.sessionId);
            setCurrentQuestion(data.firstQuestion || "");
            const aiEntry: TranscriptLine = { role: "ai", text: data.firstQuestion, timestamp: new Date().toISOString() };
            setTranscript([aiEntry]);
            setStep("interview");
            setCopilotMessages([
                { role: "system", text: "Connected to AI Agent. Your speech will be transcribed live in real-time." },
                { role: "ai", text: `Hello! Thank you for joining us today. I am the AI Interviewer for ${details?.companyName}.` }
            ]);
            await speakText(data.firstQuestion);
            startListening();
        } catch {
            toast.error("Failed to start interview.");
        } finally {
            setStarting(false);
        }
    };

    const confirmEndInterview = () => setShowEndDialog(true);
    const performEndInterview = async () => {
        if (recognitionRef.current) recognitionRef.current.abort();
        setCompleting(true);
        try {
            await fetch(`/api/interview/${token}/complete`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId }),
            });
        } finally {
            setStep("complete");
            setShowEndDialog(false);
            setCompleting(false);
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">Interview Unavailable</h1>
                    <p className="text-[#8b8b9e]">{error}</p>
                </div>
            </div>
        );
    }

    if (!details) {
        return (
            <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-[#6c47ff] border-t-transparent animate-spin" />
                    <p className="text-[#8b8b9e] text-sm">Loading interview...</p>
                </div>
            </div>
        );
    }

    // Complete Screen
    if (step === "complete") {
        return (
            <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center p-6">
                <div className="text-center max-w-lg">
                    <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Interview Complete!</h1>
                    <p className="text-lg text-[#8b8b9e] mb-6">Thank you, {candidateName}. 🎉</p>
                    <div className="bg-[#13131e] border border-[#1e1e30] rounded-2xl p-6 mb-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div><p className="text-2xl font-bold text-[#6c47ff]">{questionsAnswered}/{totalQuestions}</p><p className="text-xs text-[#8b8b9e] mt-1">Questions Answered</p></div>
                            <div><p className="text-2xl font-bold text-green-400">{formatTime(elapsed)}</p><p className="text-xs text-[#8b8b9e] mt-1">Duration</p></div>
                        </div>
                    </div>
                    <p className="text-[#8b8b9e] text-sm leading-relaxed">Your responses have been submitted. The recruiter will review and be in touch soon.</p>
                </div>
            </div>
        );
    }

    // Waiting Room
    if (step === "waiting") {
        const typeLabel = details.interviewType === "technical" ? "Technical Round" :
            details.interviewType === "hr_final" ? "HR Final Round" : "Screening Round";

        return (
            <div className="min-h-screen bg-[#0d0d14]">
                <header className="h-14 flex items-center px-6 border-b border-[#1a1a28]">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="HireFlow AI" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-white text-sm">HireFlow AI</span>
                    </Link>
                </header>
                <div className="max-w-5xl mx-auto p-6 grid md:grid-cols-2 gap-6 pt-10">
                    <div className="space-y-4">
                        <div className="bg-[#13131e] border border-[#1e1e30] rounded-2xl p-5">
                            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-[#6c47ff]/20 flex items-center justify-center text-xs text-[#6c47ff]">ℹ</span>
                                Interview Details
                            </h3>
                            <div className="space-y-3">
                                {[["Position", details.jobTitle], ["Company", details.companyName], ["Type", typeLabel], ["Duration", details.estimatedDuration], ["Questions", String(details.questionCount)]].map(([l, v]) => (
                                    <div key={l} className="flex justify-between items-center text-sm">
                                        <span className="text-[#8b8b9e]">{l}</span>
                                        <span className="text-white font-medium">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-[#13131e] border border-[#1e1e30] rounded-2xl p-5">
                            <h3 className="font-semibold text-white mb-3">What to Expect</h3>
                            <ul className="space-y-2 text-sm text-[#8b8b9e]">
                                {["A friendly AI interviewer will ask you questions", "Answer verbally — the AI will listen and transcribe", `After ${details.silenceTimeout}s of silence, the next question begins`, `The whole process takes ~${details.estimatedDuration}`].map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2"><span className="text-[#6c47ff] mt-0.5 shrink-0">→</span>{tip}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="bg-[#13131e] border border-[#1e1e30] rounded-2xl p-5">
                            <h3 className="font-semibold text-white mb-4">Your Information</h3>
                            <p className="text-xs text-[#8b8b9e] mb-3">Please confirm your name before starting</p>
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Full Name *</label>
                            <input value={candidateName} onChange={e => setCandidateName(e.target.value)}
                                className="w-full bg-[#1a1a28] border border-[#2a2a40] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#6c47ff] transition-colors placeholder:text-[#4a4a60]"
                                placeholder="Your full name" />
                        </div>
                        <div className="bg-[#13131e] border border-[#1e1e30] rounded-2xl p-5">
                            <h3 className="font-semibold text-white mb-4">Ready to Begin?</h3>
                            <ul className="space-y-2 mb-6">
                                {[["Microphone", "Required for answering questions"], ["Quiet environment", "Reduce background noise"]].map(([item, desc]) => (
                                    <li key={item} className="flex items-center gap-3 text-sm">
                                        <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs">✓</span>
                                        <div><span className="text-white font-medium">{item}</span><span className="text-[#8b8b9e] ml-2">— {desc}</span></div>
                                    </li>
                                ))}
                            </ul>
                            <button onClick={startInterview} disabled={!candidateName.trim() || starting}
                                className="w-full bg-gradient-to-r from-[#6c47ff] to-purple-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                                {starting ? (<><div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />Preparing Interview...</>) : (<><Mic className="w-5 h-5" />Start Interview</>)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ===== INTERVIEW ROOM =====
    const progressPct = Math.round((questionsAnswered / totalQuestions) * 100);

    return (
        // FIX 1: h-screen + overflow-hidden locks the entire page to the viewport — no page-level scroll
        <div className="h-screen bg-[#080810] flex flex-col font-sans overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── TOP BAR — shrink-0 keeps it fixed height, never grows ── */}
            <div className="h-[52px] shrink-0 flex items-center justify-between px-5 bg-[#0e0e1a] border-b border-[#1c1c2e]">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center overflow-hidden shrink-0">
                            <img src="/logo.png" alt="HireFlow AI" className="w-full h-full object-cover" />
                        </div>
                    </Link>
                    <div>
                        <p className="text-white text-sm font-semibold leading-tight">{details.jobTitle} Interview</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] text-[#8b8b9e] uppercase tracking-wide">Live Room • {formatTime(elapsed)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#6c47ff]/10 border border-[#6c47ff]/25 rounded-full">
                        <Shield className="w-3 h-3 text-[#6c47ff]" />
                        <span className="text-[10px] text-[#6c47ff] font-semibold tracking-wide uppercase">Encrypted Room</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs text-[#8b8b9e]">Stable Connection</span>
                    </div>
                </div>
            </div>

            {/* ── MAIN LAYOUT — flex-1 + min-h-0 fills remaining height without overflow ── */}
            <div className="flex-1 flex min-h-0 overflow-hidden">

                {/* LEFT: video panels + transcript */}
                {/* FIX 2: min-h-0 is critical — without it flex-1 children can blow past the parent */}
                <div className="flex-1 flex flex-col p-4 gap-4 min-w-0 min-h-0 overflow-hidden">

                    {/* VIDEO PANELS — shrink-0 prevents them from being squeezed by transcript */}
                    <div className="grid grid-cols-2 gap-4 shrink-0" style={{ height: "46vh" }}>

                        {/* AI Interviewer panel */}
                        <div className="relative rounded-2xl overflow-hidden bg-[#0e0e1a] border border-[#1c1c2e] flex flex-col items-center justify-center shadow-xl">
                            {/* subtle grid bg */}
                            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#6c47ff 1px,transparent 1px),linear-gradient(90deg,#6c47ff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

                            {/* top-left label */}
                            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                                <div className={`w-1.5 h-1.5 rounded-full ${aiSpeaking ? "bg-[#6c47ff] animate-pulse" : "bg-[#4a4a60]"}`} />
                                <span className="text-[11px] text-white font-medium">{details.aiName} <span className="text-[#6c47ff]">(AI)</span></span>
                            </div>

                            {/* AI avatar */}
                            <div className={`relative flex flex-col items-center transition-all duration-300 ${aiSpeaking ? "scale-105" : ""}`}>
                                <div className={`w-28 h-28 rounded-full bg-gradient-to-br from-[#4a2fd4] to-[#7c3aed] flex items-center justify-center shadow-2xl border-2 transition-all duration-300 ${aiSpeaking ? "border-[#6c47ff] shadow-[0_0_40px_rgba(108,71,255,0.5)]" : "border-[#2a2a44]"}`}>
                                    <span className="text-5xl select-none">🤖</span>
                                </div>
                                {aiSpeaking && (
                                    <div className="mt-3 flex items-center gap-1.5">
                                        {[0, 150, 300, 150, 0].map((delay, i) => (
                                            <div key={i} className="w-[3px] rounded-full bg-[#6c47ff] animate-pulse"
                                                style={{ height: `${[12, 20, 28, 20, 12][i]}px`, animationDelay: `${delay}ms` }} />
                                        ))}
                                        <span className="text-xs text-[#6c47ff] ml-1 font-medium">Speaking…</span>
                                    </div>
                                )}
                                {!aiSpeaking && listening && (
                                    <div className="mt-3 flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-[#4a4a60]" />
                                        <span className="text-xs text-[#4a4a60]">Listening to you…</span>
                                    </div>
                                )}
                            </div>

                            {/* bottom question bubble */}
                            <div className="absolute bottom-3 left-3 right-3 z-10">
                                <div className="bg-black/70 backdrop-blur-md rounded-xl p-3 border border-white/8">
                                    <p className="text-[10px] text-[#6c47ff] font-semibold uppercase tracking-wider mb-1">{details.aiName}</p>
                                    <p className="text-xs text-[#d0d0e8] leading-relaxed line-clamp-3">{currentQuestion || "Preparing…"}</p>
                                </div>
                            </div>

                            {/* AI INTERVIEWER badge */}
                            <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2">
                                <div className="bg-[#6c47ff] text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                                    AI Interviewer
                                </div>
                            </div>
                        </div>

                        {/* Candidate panel */}
                        <div className="relative rounded-2xl overflow-hidden bg-[#0e0e1a] border border-[#1c1c2e] flex flex-col items-center justify-center shadow-xl">
                            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #3b82f6 0%, transparent 60%)" }} />

                            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                <span className="text-[11px] text-white font-medium">{candidateName} <span className="text-blue-400">(You)</span></span>
                            </div>

                            {listening && !muted && (
                                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 px-2.5 py-1 rounded-full animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                    <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wide">Listening</span>
                                </div>
                            )}

                            {/* candidate avatar */}
                            <div className={`relative flex flex-col items-center transition-all duration-300 ${listening && !muted ? "scale-105" : ""}`}>
                                {cameraOff ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className={`w-28 h-28 rounded-full bg-gradient-to-br from-blue-700 to-cyan-600 flex items-center justify-center text-5xl font-bold text-white shadow-2xl border-2 transition-all duration-300 ${listening && !muted ? "border-blue-400 shadow-[0_0_40px_rgba(59,130,246,0.4)]" : "border-[#2a2a44]"}`}>
                                            {candidateName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-xs text-[#5a5a78]">Camera is disabled</span>
                                    </div>
                                ) : (
                                    <div className={`w-28 h-28 rounded-full bg-gradient-to-br from-blue-700 to-cyan-600 flex items-center justify-center text-5xl font-bold text-white shadow-2xl border-2 ${listening && !muted ? "border-blue-400" : "border-[#2a2a44]"}`}>
                                        {candidateName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {/* controls */}
                            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 z-10">
                                <button onClick={() => setMuted(!muted)}
                                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-110 shadow-lg ${muted ? "bg-red-500/20 border-red-500/50 text-red-400" : "bg-black/60 backdrop-blur-md border-white/10 text-white hover:bg-white/10"}`}>
                                    {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                </button>
                                <button onClick={() => setCameraOff(!cameraOff)}
                                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-110 shadow-lg ${cameraOff ? "bg-[#2a2a40] border-[#3a3a55] text-[#6b6b88]" : "bg-black/60 backdrop-blur-md border-white/10 text-white hover:bg-white/10"}`}>
                                    {cameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                                </button>
                                <button onClick={confirmEndInterview}
                                    className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-500 transition-all hover:scale-110 shadow-lg shadow-red-500/30">
                                    <PhoneOff className="w-4 h-4" />
                                </button>
                                <button className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-[#8b8b9e] hover:text-white hover:bg-white/10 transition-all hover:scale-110">
                                    <MonitorUp className="w-4 h-4" />
                                </button>
                                <button className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-[#8b8b9e] hover:text-white hover:bg-white/10 transition-all hover:scale-110">
                                    <Settings className="w-4 h-4" />
                                </button>
                            </div>

                            {/* bottom label */}
                            <div className="absolute bottom-[68px] left-3">
                                <span className="text-[11px] text-[#6b6b88]">{candidateName} (You)</span>
                            </div>
                        </div>
                    </div>

                    {/* TRANSCRIPT — flex-1 + min-h-0 makes ONLY this panel scroll */}
                    {/* FIX 3: flex-1 min-h-0 ensures this takes remaining space and clips properly */}
                    <div className="flex-1 min-h-0 bg-[#0e0e1a] border border-[#1c1c2e] rounded-2xl flex flex-col overflow-hidden">
                        {/* Header — shrink-0 so it never scrolls away */}
                        <div className="px-5 py-3 border-b border-[#1c1c2e] flex items-center gap-2.5 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-[#6c47ff] shadow-[0_0_8px_rgba(108,71,255,0.8)]" />
                            <span className="text-sm font-semibold text-white">Live Transcript</span>
                            <div className="ml-auto flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] text-[#8b8b9e] uppercase tracking-wide">Auto-scrolling</span>
                            </div>
                        </div>

                        {/* Scrollable messages — this is the ONLY element that scrolls on the left */}
                        <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth"
                            style={{ scrollbarWidth: "thin", scrollbarColor: "#2a2a40 transparent" }}>
                            {transcript.map((t, i) => (
                                <div key={i} className={`flex gap-2.5 ${t.role === "candidate" ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-sm font-bold shadow-md ${t.role === "ai" ? "bg-gradient-to-br from-[#4a2fd4] to-[#7c3aed] text-white" : "bg-gradient-to-br from-blue-700 to-cyan-600 text-white"}`}>
                                        {t.role === "ai" ? "🤖" : candidateName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className={`max-w-[72%] ${t.role === "candidate" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${t.role === "ai" ? "text-[#6c47ff]" : "text-blue-400"}`}>
                                                {t.role === "ai" ? details.aiName : "You"}
                                            </span>
                                            <span className="text-[9px] text-[#4a4a60]">
                                                {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${t.role === "ai"
                                            ? "bg-[#1a1a2e] border border-[#2a2a44] text-[#d0d0e8] rounded-tl-sm"
                                            : "bg-[#6c47ff]/15 border border-[#6c47ff]/20 text-[#d0d0e8] rounded-tr-sm"}`}>
                                            {t.text}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Interim (typing) bubble */}
                            {interimText && (
                                <div className="flex gap-2.5 flex-row-reverse">
                                    <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-sm font-bold bg-gradient-to-br from-blue-700 to-cyan-600 text-white shadow-md">
                                        {candidateName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="max-w-[72%] flex flex-col gap-1 items-end">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">You</span>
                                            <span className="text-[9px] text-[#6c47ff] animate-pulse font-semibold">typing…</span>
                                        </div>
                                        <div className="bg-[#6c47ff]/8 border border-[#6c47ff]/15 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-[#8b8b9e] italic leading-relaxed">
                                            {interimText}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR */}
                {/* FIX 4: min-h-0 + overflow-hidden on sidebar prevents it from expanding beyond viewport */}
                <div className="w-[300px] shrink-0 flex flex-col border-l border-[#1c1c2e] bg-[#0a0a14] min-h-0 overflow-hidden">

                    {/* Copilot header — shrink-0 keeps it fixed, never pushed off screen */}
                    <div className="p-4 border-b border-[#1c1c2e] shrink-0">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-[#6c47ff]/20 border border-[#6c47ff]/30 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-[#6c47ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-white">AI Interview Copilot</p>
                                <p className="text-[10px] text-[#8b8b9e] uppercase tracking-wide">Live Transcription</p>
                            </div>
                            <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] text-emerald-400 font-semibold">Active</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a28] rounded-full w-fit border border-[#2a2a40]">
                            <span className="text-[10px] text-[#6b6b88] uppercase tracking-wider">Session Summary Enabled</span>
                        </div>
                    </div>

                    {/* Copilot messages — flex-1 + min-h-0 makes ONLY this scroll inside the sidebar */}
                    {/* FIX 5: min-h-0 on this div is what allows overflow-y-auto to actually clip content */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
                        style={{ scrollbarWidth: "thin", scrollbarColor: "#1c1c2e transparent" }}>
                        {copilotMessages.map((msg, i) => (
                            <div key={i} className="space-y-1">
                                <p className="text-[9px] text-[#4a4a60] uppercase tracking-widest font-bold">
                                    {msg.role === "system" ? "System" : "AI Agent"} <span className="text-[#6c47ff]">{msg.role === "ai" ? "ACTIVE" : ""}</span>
                                </p>
                                <div className="bg-[#13131e] border border-[#1e1e30] rounded-xl p-3">
                                    <p className="text-xs text-[#c0c0d8] leading-relaxed">{msg.text}</p>
                                </div>
                            </div>
                        ))}

                        <div className="flex items-center gap-2 px-3 py-2 bg-[#6c47ff]/8 rounded-xl border border-[#6c47ff]/15 mt-2">
                            <Shield className="w-3.5 h-3.5 text-[#6c47ff]" />
                            <span className="text-[10px] text-[#6c47ff] font-semibold uppercase tracking-wide">Secure Private Session</span>
                        </div>
                    </div>

                    {/* Progress section — shrink-0 keeps it pinned above the input */}
                    <div className="p-4 border-t border-[#1c1c2e] space-y-4 shrink-0">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-[#6b6b88]">Progress</span>
                                <span className="text-xs text-white font-semibold">{questionsAnswered}/{totalQuestions} questions</span>
                            </div>
                            <div className="w-full bg-[#1a1a28] rounded-full h-1.5">
                                <div className="bg-gradient-to-r from-[#6c47ff] to-purple-400 h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPct}%` }} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-[#6b6b88]" />
                                <span className="text-xs text-[#6b6b88]">Duration</span>
                            </div>
                            <span className="text-xs text-white font-mono font-semibold">{formatTime(elapsed)}</span>
                        </div>
                    </div>

                    {/* Copilot input — shrink-0 pins it to the bottom always */}
                    <div className="p-3 border-t border-[#1c1c2e] shrink-0">
                        <div className="flex items-center gap-2 bg-[#13131e] border border-[#2a2a40] rounded-xl px-3 py-2 focus-within:border-[#6c47ff]/50 transition-colors">
                            <input
                                value={copilotInput}
                                onChange={e => setCopilotInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && copilotInput.trim()) {
                                        setCopilotMessages(p => [...p, { role: "user", text: copilotInput }]);
                                        setCopilotInput("");
                                    }
                                }}
                                placeholder="Ask AI Copilot for help"
                                className="flex-1 bg-transparent text-xs text-white placeholder:text-[#4a4a60] outline-none min-w-0"
                            />
                            <button
                                onClick={() => {
                                    if (copilotInput.trim()) {
                                        setCopilotMessages(p => [...p, { role: "user", text: copilotInput }]);
                                        setCopilotInput("");
                                    }
                                }}
                                className="w-6 h-6 rounded-lg bg-[#6c47ff] flex items-center justify-center shrink-0 hover:bg-[#7c57ff] transition-colors">
                                <Send className="w-3 h-3 text-white" />
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                            <Shield className="w-3 h-3 text-[#3a3a55]" />
                            <span className="text-[9px] text-[#3a3a55] uppercase tracking-wider">Secure Private Session</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── END DIALOG ── */}
            {showEndDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0e0e1a] border border-[#1c1c2e] rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                        {completing ? (
                            <div className="text-center py-6">
                                <div className="w-12 h-12 rounded-full border-4 border-[#6c47ff] border-t-transparent animate-spin mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">Finalizing Interview</h3>
                                <p className="text-[#8b8b9e] text-sm">Generating your AI report…</p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-white mb-2">End Interview?</h3>
                                <p className="text-[#8b8b9e] text-sm mb-6">Are you sure you want to end? Unsubmitted answers will be lost.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowEndDialog(false)} className="flex-1 py-2.5 rounded-xl bg-[#1a1a28] border border-[#2a2a40] text-white text-sm font-medium hover:bg-[#2a2a40] transition-colors">Cancel</button>
                                    <button onClick={performEndInterview} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors">End Call</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}