"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "sonner";
import { Eye, EyeOff, Zap, Check } from "lucide-react";

function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: "8+ characters", ok: password.length >= 8 },
        { label: "Uppercase", ok: /[A-Z]/.test(password) },
        { label: "Number", ok: /\d/.test(password) },
        { label: "Special char", ok: /[!@#$%^&*]/.test(password) },
    ];
    const score = checks.filter(c => c.ok).length;
    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];
    const labels = ["Weak", "Fair", "Good", "Strong"];

    if (!password) return null;

    return (
        <div className="mt-2">
            <div className="flex gap-1 mb-1">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : "bg-[#1e1e2e]"}`} />
                ))}
            </div>
            <div className="flex justify-between items-center">
                {score > 0 && <span className={`text-xs ${["text-red-400", "text-orange-400", "text-yellow-400", "text-green-400"][score - 1]}`}>{labels[score - 1]}</span>}
                <div className="flex gap-2 ml-auto">
                    {checks.map((c, i) => (
                        <span key={i} className={`text-xs flex items-center gap-0.5 ${c.ok ? "text-green-400" : "text-[#8b8b9e]"}`}>
                            {c.ok && <Check className="w-3 h-3" />}{c.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function SignUpPage() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [terms, setTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { register } = useAuth();
    const router = useRouter();

    const validate = () => {
        const e: Record<string, string> = {};
        if (!fullName.trim()) e.fullName = "Full name is required";
        if (!email) e.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
        if (!password) e.password = "Password is required";
        else if (password.length < 8) e.password = "Password must be at least 8 characters";
        if (!confirmPassword) e.confirmPassword = "Please confirm your password";
        else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
        if (!terms) e.terms = "You must accept the terms";
        return e;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setLoading(true);
        try {
            await register(fullName, email, password);
            toast.success("Account created! Welcome to HireFlow AI.");
            router.push("/dashboard");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden py-10">
            <div className="absolute inset-0 bg-gradient-radial from-[#6c47ff]/10 via-transparent to-transparent" />
            <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl" />

            <div className="relative z-10 w-full max-w-md px-4">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6c47ff] to-purple-600 flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="HireFlow AI" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xl font-bold text-white">HireFlow AI</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
                    <p className="text-[#8b8b9e] text-sm">Start hiring smarter with AI</p>
                </div>

                <div className="card">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Full Name</label>
                            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                                className={`input-field ${errors.fullName ? "border-red-500" : ""}`} placeholder="Jane Smith" />
                            {errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                className={`input-field ${errors.email ? "border-red-500" : ""}`} placeholder="you@company.com" />
                            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Password</label>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className={`input-field pr-10 ${errors.password ? "border-red-500" : ""}`} placeholder="••••••••" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8b9e] hover:text-[#e2e2ef] transition-colors">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <PasswordStrength password={password} />
                            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#e2e2ef] mb-1.5">Confirm Password</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                className={`input-field ${errors.confirmPassword ? "border-red-500" : ""}`} placeholder="••••••••" />
                            {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
                        </div>
                        <div>
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)}
                                    className="mt-0.5 accent-[#6c47ff]" />
                                <span className="text-sm text-[#8b8b9e]">
                                    I agree to the{" "}
                                    <Link href="#" className="text-[#6c47ff] hover:text-purple-400">Terms of Service</Link>
                                    {" "}and{" "}
                                    <Link href="#" className="text-[#6c47ff] hover:text-purple-400">Privacy Policy</Link>
                                </span>
                            </label>
                            {errors.terms && <p className="mt-1 text-xs text-red-400">{errors.terms}</p>}
                        </div>

                        <button type="submit" disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none">
                            {loading ? (
                                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>Creating account...</>
                            ) : "Create Account"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-[#8b8b9e] mt-6">
                        Already have an account?{" "}
                        <Link href="/sign-in" className="text-[#6c47ff] hover:text-purple-400 font-medium transition-colors">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
