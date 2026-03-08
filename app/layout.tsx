import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/hooks/useAuth";

export const metadata: Metadata = {
    title: "HireFlow AI — AI-Powered Recruiting",
    description: "Automate your entire hiring pipeline with AI. Post jobs, match candidates, conduct voice interviews, and make hiring decisions — all automated.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
            <body className="bg-[#0a0a0f] text-[#e2e2ef] antialiased">
                <AuthProvider>
                    {children}
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: "#111118",
                                border: "1px solid #1e1e2e",
                                color: "#e2e2ef",
                            },
                        }}
                    />
                </AuthProvider>
            </body>
        </html>
    );
}
