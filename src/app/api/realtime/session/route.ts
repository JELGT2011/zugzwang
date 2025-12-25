import { auth } from "@/auth";

export async function POST() {
    const session = await auth();
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
        return new Response("OPENAI_API_KEY is not configured", { status: 500 });
    }

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            session: {
                type: "realtime",
                model: "gpt-realtime",
            },
        }),
    });
    if (!response.ok) {
        const error = await response.json();
        return Response.json(error, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
}
