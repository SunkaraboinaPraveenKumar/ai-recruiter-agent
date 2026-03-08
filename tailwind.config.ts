import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./app/**/*.{ts,tsx}",
        "./lib/**/*.{ts,tsx}",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: { "2xl": "1400px" },
        },
        extend: {
            colors: {
                background: "#0a0a0f",
                surface: "#111118",
                border: "#1e1e2e",
                primary: {
                    DEFAULT: "#6c47ff",
                    foreground: "#ffffff",
                },
                muted: {
                    DEFAULT: "#1e1e2e",
                    foreground: "#8b8b9e",
                },
                accent: {
                    DEFAULT: "#6c47ff",
                    foreground: "#ffffff",
                },
                destructive: {
                    DEFAULT: "#ef4444",
                    foreground: "#ffffff",
                },
                success: "#22c55e",
                warning: "#eab308",
                error: "#ef4444",
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-purple": "linear-gradient(135deg, #6c47ff 0%, #a855f7 100%)",
                "gradient-dark": "linear-gradient(135deg, #0a0a0f 0%, #111118 100%)",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            borderRadius: {
                lg: "0.75rem",
                md: "0.5rem",
                sm: "0.375rem",
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "fade-in": "fadeIn 0.5s ease-in-out",
                "slide-up": "slideUp 0.4s ease-out",
                "glow": "glow 2s ease-in-out infinite alternate",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { transform: "translateY(20px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                glow: {
                    "0%": { boxShadow: "0 0 20px rgba(108, 71, 255, 0.3)" },
                    "100%": { boxShadow: "0 0 40px rgba(108, 71, 255, 0.8)" },
                },
            },
        },
    },
    plugins: [],
};
