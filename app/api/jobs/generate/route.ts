import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { generateJobDescription } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
    const { user, response } = requireAuth(req);
    if (response) return response;

    const { title } = await req.json();
    if (!title?.trim()) {
        return NextResponse.json({ error: "Job title is required" }, { status: 400 });
    }

    try {
        const jobData = await generateJobDescription(title);
        return NextResponse.json({ job: jobData });
    } catch (error) {
        console.error("Generate job error:", error);
        return NextResponse.json({ error: "Failed to generate job description" }, { status: 500 });
    }
}
