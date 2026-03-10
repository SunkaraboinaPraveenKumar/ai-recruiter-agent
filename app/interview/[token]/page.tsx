"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Mic, MicOff, PhoneOff, CheckCircle, Clock } from "lucide-react";

interface InterviewDetails {
    jobTitle: string;
    companyName: string;
    interviewType: string;
    candidateEmail: string;
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
    const [startTime] = useState(Date.now());
    const [elapsed, setElapsed] = useState(0);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(5);
    const [voiceId, setVoiceId] = useState("natalie"); // Murf short voice name
    const [completing, setCompleting] = useState(false);
    const [showEndDialog, setShowEndDialog] = useState(false);
    const [starting, setStarting] = useState(false);

    const transcriptRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const finalAnswerRef = useRef("");
    const audioContextRef = useRef<AudioContext | null>(null);
    // Use a ref for submitAnswer to break the circular dependency with startListening
    const submitAnswerRef = useRef<((answer: string) => Promise<void>) | null>(null);

    // Fetch invite details
    useEffect(() => {
        fetch(`/api/interview/${token}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) { setError(d.error); return; }
                setDetails(d);
                setTotalQuestions(d.questionCount);
                setVoiceId(d.voiceId);
                setCandidateName(d.candidateEmail.split("@")[0]);
            })
            .catch(() => setError("Failed to load interview details"));
    }, [token]);

    // Timer
    useEffect(() => {
        if (step !== "interview") return;
        const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
        return () => clearInterval(t);
    }, [step, startTime]);

    // Auto-scroll transcript
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcript, interimText]);

    const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    // Play AI audio via Murf proxy
    const speakText = useCallback((text: string) => {
        return new Promise<void>(async (resolve) => {
            setAiSpeaking(true);
            try {
                const res = await fetch("/api/murf/speak", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text, voiceId }),
                });
                if (!res.ok || !res.body) throw new Error("Murf failed");

                if (!audioContextRef.current) audioContextRef.current = new window.AudioContext();
                const ctx = audioContextRef.current;
                const chunks: Uint8Array[] = [];
                const reader = res.body.getReader();
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
                // Fallback to browser TTS with best available English voice
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = "en-US";
                utterance.rate = 0.95;
                // Try to find a natural-sounding English voice
                const voices = speechSynthesis.getVoices();
                const englishVoice = voices.find(v => v.lang.startsWith("en") && !v.name.toLowerCase().includes("zira"))
                    || voices.find(v => v.lang.startsWith("en"));
                if (englishVoice) utterance.voice = englishVoice;
                utterance.onend = () => { setAiSpeaking(false); resolve(); };
                utterance.onerror = () => { setAiSpeaking(false); resolve(); };
                speechSynthesis.speak(utterance);
            }
        });
    }, [voiceId]);

    // Submit answer and get next question
    const submitAnswer = useCallback(async (answer: string) => {
        if (!answer.trim() || !sessionId) return;

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
                // Complete interview
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
            toast.error("Failed to submit answer. Please try again.");
        }
    }, [sessionId, token, currentQuestion, questionsAnswered, speakText]);

    // Keep the ref in sync so startListening can call it without being in its deps
    submitAnswerRef.current = submitAnswer;

    // Start speech recognition
    const startListening = useCallback(() => {
        if (muted || completing || showEndDialog) return;
        // Access SpeechRecognition with window casts for cross-browser support
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            // Reset silence timer
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            const timeout = (details?.silenceTimeout || 3) * 1000;
            silenceTimerRef.current = setTimeout(() => {
                if (finalAnswerRef.current.trim()) {
                    recognition.stop();
                    submitAnswerRef.current?.(finalAnswerRef.current.trim());
                }
            }, timeout);
        };

        recognition.onend = () => {
            setListening(false);
            // If the recognition engine stops (e.g., due to a pause or noise), and we have a final answer,
            // submit it instead of leaving the user hanging forever.
            if (finalAnswerRef.current.trim() && !completing && !showEndDialog) {
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

    // Start interview
    const startInterview = async () => {
        if (!candidateName.trim() || starting) return;
        setStarting(true);
        try {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch {
                toast.error("Microphone access is recommended for the best experience.");
            }

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

            await speakText(data.firstQuestion);
            startListening();
        } catch (error) {
            console.error("Failed to start:", error);
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

    // ─── Error state ──────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
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
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-[#6c47ff] border-t-transparent animate-spin" />
                    <p className="text-[#8b8b9e] text-sm">Loading interview...</p>
                </div>
            </div>
        );
    }

    // ─── Complete Screen ──────────────────────────────────────────────────────────
    if (step === "complete") {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
                <div className="text-center max-w-lg">
                    <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Interview Complete!</h1>
                    <p className="text-lg text-[#8b8b9e] mb-6">Thank you, {candidateName}. 🎉</p>
                    <div className="card mb-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div><p className="text-2xl font-bold text-[#6c47ff]">{questionsAnswered}/{totalQuestions}</p><p className="text-xs text-[#8b8b9e] mt-1">Questions Answered</p></div>
                            <div><p className="text-2xl font-bold text-green-400">{formatTime(elapsed)}</p><p className="text-xs text-[#8b8b9e] mt-1">Duration</p></div>
                        </div>
                    </div>
                    <p className="text-[#8b8b9e] text-sm leading-relaxed">
                        Your responses have been submitted successfully. The recruiter will review your interview and be in touch soon. You may now close this window.
                    </p>
                </div>
            </div>
        );
    }

    // ─── Waiting Room ─────────────────────────────────────────────────────────────
    if (step === "waiting") {
        const typeLabel = details.interviewType === "technical" ? "Technical Round" :
            details.interviewType === "hr_final" ? "HR Final Round" : "Screening Round";

        return (
            <div className="min-h-screen bg-[#0a0a0f]">
                {/* Header */}
                <header className="h-14 flex items-center px-6 border-b border-[#1e1e2e]">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="HireFlow AI" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-white text-sm">HireFlow AI</span>
                    </Link>
                </header>

                <div className="max-w-5xl mx-auto p-6 grid md:grid-cols-2 gap-6 pt-10">
                    {/* Left column */}
                    <div className="space-y-4">
                        <div className="card">
                            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-[#6c47ff]/20 flex items-center justify-center text-xs text-[#6c47ff]">ℹ</span>
                                Interview Details
                            </h3>
                            <div className="space-y-3">
                                {[
                                    ["Position", details.jobTitle],
                                    ["Company", details.companyName],
                                    ["Type", typeLabel],
                                    ["Duration", details.estimatedDuration],
                                    ["Questions", String(details.questionCount)],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between items-center text-sm">
                                        <span className="text-[#8b8b9e]">{l}</span>
                                        <span className="text-white font-medium">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="font-semibold text-white mb-3">What to Expect</h3>
                            <ul className="space-y-2 text-sm text-[#8b8b9e]">
                                {[
                                    "A friendly AI interviewer will ask you questions",
                                    "Answer verbally — the AI will listen and transcribe",
                                    `After ${details.silenceTimeout}s of silence, the next question begins`,
                                    `The whole process takes ~${details.estimatedDuration}`
                                ].map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2"><span className="text-[#6c47ff] mt-0.5 shrink-0">→</span>{tip}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-4">
                        <div className="card">
                            <h3 className="font-semibold text-white mb-4">Your Information</h3>
                            <p className="text-xs text-[#8b8b9e] mb-3">Please confirm your name before starting</p>
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Full Name *</label>
                            <input value={candidateName} onChange={e => setCandidateName(e.target.value)}
                                className="input-field" placeholder="Your full name" />
                        </div>

                        <div className="card">
                            <h3 className="font-semibold text-white mb-4">Ready to Begin?</h3>
                            <ul className="space-y-2 mb-6">
                                {[
                                    ["Microphone", "Required for answering questions"],
                                    ["Quiet environment", "Reduce background noise"],
                                ].map(([item, desc]) => (
                                    <li key={item} className="flex items-center gap-3 text-sm">
                                        <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs">✓</span>
                                        <div>
                                            <span className="text-white font-medium">{item}</span>
                                            <span className="text-[#8b8b9e] ml-2">— {desc}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={startInterview}
                                disabled={!candidateName.trim() || starting}
                                className="btn-primary w-full text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {starting ? (
                                    <>
                                        <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                        Preparing Interview...
                                    </>
                                ) : (
                                    <>
                                        <Mic className="w-5 h-5" />
                                        Start Interview
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Interview Room ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
            {/* Top bar */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-[#1e1e2e] bg-[#111118]">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
                    <span className="text-sm font-medium text-white">HireFlow AI Interview</span>
                </Link>
                <div className="flex items-center gap-4 text-sm text-[#8b8b9e]">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(elapsed)}</span>
                    <span className="text-[#6c47ff]">{questionsAnswered}/{totalQuestions} Q</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-4 p-4 overflow-hidden max-h-[calc(100vh-48px)]">
                {/* Top Half: 50/50 Split */}
                <div className="grid md:grid-cols-2 gap-4 h-[45vh] min-h-[300px] shrink-0">
                    {/* Left: AI Bot */}
                    <div className="relative rounded-2xl overflow-hidden bg-[#111118] border border-[#1e1e2e] flex flex-col items-center justify-center shadow-lg">
                        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm z-10">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-xs text-white font-medium">{details.aiName} (AI)</span>
                        </div>

                        <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center text-5xl shadow-xl shadow-[#6c47ff]/20 transition-all duration-300 ${aiSpeaking ? "ai-speaking scale-105" : "animate-pulse"}`}>
                            🤖
                        </div>
                        {aiSpeaking && <p className="text-xs text-[#6c47ff] mt-4 font-medium animate-pulse">Speaking...</p>}

                        {currentQuestion && (
                            <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md rounded-xl p-3 border border-white/10 z-10 transition-all">
                                <p className="text-xs text-[#8b8b9e] mb-1 font-medium select-none">Current Question:</p>
                                <p className="text-sm text-white leading-relaxed line-clamp-2">{currentQuestion}</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Me (Candidate) */}
                    <div className="relative rounded-2xl overflow-hidden bg-[#111118] border border-[#1e1e2e] flex flex-col items-center justify-center shadow-lg">
                        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm z-10">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            <span className="text-xs text-white font-medium">You</span>
                        </div>

                        {listening && !muted && (
                            <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-3 py-1 animate-pulse z-10">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Listening</span>
                            </div>
                        )}
                        {muted && (
                            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/40 border border-white/5 rounded-full px-3 py-1 z-10">
                                <MicOff className="w-3 h-3 text-[#8b8b9e]" />
                                <span className="text-[10px] uppercase font-bold text-[#8b8b9e] tracking-wider">Muted</span>
                            </div>
                        )}

                        <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-5xl shadow-xl shadow-blue-500/20 text-white font-bold transition-all duration-300 ${listening && !muted ? "scale-105 ring-4 ring-blue-500/30" : ""}`}>
                            {candidateName.charAt(0).toUpperCase()}
                        </div>

                        {/* Controls */}
                        <div className="absolute bottom-6 flex items-center gap-4 z-10">
                            <button onClick={() => setMuted(!muted)}
                                className={`p-4 rounded-full border transition-all hover:scale-105 shadow-lg ${muted ? "bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30" : "bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-black/70"}`}>
                                {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                            </button>
                            <button onClick={confirmEndInterview} disabled={step !== "interview"}
                                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-500 transition-all hover:scale-105 shadow-lg shadow-red-500/20 disabled:opacity-60 disabled:hover:scale-100">
                                <PhoneOff className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Half: Transcript */}
                <div className="flex-1 card flex flex-col overflow-hidden border border-[#1e1e2e]/60 bg-[#16161f]/50">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1e1e2e]/50 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#6c47ff] shadow-[0_0_10px_rgba(108,71,255,0.6)]" />
                        <h3 className="font-semibold text-white text-sm">Live Transcript</h3>
                    </div>

                    <div ref={transcriptRef} className="flex-1 overflow-y-auto space-y-4 pr-3 scrollbar-thin scrollbar-thumb-[#1e1e2e] scrollbar-track-transparent">
                        {transcript.map((t, i) => (
                            <div key={i} className={`flex ${t.role === "candidate" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${t.role === "candidate" ? "bg-[#6c47ff]/20 ml-4 border border-[#6c47ff]/20 rounded-tr-sm" : "bg-[#1e1e2e]/80 mr-4 border border-white/5 rounded-tl-sm"}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-[11px] font-bold uppercase tracking-wider ${t.role === "ai" ? "text-[#6c47ff]" : "text-blue-400"}`}>
                                            {t.role === "ai" ? `🤖 ${details.aiName}` : "👤 You"}
                                        </span>
                                        <span className="text-[#8b8b9e] text-[10px] font-medium opacity-60">
                                            {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[#e2e2ef] leading-relaxed">{t.text}</p>
                                </div>
                            </div>
                        ))}
                        {interimText && (
                            <div className="flex justify-end">
                                <div className="max-w-[75%] rounded-2xl px-5 py-3 bg-[#6c47ff]/5 border border-[#6c47ff]/10 ml-4 rounded-tr-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">👤 You</span>
                                        <span className="text-[#6c47ff] text-[10px] uppercase font-bold animate-pulse tracking-wider">typing...</span>
                                    </div>
                                    <p className="text-sm text-[#8b8b9e] italic leading-relaxed">{interimText}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* End Call Dialog */}
            {showEndDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in duration-200">
                        {completing ? (
                            <div className="text-center py-6">
                                <div className="w-12 h-12 rounded-full border-4 border-[#6c47ff] border-t-transparent animate-spin mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">Finalizing Interview</h3>
                                <p className="text-[#8b8b9e] text-sm">Generating your AI report...</p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-white mb-2">End Interview?</h3>
                                <p className="text-[#8b8b9e] text-sm mb-6">Are you sure you want to end this interview? If you have unsubmitted answers, they will be lost.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowEndDialog(false)} className="flex-1 btn-primary bg-[#1e1e2e] !text-white hover:bg-[#2e2e44] shadow-none border-0" style={{ backgroundImage: "none" }}>Cancel</button>
                                    <button onClick={performEndInterview} className="flex-1 btn-primary !bg-red-500 hover:!bg-red-600 !text-white shadow-none border-0" style={{ backgroundImage: "none" }}>End Call</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
