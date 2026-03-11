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
    const [startTime] = useState(Date.now());
    const [elapsed, setElapsed] = useState(0);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(5);
    const [voiceId, setVoiceId] = useState("natalie");
    const [completing, setCompleting] = useState(false);
    const [showEndDialog, setShowEndDialog] = useState(false);
    const [starting, setStarting] = useState(false);

    const transcriptRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const finalAnswerRef = useRef("");
    const audioContextRef = useRef<AudioContext | null>(null);
    const submitAnswerRef = useRef<((answer: string) => Promise<void>) | null>(null);
    const isSubmittingRef = useRef(false); // Prevent duplicate submissions

    // Fetch invite details
    useEffect(() => {
        fetch(`/api/interview/${token}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) { setError(d.error); return; }
                setDetails(d);
                setTotalQuestions(d.questionCount);
                setVoiceId(d.voiceId);
                // Use full name if available, otherwise format email name
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

    // Optimized Murf TTS with faster fallback
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
                if (contentType?.includes("application/json")) {
                    throw new Error("Murf returned fallback");
                }

                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                const ctx = audioContextRef.current;
                
                if (ctx.state === 'suspended') {
                    await ctx.resume();
                }

                const chunks: Uint8Array[] = [];
                const reader = res.body!.getReader();
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                
                const audioData = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
                let offset = 0;
                for (const c of chunks) { 
                    audioData.set(c, offset); 
                    offset += c.length; 
                }
                
                const decoded = await ctx.decodeAudioData(audioData.buffer);
                const source = ctx.createBufferSource();
                source.buffer = decoded;
                source.connect(ctx.destination);
                source.onended = () => { 
                    setAiSpeaking(false); 
                    resolve(); 
                };
                source.start();
            } catch (error) {
                console.warn("Murf TTS failed, using browser fallback:", error);
                // Fast browser TTS fallback
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = "en-US";
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                
                const voices = speechSynthesis.getVoices();
                const preferredVoice = voices.find(v => 
                    v.lang.startsWith("en") && 
                    (v.name.includes("Google") || v.name.includes("Microsoft") || v.name.includes("Natural"))
                ) || voices.find(v => v.lang.startsWith("en") && v.default) || voices.find(v => v.lang.startsWith("en"));
                
                if (preferredVoice) utterance.voice = preferredVoice;
                
                utterance.onend = () => { 
                    setAiSpeaking(false); 
                    resolve(); 
                };
                utterance.onerror = () => { 
                    setAiSpeaking(false); 
                    resolve(); 
                };
                speechSynthesis.speak(utterance);
            }
        });
    }, [voiceId]);
    // Submit answer and get next question
    const submitAnswer = useCallback(async (answer: string) => {
        if (!answer.trim() || !sessionId || isSubmittingRef.current) return;
        
        isSubmittingRef.current = true; // Prevent duplicate submissions

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
            toast.error("Failed to submit answer. Please try again.");
        } finally {
            isSubmittingRef.current = false; // Reset flag
        }
    }, [sessionId, token, currentQuestion, questionsAnswered, speakText]);

    submitAnswerRef.current = submitAnswer;

    // Optimized speech recognition
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
        isSubmittingRef.current = false; // Reset submission flag

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
            // Only submit if we haven't already submitted via timeout
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

    // Error state
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

    // Complete Screen
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
    // Waiting Room
    if (step === "waiting") {
        const typeLabel = details.interviewType === "technical" ? "Technical Round" :
            details.interviewType === "hr_final" ? "HR Final Round" : "Screening Round";

        return (
            <div className="min-h-screen bg-[#0a0a0f]">
                <header className="h-14 flex items-center px-6 border-b border-[#1e1e2e]">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="HireFlow AI" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-white text-sm">HireFlow AI</span>
                    </Link>
                </header>

                <div className="max-w-5xl mx-auto p-6 grid md:grid-cols-2 gap-6 pt-10">
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
    // Interview Room - Optimized UI matching reference design
    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
            {/* Top bar - Enhanced design */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-[#1e1e2e] bg-[#111118]">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="HireFlow AI" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-white font-semibold">HireFlow AI Interview</span>
                    </Link>
                    <div className="flex items-center gap-2 ml-4">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-sm text-[#8b8b9e]">LIVE ROOM • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-[#8b8b9e]">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(elapsed)}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#6c47ff]/20 rounded-full border border-[#6c47ff]/30">
                        <div className="w-2 h-2 rounded-full bg-[#6c47ff]" />
                        <span className="text-xs text-[#6c47ff] font-medium">VIDEO CONNECTION</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-6 p-6 overflow-hidden">
                {/* Main content area - 70% */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Video panels - 50/50 split */}
                    <div className="grid grid-cols-2 gap-6 h-[45vh] min-h-[320px]">
                        {/* AI Interviewer */}
                        <div className="relative rounded-2xl overflow-hidden bg-[#1a1a24] border border-[#2a2a3a] flex flex-col items-center justify-center shadow-2xl">
                            <div className="absolute top-4 left-4 z-10">
                                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-[#6c47ff] animate-pulse" />
                                    <span className="text-xs text-white font-medium">{details.aiName} (AI)</span>
                                </div>
                            </div>

                            <div className="absolute top-4 right-4 z-10">
                                <button className="p-2 bg-black/40 backdrop-blur-sm rounded-full border border-white/10 hover:bg-black/60 transition-colors">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>

                            <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center text-5xl shadow-2xl transition-all duration-300 ${aiSpeaking ? "ai-speaking scale-110 ring-4 ring-[#6c47ff]/40" : "animate-pulse"}`}>
                                🤖
                            </div>
                            
                            {aiSpeaking && (
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-1 h-4 bg-[#6c47ff] rounded-full animate-pulse" style={{animationDelay: '0ms'}} />
                                        <div className="w-1 h-6 bg-[#6c47ff] rounded-full animate-pulse" style={{animationDelay: '150ms'}} />
                                        <div className="w-1 h-4 bg-[#6c47ff] rounded-full animate-pulse" style={{animationDelay: '300ms'}} />
                                    </div>
                                    <span className="text-xs text-[#6c47ff] font-medium">Speaking...</span>
                                </div>
                            )}

                            <div className="absolute bottom-4 left-4 right-4 z-10">
                                <div className="bg-black/70 backdrop-blur-md rounded-xl p-3 border border-white/10">
                                    <p className="text-xs text-[#8b8b9e] mb-1">{details.aiName}</p>
                                    <p className="text-sm text-white leading-relaxed line-clamp-2">
                                        {currentQuestion || "Preparing next question..."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Candidate */}
                        <div className="relative rounded-2xl overflow-hidden bg-[#1a1a24] border border-[#2a2a3a] flex flex-col items-center justify-center shadow-2xl">
                            <div className="absolute top-4 left-4 z-10">
                                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                                    <span className="text-xs text-white font-medium">{candidateName} (You)</span>
                                </div>
                            </div>

                            {listening && !muted && (
                                <div className="absolute top-4 right-4 z-10">
                                    <div className="flex items-center gap-2 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-full px-3 py-1 animate-pulse">
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        <span className="text-xs text-red-400 font-medium">LISTENING</span>
                                    </div>
                                </div>
                            )}

                            <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-5xl shadow-2xl text-white font-bold transition-all duration-300 ${listening && !muted ? "scale-110 ring-4 ring-blue-500/40" : ""}`}>
                                {candidateName.charAt(0).toUpperCase()}
                            </div>

                            <div className="absolute bottom-6 flex items-center gap-3 z-10">
                                <button onClick={() => setMuted(!muted)}
                                    className={`p-3 rounded-full border transition-all hover:scale-105 shadow-lg ${muted ? "bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30" : "bg-black/50 backdrop-blur-md border-white/10 text-white hover:bg-black/70"}`}>
                                    {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                </button>
                                <button onClick={confirmEndInterview}
                                    className="p-3 rounded-full bg-red-600 text-white hover:bg-red-500 transition-all hover:scale-105 shadow-lg shadow-red-500/20">
                                    <PhoneOff className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Transcript area */}
                    <div className="flex-1 bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-6 flex flex-col overflow-hidden">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#2a2a3a]">
                            <div className="w-3 h-3 rounded-full bg-[#6c47ff] shadow-[0_0_10px_rgba(108,71,255,0.6)]" />
                            <h3 className="font-semibold text-white">Live Transcript</h3>
                        </div>

                        <div ref={transcriptRef} className="flex-1 overflow-y-auto space-y-4 pr-3 scrollbar-thin scrollbar-thumb-[#2a2a3a] scrollbar-track-transparent">
                            {transcript.map((t, i) => (
                                <div key={i} className={`flex ${t.role === "candidate" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${t.role === "candidate" ? "bg-[#6c47ff]/20 ml-4 border border-[#6c47ff]/20 rounded-tr-sm" : "bg-[#2a2a3a]/80 mr-4 border border-white/5 rounded-tl-sm"}`}>
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
                {/* Right sidebar - 30% - Matching reference design */}
                <div className="w-80 flex flex-col gap-4">
                    {/* AI Interview Copilot */}
                    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#6c47ff]/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-[#6c47ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">AI Interview Copilot</h3>
                                <p className="text-xs text-[#8b8b9e]">LIVE TRANSCRIPTION</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-3 bg-[#2a2a3a]/50 rounded-lg border border-[#3a3a4a]">
                                <p className="text-xs text-[#8b8b9e] mb-1 uppercase tracking-wide">SYSTEM</p>
                                <p className="text-sm text-white">Connected to AI Agent. Your speech will be transcribed live in real-time.</p>
                            </div>

                            <div className="p-3 bg-[#2a2a3a]/50 rounded-lg border border-[#3a3a4a]">
                                <p className="text-xs text-[#8b8b9e] mb-1 uppercase tracking-wide">AI ASSIST</p>
                                <p className="text-sm text-white">Hello! Thank you for joining us today. I am the AI interviewer for {details.companyName}.</p>
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-[#6c47ff]/10 rounded-lg border border-[#6c47ff]/20">
                                <div className="w-2 h-2 rounded-full bg-[#6c47ff] animate-pulse" />
                                <span className="text-xs text-[#6c47ff] font-medium">ENCRYPTED ROOM</span>
                            </div>
                        </div>
                    </div>

                    {/* Interview Progress */}
                    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-6">
                        <h3 className="font-semibold text-white mb-4">Interview Progress</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-[#8b8b9e]">Questions</span>
                                    <span className="text-sm text-white font-medium">{questionsAnswered}/{totalQuestions}</span>
                                </div>
                                <div className="w-full bg-[#2a2a3a] rounded-full h-2">
                                    <div className="bg-[#6c47ff] h-2 rounded-full transition-all duration-300" style={{width: `${(questionsAnswered / totalQuestions) * 100}%`}} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-[#8b8b9e]">Duration</span>
                                    <span className="text-sm text-white font-medium">{formatTime(elapsed)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-6">
                        <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <button className="w-full p-3 bg-[#2a2a3a]/50 hover:bg-[#2a2a3a] rounded-lg border border-[#3a3a4a] text-left transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <Mic className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-white font-medium">Ask AI Copilot for help</p>
                                        <p className="text-xs text-[#8b8b9e]">Get assistance with your answers</p>
                                    </div>
                                </div>
                            </button>
                        </div>
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