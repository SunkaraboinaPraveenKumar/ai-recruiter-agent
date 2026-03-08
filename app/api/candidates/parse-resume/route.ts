import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { parseResume } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
    const { user, response } = requireAuth(req);
    if (response) return response;

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Read file as buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Dynamically import pdf-parse (it uses CommonJS)
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(buffer);
        const resumeText = pdfData.text;

        if (!resumeText?.trim()) {
            return NextResponse.json({ error: "Could not extract text from PDF" }, { status: 400 });
        }

        const profile = await parseResume(resumeText);
        return NextResponse.json({ profile, resume_text: resumeText });
    } catch (error) {
        console.error("Resume parse error:", error);
        return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 });
    }
}
