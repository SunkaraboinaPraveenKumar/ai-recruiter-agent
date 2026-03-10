import { NextRequest, NextResponse } from "next/server";
import { streamMurfAudio } from "@/lib/ai/murf";

export async function POST(req: NextRequest) {
    try {
        const { text, voiceId, locale } = await req.json();
        if (!text?.trim()) return NextResponse.json({ error: "Text is required" }, { status: 400 });

        const stream = await streamMurfAudio({
            text,
            voiceId: voiceId || "natalie",
            locale: locale || "en-US",
            model: "FALCON",
        });

        return new NextResponse(stream, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Transfer-Encoding": "chunked",
            },
        });
    } catch (error) {
        console.error("Murf speak error:", error);
        return NextResponse.json({ error: "TTS failed" }, { status: 500 });
    }
}
