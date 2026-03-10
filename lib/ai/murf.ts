// Murf Falcon TTS streaming proxy helper

export interface MurfSpeakOptions {
    text: string;
    voiceId?: string;   // Murf short voice name e.g. "natalie", "terrell", "ken"
    locale?: string;    // e.g. "en-US"
    model?: string;     // "FALCON" (fast/realtime) or "GEN2" (studio quality)
    format?: string;    // "MP3" | "WAV" | "OGG" | "PCM"
    sampleRate?: number;
}

export async function streamMurfAudio(options: MurfSpeakOptions): Promise<ReadableStream<Uint8Array>> {
    const {
        text,
        voiceId = "natalie",       // Murf short voice name (not locale format)
        locale = "en-US",
        model = "FALCON",          // FALCON is best for real-time/low-latency
        format = "MP3",
        sampleRate = 24000,
    } = options;

    const apiKey = process.env.MURF_API_KEY;
    if (!apiKey) {
        throw new Error("MURF_API_KEY environment variable is not set. Please add it to your .env.local file.");
    }

    const payload = {
        text,
        voice_id: voiceId,
        locale,
        model,
        format,
        sample_rate: sampleRate,
    };

    const res = await fetch("https://global.api.murf.ai/v1/speech/stream", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Murf API error: ${res.status} — ${err}`);
    }

    if (!res.body) throw new Error("No streaming body from Murf API");

    return res.body;
}
