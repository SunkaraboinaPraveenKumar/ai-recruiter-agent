// Murf Falcon TTS streaming proxy helper

export interface MurfSpeakOptions {
    text: string;
    voiceId: string;
    model?: string;
    format?: string;
    sampleRate?: number;
}

export async function streamMurfAudio(options: MurfSpeakOptions): Promise<ReadableStream<Uint8Array>> {
    const { text, voiceId, model = "GEN2", format = "MP3", sampleRate = 24000 } = options;

    const res = await fetch("https://api.murf.ai/v1/speech/stream", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": process.env.MURF_API_KEY!,
        },
        body: JSON.stringify({ text, voiceId, model, format, sampleRate }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Murf API error: ${res.status} — ${err}`);
    }

    if (!res.body) throw new Error("No streaming body from Murf API");

    return res.body;
}
