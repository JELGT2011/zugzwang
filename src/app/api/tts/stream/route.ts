import { z } from "zod/v4";

export const maxDuration = 60;

const RequestSchema = z.object({
    text: z.string().min(1).max(2000),
    voiceId: z.string().optional(),
});

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const ELEVENLABS_MODEL = "eleven_flash_v2_5";

export async function POST(request: Request) {
    if (!process.env.ELEVENLABS_API_KEY) {
        return Response.json(
            { error: "ELEVENLABS_API_KEY is not configured" },
            { status: 500 }
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json(
            { error: "Invalid request", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const voiceId =
        parsed.data.voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;

    const upstream = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
        {
            method: "POST",
            headers: {
                "xi-api-key": process.env.ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
            },
            body: JSON.stringify({
                text: parsed.data.text,
                model_id: ELEVENLABS_MODEL,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.0,
                    use_speaker_boost: true,
                },
            }),
        }
    );

    if (!upstream.ok || !upstream.body) {
        const errText = await upstream.text().catch(() => "");
        console.error(
            "[tts/stream] ElevenLabs error:",
            upstream.status,
            errText
        );
        return Response.json(
            { error: `ElevenLabs error: ${upstream.status}` },
            { status: upstream.status === 401 ? 500 : 502 }
        );
    }

    return new Response(upstream.body, {
        headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
        },
    });
}
