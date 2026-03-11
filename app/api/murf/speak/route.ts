import { NextRequest, NextResponse } from "next/server";
import { streamMurfAudio } from "@/lib/ai/murf";
import { text } from "stream/consumers";

export async function POST(req: NextRequest) {
    try {
        const { text, voiceId, locale } = await req.json();
        if (!text?.trim()) return NextResponse.json({ error: "Text is required" }, { status: 400 });

        // Optimized streaming with FALCON model for lowest latency
        const stream = await streamMurfAudio({
            text,
            voiceId: voiceId || "natalie",
            locale: locale || "en-US",
            model: "FALCON",
            format: "MP3",
            sampleRate: 24000,
            channelType: "MONO", // Reduces bandwidth
            style: "Conversational",
            modelVersion: "falcon-1.0",
        });

        return new NextResponse(stream, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Transfer-Encoding": "chunked",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error) {
        console.error("Murf speak error:", error);
        // Return no-audio signal so client can fall back to browser TTS
        return NextResponse.json({ noAudio: true, text }, { status: 200 });
    }
}
