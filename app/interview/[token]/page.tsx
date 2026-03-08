"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Zap, Mic, MicOff, Video, VideoOff, PhoneOff, CheckCircle, Clock } from "lucide-react";

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
    const [cameraOff, setCameraOff] = useState(false);
    const [startTime] = useState(Date.now());
    const [elapsed, setElapsed] = useState(0);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(5);
    const [voiceId, setVoiceId] = useState("en-US-Neural2-F");
    const [completing, setCompleting] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
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
    const speakText = useCallback(async (text: string) => {
        setAiSpeaking(true);
        try {
            const res = await fetch("/api/murf/speak", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, voiceId }),
            });
            if (!res.ok || !res.body) {
                // Fallback: use browser TTS
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.onend = () => setAiSpeaking(false);
                speechSynthesis.speak(utterance);
                return;
            }

            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }
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
            source.onended = () => setAiSpeaking(false);
            source.start();
        } catch {
            // Fallback
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => setAiSpeaking(false);
            speechSynthesis.speak(utterance);
        }
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
        }
    }, [sessionId, token, currentQuestion, questionsAnswered, speakText]);

    // Keep the ref in sync so startListening can call it without being in its deps
    submitAnswerRef.current = submitAnswer;

    // Start speech recognition
    const startListening = useCallback(() => {
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
        };

        recognition.start();
        setListening(true);
    }, [details]);

    // Start interview
    const startInterview = async () => {
        if (!candidateName.trim()) return;
        try {
            // Get camera
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        } catch {
            // Camera denied, proceed without video
        }

        const res = await fetch(`/api/interview/${token}/start`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidateName }),
        });
        const data = await res.json();
        if (!data.sessionId) { alert("Failed to start interview"); return; }

        setSessionId(data.sessionId);
        setCurrentQuestion(data.firstQuestion || "");
        const aiEntry: TranscriptLine = { role: "ai", text: data.firstQuestion, timestamp: new Date().toISOString() };
        setTranscript([aiEntry]);
        setStep("interview");

        await speakText(data.firstQuestion);
        startListening();
    };

    const endInterview = async () => {
        if (!confirm("End the interview early?")) return;
        if (recognitionRef.current) recognitionRef.current.abort();
        setCompleting(true);
        await fetch(`/api/interview/${token}/complete`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
        });
        setStep("complete");
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
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-white text-sm">HireFlow AI</span>
                    </div>
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
                                {["A friendly AI interviewer will ask you questions", "Answer verbally — the AI will listen and transcribe", `After ${details.silenceTimeout}s of silence, the next question begins`, "You'll be asked to consent to camera & microphone", "The whole process takes ~${details.estimatedDuration}"].map((tip, i) => (
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
                                    ["Camera", "Recommended (optional)"],
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
                                disabled={!candidateName.trim()}
                                className="btn-primary w-full text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Mic className="w-5 h-5" />
                                Start Interview
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
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#6c47ff]" />
                    <span className="text-sm font-medium text-white">HireFlow AI Interview</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-[#8b8b9e]">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(elapsed)}</span>
                    <span className="text-[#6c47ff]">{questionsAnswered}/{totalQuestions} Q</span>
                </div>
            </div>

            <div className="flex-1 grid md:grid-cols-5 gap-4 p-4 max-h-[calc(100vh-48px)]">
                {/* Left — video + AI avatar */}
                <div className="md:col-span-3 flex flex-col gap-4">
                    <div className="relative flex-1 rounded-2xl overflow-hidden bg-[#111118] border border-[#1e1e2e]">
                        {/* Candidate webcam */}
                        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
                        {cameraOff && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#111118]">
                                <VideoOff className="w-12 h-12 text-[#8b8b9e]" />
                            </div>
                        )}

                        {/* AI Avatar overlay */}
                        <div className="absolute top-4 left-4 flex flex-col items-center gap-2">
                            <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center text-2xl ${aiSpeaking ? "ai-speaking" : ""}`}>
                                🤖
                            </div>
                            <span className="text-xs bg-black/50 px-2 py-0.5 rounded-full text-white">{details.aiName}</span>
                            {aiSpeaking && <span className="text-xs text-[#6c47ff] animate-pulse">Speaking...</span>}
                        </div>

                        {/* Current question */}
                        {currentQuestion && (
                            <div className="absolute bottom-16 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-xl p-3">
                                <p className="text-xs text-[#8b8b9e] mb-1">{details.aiName} asks:</p>
                                <p className="text-sm text-white">{currentQuestion}</p>
                            </div>
                        )}

                        {/* Listening indicator */}
                        {listening && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-3 py-1">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-xs text-red-400">Listening...</span>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4">
                        <button onClick={() => setMuted(!muted)}
                            className={`p-3 rounded-full border transition-colors ${muted ? "bg-red-500/20 border-red-500/30 text-red-400" : "border-[#1e1e2e] text-[#8b8b9e] hover:text-white"}`}>
                            {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                        <button onClick={() => setCameraOff(!cameraOff)}
                            className={`p-3 rounded-full border transition-colors ${cameraOff ? "bg-red-500/20 border-red-500/30 text-red-400" : "border-[#1e1e2e] text-[#8b8b9e] hover:text-white"}`}>
                            {cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                        </button>
                        <button onClick={endInterview} disabled={completing}
                            className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60">
                            <PhoneOff className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Right — Transcript */}
                <div className="md:col-span-2 flex flex-col">
                    <div className="card flex-1 flex flex-col overflow-hidden">
                        <h3 className="font-semibold text-white mb-3 text-sm shrink-0">Live Transcript</h3>
                        <div ref={transcriptRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {transcript.map((t, i) => (
                                <div key={i} className={`flex ${t.role === "candidate" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[85%] rounded-xl px-3 py-2 ${t.role === "candidate" ? "bg-[#6c47ff]/20 ml-4" : "bg-[#1e1e2e] mr-4"}`}>
                                        <p className="text-xs text-[#8b8b9e] mb-0.5 font-medium">
                                            {t.role === "ai" ? details.aiName : "You"}
                                        </p>
                                        <p className="text-xs text-[#e2e2ef] leading-relaxed">{t.text}</p>
                                    </div>
                                </div>
                            ))}
                            {interimText && (
                                <div className="flex justify-end">
                                    <div className="max-w-[85%] rounded-xl px-3 py-2 bg-[#6c47ff]/10 border border-[#6c47ff]/20 ml-4">
                                        <p className="text-xs text-[#8b8b9e] mb-0.5">You (typing...)</p>
                                        <p className="text-xs text-[#8b8b9e] italic">{interimText}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
