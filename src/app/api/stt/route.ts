export const maxDuration = 60;

const ELEVENLABS_MODEL = "scribe_v1";

export async function POST(request: Request) {
    if (!process.env.ELEVENLABS_API_KEY) {
        return Response.json(
            { error: "ELEVENLABS_API_KEY is not configured" },
            { status: 500 }
        );
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return Response.json(
            { error: "Expected multipart/form-data body" },
            { status: 400 }
        );
    }

    const audio = formData.get("audio");
    if (!audio || !(audio instanceof Blob)) {
        return Response.json(
            { error: "Missing 'audio' file in form data" },
            { status: 400 }
        );
    }

    const upstreamForm = new FormData();
    upstreamForm.append("file", audio, "recording.webm");
    upstreamForm.append("model_id", ELEVENLABS_MODEL);

    const upstream = await fetch(
        "https://api.elevenlabs.io/v1/speech-to-text",
        {
            method: "POST",
            headers: {
                "xi-api-key": process.env.ELEVENLABS_API_KEY,
            },
            body: upstreamForm,
        }
    );

    if (!upstream.ok) {
        const errText = await upstream.text().catch(() => "");
        console.error(
            "[stt] ElevenLabs error:",
            upstream.status,
            errText
        );
        return Response.json(
            { error: `ElevenLabs STT error: ${upstream.status}` },
            { status: upstream.status === 401 ? 500 : 502 }
        );
    }

    const data = (await upstream.json()) as { text?: string };
    const text = (data.text ?? "").trim();

    return Response.json({ text });
}
