// Murf Falcon TTS streaming proxy helper - Optimized for low latency

export interface MurfSpeakOptions {
    text: string;
    voiceId?: string;   // Murf short voice name e.g. "natalie", "terrell", "ken"
    locale?: string;    // e.g. "en-US"
    model?: string;     // "FALCON" (fast/realtime) or "GEN2" (studio quality)
    format?: string;    // "MP3" | "WAV" | "OGG" | "PCM"
    sampleRate?: number;
    channelType?: string; // "MONO" | "STEREO"
    encodeAsBase64?: boolean;
    variation?: number;
    audioDuration?: number;
    style?: string;
    modelVersion?: string;
}

export async function streamMurfAudio(options: MurfSpeakOptions): Promise<ReadableStream<Uint8Array>> {
    const {
        text,
        voiceId = "natalie",
        locale = "en-US",
        model = "FALCON",          // FALCON for lowest latency
        format = "MP3",
        sampleRate = 24000,        // Optimized for web streaming
        channelType = "MONO",      // MONO reduces bandwidth
        encodeAsBase64 = false,
        variation = 1,
        audioDuration = 0,
        style = "Conversational",
        modelVersion = "falcon-1.0",
    } = options;

    const apiKey = process.env.MURF_API_KEY;
    if (!apiKey) {
        throw new Error("MURF_API_KEY environment variable is not set. Please add it to your .env.local file.");
    }

    // Optimized payload for fastest response
    const payload = {
        voiceId,
        text,
        format,
        sampleRate,
        channelType,
        encodeAsBase64,
        variation,
        audioDuration,
        style,
        modelVersion,
    };

    const res = await fetch("https://api.murf.ai/v1/speech/stream", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
        },
        body: JSON.stringify(payload),
        // Add timeout and keep-alive for better performance
        signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!res.ok) {
        const err = await res.text();
        console.error("Murf API error:", err);
        throw new Error(`Murf API error: ${res.status} — ${err}`);
    }

    if (!res.body) throw new Error("No streaming body from Murf API");

    return res.body;
}
